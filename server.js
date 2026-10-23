require('dotenv').config();

const app = require('./app');
const { testConnection } = require('./db');

const port = process.env.PORT || 3000;

app.listen(port, async () => {
  console.log(`Server running at http://localhost:${port}/`);

  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL is not set. Add it to .env to connect PostgreSQL.');
    return;
  }

  try {
    await testConnection();
    console.log('PostgreSQL connected successfully.');
  } catch (error) {
    console.error('PostgreSQL connection failed:', error.message);
  }
});
