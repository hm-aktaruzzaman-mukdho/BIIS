const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const router = express.Router();


// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, student_id, department, year } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    if (!['student', 'provost'].includes(role)) {
      return res.status(400).json({ error: 'Role must be student or provost' });
    }

    // Check if email already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, student_id, department, year)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, email, role, student_id, department, year`,
      [name, email, password_hash, role, student_id || null, department || null, year || null]
    );

    const user = result.rows[0];

    // Set session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      student_id: user.student_id,
      department: user.department,
      year: user.year
    };

    res.status(201).json({ user: req.session.user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});