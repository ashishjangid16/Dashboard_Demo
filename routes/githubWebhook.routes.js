const express = require('express');
const {
  handleGitHubWebhook,
} = require('../controllers/githubWebhook.controllers');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'GitHub webhook endpoint is reachable. Use POST for webhook deliveries.',
  });
});

router.post('/', handleGitHubWebhook);

module.exports = router;
