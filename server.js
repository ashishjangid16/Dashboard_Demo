require('dotenv').config();

const app = require('./app');
const { testConnection } = require('./db');
const { startSlackApp, stopSlackApp } = require('./services/slackApp');
const { startPortfolioAutomation, stopPortfolioAutomation } = require('./services/portfolioAutomation');

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

  if (process.env.SLACK_SOCKET_MODE === 'true') {
    try {
      await startSlackApp();
    } catch (error) {
      console.error('Slack app failed to start:', error.message);
    }
  } else {
    console.log('Slack Socket Mode disabled. Set SLACK_SOCKET_MODE=true to enable it.');
  }

  startPortfolioAutomation();
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the other server or change PORT in .env.`);
    process.exit(1);
  }

  console.error('Server failed to start:', error.message);
  process.exit(1);
});

const shutdown = async () => {
  try {
    await stopSlackApp();
  } catch (error) {
    console.error('Slack app failed to stop:', error.message);
  }

  stopPortfolioAutomation();

  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
