const portfolioData = require('../data/portfolio.data');

const getPortfolio = (req, res) => {
  res.status(200).json({
    status: 'ok',
    data: portfolioData,
  });
};

module.exports = {
  getPortfolio,
};
