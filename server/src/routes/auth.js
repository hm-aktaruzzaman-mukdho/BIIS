const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');

const router = express.Router();


// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, student_id, department, year, hall_id } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    if (!['student', 'provost'].includes(role)) {
      return res.status(400).json({ error: 'Role must be student or provost' });
    }

     // Students must select a hall
    if (role === 'student' && !hall_id) {
      return res.status(400).json({ error: 'Students must select a hall' });
    }

    // Check if email already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
       `INSERT INTO users (name, email, password_hash, role, student_id, department, year, hall_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email, role, student_id, department, year, hall_id`,
      [name, email, password_hash, role, student_id || null, department || null, year || null, role === 'student' ? hall_id : null]
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
      year: user.year,
      hall_id: user.hall_id
    };

    res.status(201).json({ user: req.session.user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT id, name, email, password_hash, role, student_id, department, year, hall_id FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Set session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      student_id: user.student_id,
      department: user.department,
      year: user.year,
      hall_id: user.hall_id
    };

    res.json({ user: req.session.user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: req.session.user });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

module.exports = router;