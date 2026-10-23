const express = require('express');
const {
  handleGitHubWebhook,
} = require('../controllers/githubWebhook.controllers');

const router = express.Router();

router.post('/', handleGitHubWebhook);

module.exports = router;
