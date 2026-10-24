require('dotenv').config();

const app = require('./app');
const { testConnection } = require('./db');

const port = process.env.PORT || 3000;

const server = app.listen(port, async () => {
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

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the other server or change PORT in .env.`);
    process.exit(1);
  }

  console.error('Server failed to start:', error.message);
  process.exit(1);
});
