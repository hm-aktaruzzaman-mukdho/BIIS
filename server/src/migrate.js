require('dotenv').config();
const pool = require('./db');
const bcrypt = require('bcryptjs');

const schema = `
  CREATE TABLE IF NOT EXISTS "session" (
    "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL,
    PRIMARY KEY ("sid")
  );
  CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'provost')),
    student_id VARCHAR(50),
    department VARCHAR(100),
    year INT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS halls (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provost_id INT REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    hall_id INT REFERENCES halls(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    floor INT NOT NULL,
    capacity INT NOT NULL DEFAULT 4
  );

  CREATE TABLE IF NOT EXISTS seats (
    id SERIAL PRIMARY KEY,
    room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
    seat_number INT NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved'))
  );

  CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES users(id) ON DELETE CASCADE,
    hall_id INT REFERENCES halls(id) ON DELETE CASCADE,
    preferred_room_id INT REFERENCES rooms(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    document_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled', 'expired')),
    ai_summary TEXT,
    ai_recommendation VARCHAR(20) CHECK (ai_recommendation IN ('strong', 'moderate', 'weak')),
    ai_score INT CHECK (ai_score >= 1 AND ai_score <= 10),
    ai_reasons JSONB DEFAULT '[]',
    feedback TEXT,
    payment_status VARCHAR(20) DEFAULT 'not_required' CHECK (payment_status IN ('not_required', 'pending', 'paid', 'expired')),
    payment_deadline TIMESTAMP,
    paid_at TIMESTAMP,
    reserved_seat_id INT REFERENCES seats(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS seat_changes (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES users(id) ON DELETE CASCADE,
    current_seat_id INT REFERENCES seats(id) ON DELETE SET NULL,
    preferred_room_id INT REFERENCES rooms(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS residents (
    id SERIAL PRIMARY KEY,
    student_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    seat_id INT REFERENCES seats(id) ON DELETE SET NULL,
    hall_id INT REFERENCES halls(id) ON DELETE CASCADE,
    dining_days TEXT[] DEFAULT '{}',
    absence_count INT DEFAULT 0,
    assigned_at TIMESTAMP DEFAULT NOW()
  );
`;


async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Running migrations...');
    await client.query(schema);
    console.log('✅ Schema created successfully');

    // Check if seed data already exists
    const { rows } = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count) > 0) {
      console.log('ℹ️  Seed data already exists, skipping...');
      return;
    }

    console.log('🌱 Seeding data...');

    // Create provost users
    const provostPass = await bcrypt.hash('provost123', 10);
    const p1 = await client.query(
      `INSERT INTO users (name, email, password_hash, role, department) 
       VALUES ($1, $2, $3, 'provost', $4) RETURNING id`,
      ['Dr. Kamal Hossain', 'provost1@biis.edu', provostPass, 'Computer Science']
    );
    const p2 = await client.query(
      `INSERT INTO users (name, email, password_hash, role, department) 
       VALUES ($1, $2, $3, 'provost', $4) RETURNING id`,
      ['Dr. Nasreen Akter', 'provost2@biis.edu', provostPass, 'Electrical Engineering']
    );

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
