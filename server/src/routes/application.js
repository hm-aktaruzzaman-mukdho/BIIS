const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { analyzeApplication } = require('../services/ai');

const router = express.Router();

module.exports = router;
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, images, and Word documents are allowed'));
    }
  }
});

router.post('/', requireAuth, upload.single('document'), async (req, res) => {
  try {
    if (req.session.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can submit applications' });
    }

    const { hall_id, preferred_room_id, reason } = req.body;

    if (!hall_id || !reason) {
      return res.status(400).json({ error: 'Hall and reason are required' });
    }

    const residentCheck = await pool.query(
      'SELECT id FROM residents WHERE student_id = $1',
      [req.session.user.id]
    );
    if (residentCheck.rows.length > 0) {
      return res.status(409).json({ error: 'You are already a hall resident. You cannot apply for a new seat.' });
    }

    const pendingCheck = await pool.query(
      `SELECT id FROM applications WHERE student_id = $1 AND status = 'pending'`,
      [req.session.user.id]
    );
    if (pendingCheck.rows.length > 0) {
      return res.status(409).json({ error: 'You already have a pending application' });
    }

    const awaitingPayment = await pool.query(
      `SELECT id FROM applications WHERE student_id = $1 AND status = 'approved' AND payment_status = 'pending'`,
      [req.session.user.id]
    );
    if (awaitingPayment.rows.length > 0) {
      return res.status(409).json({ error: 'You have an approved application awaiting payment. Please complete payment first.' });
    }

    const document_url = req.file ? `/uploads/${req.file.filename}` : null;

    const studentData = {
      student_name: req.session.user.name,
      department: req.session.user.department,
      year: req.session.user.year,
      reason,
      document_url
    };

    const aiResult = await analyzeApplication(studentData);
    const { summary, recommendation, score, factors } = aiResult;

    const result = await pool.query(
      `INSERT INTO applications (student_id, hall_id, preferred_room_id, reason, document_url, ai_summary, ai_recommendation, ai_score, ai_reasons)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.session.user.id, hall_id, preferred_room_id || null, reason, document_url, summary, recommendation, score || null, JSON.stringify(factors || [])]
    );

    res.status(201).json({ application: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;

    if (user.role === 'student') {
      const result = await pool.query(
        `SELECT a.*, h.name AS hall_name, r.room_number, r.floor
         FROM applications a
         JOIN halls h ON a.hall_id = h.id
         LEFT JOIN rooms r ON a.preferred_room_id = r.id
         WHERE a.student_id = $1
         ORDER BY a.created_at DESC`,
        [user.id]
      );
      return res.json({ applications: result.rows });
    }

    if (user.role === 'provost') {
      const hallResult = await pool.query('SELECT id FROM halls WHERE provost_id = $1', [user.id]);
      if (hallResult.rows.length === 0) {
        return res.json({ applications: [] });
      }

      const hallIds = hallResult.rows.map(h => h.id);
      const { status } = req.query;

      let query = `
        SELECT a.*, 
               u.name AS student_name, u.email AS student_email, 
               u.student_id AS student_roll, u.department, u.year,
               h.name AS hall_name, r.room_number, r.floor
        FROM applications a
        JOIN users u ON a.student_id = u.id
        JOIN halls h ON a.hall_id = h.id
        LEFT JOIN rooms r ON a.preferred_room_id = r.id
        WHERE a.hall_id = ANY($1)
      `;
      const params = [hallIds];

      if (status) {
        params.push(status);
        query += ` AND a.status = $${params.length}`;
      }

      query += ' ORDER BY a.created_at DESC';

      const result = await pool.query(query, params);
      return res.json({ applications: result.rows });
    }

    res.status(403).json({ error: 'Access denied' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', requireRole('provost'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;

    if (!['approved', 'denied'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or denied' });
    }

    const hallResult = await pool.query('SELECT id FROM halls WHERE provost_id = $1', [req.session.user.id]);
    const hallIds = hallResult.rows.map(h => h.id);

    const app = await pool.query(
      'SELECT * FROM applications WHERE id = $1 AND hall_id = ANY($2)',
      [id, hallIds]
    );

    if (app.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (app.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Application has already been processed' });
    }

    if (status === 'approved') {
      const application = app.rows[0];

      let seatQuery;
      if (application.preferred_room_id) {
        seatQuery = await pool.query(
          `SELECT s.id FROM seats s WHERE s.room_id = $1 AND s.status = 'available' LIMIT 1`,
          [application.preferred_room_id]
        );
      }

      if (!seatQuery || seatQuery.rows.length === 0) {
        seatQuery = await pool.query(
          `SELECT s.id FROM seats s 
           JOIN rooms r ON s.room_id = r.id 
           WHERE r.hall_id = $1 AND s.status = 'available' 
           LIMIT 1`,
          [application.hall_id]
        );
      }

      if (seatQuery.rows.length === 0) {
        return res.status(400).json({ error: 'No available seats in this hall. Cannot approve.' });
      }

      const seatId = seatQuery.rows[0].id;

      await pool.query(`UPDATE seats SET status = 'reserved' WHERE id = $1`, [seatId]);

      const result = await pool.query(
        `UPDATE applications 
         SET status = 'approved', feedback = $1, payment_status = 'pending',
             payment_deadline = NOW() + INTERVAL '24 hours', reserved_seat_id = $2,
             updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [feedback || null, seatId, id]
      );

      return res.json({ application: result.rows[0] });
    }

    const result = await pool.query(
      `UPDATE applications SET status = 'denied', feedback = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [feedback || null, id]
    );

    res.json({ application: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});