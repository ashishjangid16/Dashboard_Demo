require('dotenv').config();

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const shouldUseSsl = () => {
  if (process.env.DB_SSL === 'true' || process.env.PGSSLMODE === 'require') {
    return true;
  }

  return Boolean(connectionString && connectionString.includes('sslmode=require'));
};

const pool = new Pool({
  connectionString,
  ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
});

// Test the Neon PostgreSQL connection
const testConnection = async () => {
  if (!connectionString) {
    throw new Error('DATABASE_URL is missing. Check your .env file.');
  }

  const { rows } = await pool.query(`
    SELECT
      NOW() AS now,
      current_database() AS database,
      version() AS version
  `);

  return rows[0];
};

// Log unexpected errors from idle pooled connections
pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});

module.exports = {
  pool,
  testConnection,
};
