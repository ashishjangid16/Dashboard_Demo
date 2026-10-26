const express = require('express');
const { getSlackMessages } = require('../controllers/slack.controllers');

const router = express.Router();

router.get('/messages', getSlackMessages);

module.exports = router;
