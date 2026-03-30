const express = require('express');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/seats — list rooms with seat availability
// Query params: hall_id, floor, room_number
router.get('/', requireAuth, async (req, res) => {
  try {
    const { hall_id, floor, room_number } = req.query;

    let query = `
      SELECT 
        r.id AS room_id,
        r.room_number,
        r.floor,
        r.capacity,
        h.id AS hall_id,
        h.name AS hall_name,
        COUNT(s.id) AS total_seats,
        COUNT(CASE WHEN s.status = 'available' THEN 1 END) AS available_seats,
        COUNT(CASE WHEN s.status = 'occupied' THEN 1 END) AS occupied_seats,
        COUNT(CASE WHEN s.status = 'reserved' THEN 1 END) AS reserved_seats
      FROM rooms r
      JOIN halls h ON r.hall_id = h.id
      LEFT JOIN seats s ON s.room_id = r.id
    `;

    const conditions = [];
    const params = [];

    if (hall_id) {
      params.push(hall_id);
      conditions.push(`r.hall_id = $${params.length}`);
    }
    if (floor) {
      params.push(floor);
      conditions.push(`r.floor = $${params.length}`);
    }
    if (room_number) {
      params.push(`%${room_number}%`);
      conditions.push(`r.room_number ILIKE $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY r.id, r.room_number, r.floor, r.capacity, h.id, h.name ORDER BY h.name, r.floor, r.room_number';

    const result = await pool.query(query, params);
    res.json({ rooms: result.rows });
  } catch (err) {
    console.error('Seats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/seats/stats — availability summary
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        h.id AS hall_id,
        h.name AS hall_name,
        COUNT(s.id) AS total_seats,
        COUNT(CASE WHEN s.status = 'available' THEN 1 END) AS available,
        COUNT(CASE WHEN s.status = 'occupied' THEN 1 END) AS occupied,
        COUNT(CASE WHEN s.status = 'reserved' THEN 1 END) AS reserved
      FROM halls h
      JOIN rooms r ON r.hall_id = h.id
      JOIN seats s ON s.room_id = r.id
      GROUP BY h.id, h.name
      ORDER BY h.name
    `);
    res.json({ stats: result.rows });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/seats/halls — list all halls
router.get('/halls', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT h.id, h.name, u.name AS provost_name
      FROM halls h
      LEFT JOIN users u ON h.provost_id = u.id
      ORDER BY h.name
    `);
    res.json({ halls: result.rows });
  } catch (err) {
    console.error('Halls error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
