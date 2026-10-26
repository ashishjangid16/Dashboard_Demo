require('dotenv').config();

const { pool } = require('../db');
const { seedMockSlackMessages } = require('../services/mockSlackSeeder');

seedMockSlackMessages()
  .then(({ count }) => {
    console.log('Seeded ' + count + ' mock Slack messages.');
  })
  .catch((error) => {
    console.error('Failed to seed mock Slack messages.');
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
