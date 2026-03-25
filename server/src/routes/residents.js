const express = require('express');
const pool = require('../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/residents — provost views all current residents
router.get('/', requireRole('provost'), async (req, res) => {
  try {
    const user = req.session.user;

    // Get provost's hall
    const hallResult = await pool.query('SELECT id, name FROM halls WHERE provost_id = $1', [user.id]);
    if (hallResult.rows.length === 0) {
      return res.json({ residents: [], hall: null });
    }

    const hallIds = hallResult.rows.map(h => h.id);

    const result = await pool.query(
      `SELECT 
        res.id,
        u.name AS student_name,
        u.email AS student_email,
        u.student_id AS student_roll,
        u.department,
        u.year,
        r.room_number,
        r.floor,
        s.seat_number,
        h.name AS hall_name,
        res.dining_days,
        res.absence_count,
        res.assigned_at
       FROM residents res
       JOIN users u ON res.student_id = u.id
       JOIN seats s ON res.seat_id = s.id
       JOIN rooms r ON s.room_id = r.id
       JOIN halls h ON res.hall_id = h.id
       WHERE res.hall_id = ANY($1)
       ORDER BY r.floor, r.room_number, s.seat_number`,
      [hallIds]
    );

    res.json({ 
      residents: result.rows,
      halls: hallResult.rows
    });
  } catch (err) {
    console.error('Residents error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/residents/:id — update resident info (dining days, absence)
router.patch('/:id', requireRole('provost'), async (req, res) => {
  try {
    const { id } = req.params;
    const { dining_days, absence_count } = req.body;

    const updates = [];
    const params = [];

    if (dining_days !== undefined) {
      params.push(dining_days);
      updates.push(`dining_days = $${params.length}`);
    }
    if (absence_count !== undefined) {
      params.push(absence_count);
      updates.push(`absence_count = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE residents SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resident not found' });
    }

    res.json({ resident: result.rows[0] });
  } catch (err) {
    console.error('Update resident error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
