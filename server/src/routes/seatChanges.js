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

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = req.session.user;

    if (user.role === 'student') {
      const result = await pool.query(
        `SELECT sc.*, 
                r_curr.room_number AS current_room, r_curr.floor AS current_floor,
                r_pref.room_number AS preferred_room, r_pref.floor AS preferred_floor
         FROM seat_changes sc
         LEFT JOIN seats s ON sc.current_seat_id = s.id
         LEFT JOIN rooms r_curr ON s.room_id = r_curr.id
         LEFT JOIN rooms r_pref ON sc.preferred_room_id = r_pref.id
         WHERE sc.student_id = $1
         ORDER BY sc.created_at DESC`,
        [user.id]
      );
      return res.json({ seatChanges: result.rows });
    }

    if (user.role === 'provost') {
      const hallResult = await pool.query('SELECT id FROM halls WHERE provost_id = $1', [user.id]);
      if (hallResult.rows.length === 0) {
        return res.json({ seatChanges: [] });
      }
      const hallIds = hallResult.rows.map(h => h.id);

      const result = await pool.query(
        `SELECT sc.*,
                u.name AS student_name, u.email AS student_email, u.student_id AS student_roll,
                r_curr.room_number AS current_room, r_curr.floor AS current_floor,
                s.seat_number AS current_seat_number,
                r_pref.room_number AS preferred_room, r_pref.floor AS preferred_floor
         FROM seat_changes sc
         JOIN users u ON sc.student_id = u.id
         JOIN residents res ON sc.student_id = res.student_id
         LEFT JOIN seats s ON sc.current_seat_id = s.id
         LEFT JOIN rooms r_curr ON s.room_id = r_curr.id
         LEFT JOIN rooms r_pref ON sc.preferred_room_id = r_pref.id
         WHERE res.hall_id = ANY($1)
         ORDER BY sc.created_at DESC`,
        [hallIds]
      );
      return res.json({ seatChanges: result.rows });
    }

    res.status(403).json({ error: 'Access denied' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});