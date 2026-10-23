const { testConnection } = require('../db');

const getHealth = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Riklr API working...',
  });
};

const getDatabaseHealth = async (req, res) => {
  try {
    const result = await testConnection();

    res.status(200).json({
      status: 'ok',
      message: 'PostgreSQL connected successfully.',
      databaseTime: result.now,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'PostgreSQL connection failed.',
      error: error.message,
    });
  }
};

module.exports = {
  getHealth,
  getDatabaseHealth,
};
