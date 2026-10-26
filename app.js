const express = require('express');
const path = require('path');
const githubWebhookRoutes = require('./routes/githubWebhook.routes');
const healthRoutes = require('./routes/health.routes');
const portfolioRoutes = require('./routes/portfolio.routes');
const slackRoutes = require('./routes/slack.routes');
const slackWebhookRoutes = require('./routes/slackWebhook.routes');

const app = express();

app.use(
  '/api/webhooks/github',
  express.raw({ type: '*/*' }),
  githubWebhookRoutes,
);
app.use(
  '/api/webhooks/slack',
  express.raw({ type: '*/*' }),
  slackWebhookRoutes,
);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api', (req, res) => {
  res.send('Riklr API working...');
});

app.use('/api/health', healthRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/slack', slackRoutes);

module.exports = app;
