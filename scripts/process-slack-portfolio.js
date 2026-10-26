require('dotenv').config();

const { pool } = require('../db');
const { runPortfolioProcessing } = require('../services/portfolioProcessor');

runPortfolioProcessing()
  .catch((error) => {
    console.error('Portfolio processing failed.');
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
