require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { saveSlackMessage } = require('../models/slack.model');
const { pool } = require('../db');

const MOCK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID || 'C_MOCK_TRACKER';
const MOCK_TEXT_FILE = path.join(__dirname, '..', 'scripts', 'mock-slack-message.txt');
const nowSeconds = Math.floor(Date.now() / 1000);

const readMockMessages = () => {
  if (!fs.existsSync(MOCK_TEXT_FILE)) {
    return [];
  }

  const text = fs.readFileSync(MOCK_TEXT_FILE, 'utf8').trim();

  if (!text) {
    return [];
  }

  return [
    {
      user: 'U_MOCK_USER',
      text,
      offsetSeconds: 60 * 20,
    },
  ];
};

const seedMockSlackMessages = async () => {
  const mockMessages = readMockMessages();
  let count = 0;

  if (mockMessages.length === 0) {
    throw new Error('Add plain mock Slack text in ' + MOCK_TEXT_FILE);
  }

  for (const [index, message] of mockMessages.entries()) {
    const ts = String(nowSeconds - message.offsetSeconds) + '.' + String(index + 1).padStart(6, '0');
    const clientMsgId = 'mock-' + ts;

    await saveSlackMessage({
      message: {
        channel: MOCK_CHANNEL_ID,
        user: message.user,
        text: message.text,
        ts,
        event_ts: ts,
        client_msg_id: clientMsgId,
      },
      body: {
        event_id: 'mock-slack-' + ts,
        event_time: Math.floor(Number.parseFloat(ts)),
        event: {
          type: 'message',
          channel: MOCK_CHANNEL_ID,
          user: message.user,
          text: message.text,
          ts,
          event_ts: ts,
          client_msg_id: clientMsgId,
        },
      },
    });

    count += 1;
  }

  return { count };
};

module.exports = {
  MOCK_TEXT_FILE,
  readMockMessages,
  seedMockSlackMessages,
};
