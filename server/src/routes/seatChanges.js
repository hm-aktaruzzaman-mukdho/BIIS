const express = require('express');
const pool = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

module.exports = router;

router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== 'student') {
      return res.status(403).json({ error: 'Only students can request seat changes' });
    }

    const { preferred_room_id, reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const resident = await pool.query(
      'SELECT * FROM residents WHERE student_id = $1',
      [req.session.user.id]
    );

    if (resident.rows.length === 0) {
      return res.status(400).json({ error: 'You must be a current resident to request a seat change' });
    }

    const existing = await pool.query(
      `SELECT id FROM seat_changes WHERE student_id = $1 AND status = 'pending'`,
      [req.session.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'You already have a pending seat change request' });
    }

    const result = await pool.query(
      `INSERT INTO seat_changes (student_id, current_seat_id, preferred_room_id, reason)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.session.user.id, resident.rows[0].seat_id, preferred_room_id || null, reason]
    );

    res.status(201).json({ seatChange: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});