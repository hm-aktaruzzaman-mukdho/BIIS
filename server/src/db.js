const { Pool } = require('pg');

const isLocal = process.env.DATABASE_URL?.includes('localhost') || process.env.DB_SSL === 'false';
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: {
//     rejectUnauthorized: false
//   }
// });

//need to conditionally set ssl for local development vs production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } })
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;


