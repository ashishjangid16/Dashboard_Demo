require('dotenv').config();

const { WebClient } = require('@slack/web-api');
const { saveSlackMessage } = require('../models/slack.model');
const { pool } = require('../db');

const importSlackHistory = async () => {
  const channelId = process.env.SLACK_CHANNEL_ID;

  if (!process.env.SLACK_BOT_TOKEN) {
    throw new Error('SLACK_BOT_TOKEN is missing from .env');
  }

  if (!channelId) {
    throw new Error('SLACK_CHANNEL_ID is missing from .env');
  }

  const client = new WebClient(process.env.SLACK_BOT_TOKEN);
  const result = await client.conversations.history({
    channel: channelId,
    limit: 20,
  });

  let savedCount = 0;

  for (const message of result.messages || []) {
    if (!message.text || message.subtype || message.bot_id) {
      continue;
    }

    await saveSlackMessage({
      message: {
        ...message,
        channel: channelId,
        event_ts: message.ts,
      },
      body: {
        event_id: `history-${channelId}-${message.ts}`,
        event_time: Math.floor(Number.parseFloat(message.ts)),
        event: {
          ...message,
          channel: channelId,
          event_ts: message.ts,
          type: 'message',
        },
      },
    });

    savedCount += 1;
  }

  console.log(`Imported ${savedCount} Slack messages from ${channelId}.`);
};

importSlackHistory()
  .catch((error) => {
    console.error('Slack history import failed.');
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
