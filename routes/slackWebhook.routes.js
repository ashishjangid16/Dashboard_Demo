const express = require('express');
const {
  checkSlackWebhook,
  handleSlackEvents,
} = require('../controllers/slackWebhook.controllers');

const router = express.Router();

router.get('/', checkSlackWebhook);
router.post('/events', handleSlackEvents);

module.exports = router;
