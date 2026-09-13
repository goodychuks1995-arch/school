const { Pool } = require('pg');
require('dotenv').config();

// Single shared connection pool for the whole app
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Uncomment below if your Postgres host requires SSL (e.g. most managed DBs in production)
  // ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
