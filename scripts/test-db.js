require('dotenv').config();

const { testConnection } = require('../db');

testConnection()
  .then((result) => {
    console.log('PostgreSQL connected successfully.');
    console.log(`Database time: ${result.now}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('PostgreSQL connection failed.');
    console.error(error.message);
    process.exit(1);
  });
