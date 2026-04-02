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
    hall_id INT,
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

    // Create halls
    const h1 = await client.query(
      `INSERT INTO halls (name, provost_id) VALUES ($1, $2) RETURNING id`,
      ['Shahid Salimullah Muslim Hall', p1.rows[0].id]
    );
    const h2 = await client.query(
      `INSERT INTO halls (name, provost_id) VALUES ($1, $2) RETURNING id`,
      ['Fazlul Huq Muslim Hall', p2.rows[0].id]
    );

    // Create rooms and seats for Hall 1 (3 floors, 5 rooms/floor)
    for (let floor = 1; floor <= 3; floor++) {
      for (let room = 1; room <= 5; room++) {
        const roomNum = `${floor}${String(room).padStart(2, '0')}`;
        const r = await client.query(
          `INSERT INTO rooms (hall_id, room_number, floor, capacity) VALUES ($1, $2, $3, 4) RETURNING id`,
          [h1.rows[0].id, roomNum, floor]
        );
        for (let seat = 1; seat <= 4; seat++) {
          const status = (floor === 1 && room <= 3 && seat <= 2) ? 'occupied' : 'available';
          await client.query(
            `INSERT INTO seats (room_id, seat_number, status) VALUES ($1, $2, $3)`,
            [r.rows[0].id, seat, status]
          );
        }
      }
    }

    // Create rooms and seats for Hall 2 (2 floors, 4 rooms/floor)
    for (let floor = 1; floor <= 2; floor++) {
      for (let room = 1; room <= 4; room++) {
        const roomNum = `${floor}${String(room).padStart(2, '0')}`;
        const r = await client.query(
          `INSERT INTO rooms (hall_id, room_number, floor, capacity) VALUES ($1, $2, $3, 4) RETURNING id`,
          [h2.rows[0].id, roomNum, floor]
        );
        for (let seat = 1; seat <= 4; seat++) {
          const status = (floor === 1 && room <= 2 && seat <= 3) ? 'occupied' : 'available';
          await client.query(
            `INSERT INTO seats (room_id, seat_number, status) VALUES ($1, $2, $3)`,
            [r.rows[0].id, seat, status]
          );
        }
      }
    }

    // Create sample students (with hall assignment)
    const studentPass = await bcrypt.hash('student123', 10);
    const hall1Id = h1.rows[0].id;
    const hall2Id = h2.rows[0].id;
    const students = [
      ['Rahim Uddin', 'rahim@student.edu', '2021001', 'Computer Science', 3, hall1Id],
      ['Fatima Begum', 'fatima@student.edu', '2021002', 'Electrical Engineering', 3, hall1Id],
      ['Arif Hasan', 'arif@student.edu', '2022001', 'Physics', 2, hall1Id],
      ['Nusrat Jahan', 'nusrat@student.edu', '2022002', 'Mathematics', 2, hall2Id],
      ['Tanvir Ahmed', 'tanvir@student.edu', '2023001', 'Chemistry', 1, hall2Id],
    ];

    const studentIds = [];
    for (const [name, email, sid, dept, year, hallId] of students) {
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role, student_id, department, year, hall_id)
         VALUES ($1, $2, $3, 'student', $4, $5, $6, $7) RETURNING id`,
        [name, email, studentPass, sid, dept, year, hallId]
      );
      studentIds.push(res.rows[0].id);
    }

    // Assign some residents (first 3 students in Hall 1)
    const occupiedSeats = await client.query(
      `SELECT s.id FROM seats s JOIN rooms r ON s.room_id = r.id WHERE r.hall_id = $1 AND s.status = 'occupied' LIMIT 3`,
      [h1.rows[0].id]
    );
    const diningOptions = [
      ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'],
      ['Saturday', 'Monday', 'Wednesday', 'Thursday'],
      ['Sunday', 'Tuesday', 'Thursday'],
    ];

    for (let i = 0; i < Math.min(3, occupiedSeats.rows.length); i++) {
      await client.query(
        `INSERT INTO residents (student_id, seat_id, hall_id, dining_days, absence_count)
         VALUES ($1, $2, $3, $4, $5)`,
        [studentIds[i], occupiedSeats.rows[i].id, h1.rows[0].id, diningOptions[i], Math.floor(Math.random() * 5)]
      );
    }

    // Create sample applications
    await client.query(
      `INSERT INTO applications (student_id, hall_id, preferred_room_id, reason, status, ai_summary, ai_recommendation)
       VALUES ($1, $2, (SELECT id FROM rooms WHERE hall_id = $2 LIMIT 1), $3, 'pending', $4, 'strong')`,
      [studentIds[3], h1.rows[0].id,
       'I am from a remote district and my family cannot afford private housing near the university. I need hall accommodation to continue my studies. I have attached my financial documents.',
       'Student from a remote area with financial constraints. Has provided supporting documents. Strong case for accommodation.']
    );

    await client.query(
      `INSERT INTO applications (student_id, hall_id, preferred_room_id, reason, status, ai_summary, ai_recommendation)
       VALUES ($1, $2, (SELECT id FROM rooms WHERE hall_id = $2 LIMIT 1), $3, 'pending', $4, 'moderate')`,
      [studentIds[4], h1.rows[0].id,
       'I would like to stay in the hall for convenience as my classes start early in the morning.',
       'Student requesting accommodation for convenience. No financial or medical urgency documented. Moderate recommendation.']
    );

    console.log('✅ Seed data created successfully');
    console.log('');
    console.log('📋 Test accounts:');
    console.log('   Provost: provost1@biis.edu / provost123');
    console.log('   Provost: provost2@biis.edu / provost123');
    console.log('   Student: rahim@student.edu / student123');
    console.log('   Student: fatima@student.edu / student123');
    console.log('   Student: arif@student.edu / student123');
    console.log('   Student: nusrat@student.edu / student123');
    console.log('   Student: tanvir@student.edu / student123');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
