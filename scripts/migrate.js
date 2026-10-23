require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

const migrationsDir = path.join(__dirname, '..', 'migrations');

const runMigrations = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Check your .env file.');
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migrations found.');
    return;
  }

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    console.log(`Applied migration: ${file}`);
  }
};

runMigrations()
  .then(() => {
    console.log('Database migrations completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database migration failed.');
    console.error(error.message);
    process.exit(1);
  });
