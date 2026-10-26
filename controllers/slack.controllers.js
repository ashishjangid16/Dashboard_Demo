const { listSlackMessages } = require('../models/slack.model');

const getSlackMessages = async (req, res) => {
  try {
    const messages = await listSlackMessages({ limit: req.query.limit });

    res.status(200).json({
      success: true,
      status: 'ok',
      data: messages,
    });
  } catch (error) {
    console.error('Failed to load Slack messages:', error.message);

    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Unable to load Slack messages.',
    });
  }
};

module.exports = {
  getSlackMessages,
};
