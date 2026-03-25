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