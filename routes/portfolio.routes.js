const express = require('express');
const { getPortfolio } = require('../controllers/portfolio.controllers');

const router = express.Router();

router.get('/', getPortfolio);

module.exports = router;
