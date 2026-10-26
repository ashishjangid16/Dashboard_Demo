require('dotenv').config();

const { WebClient } = require('@slack/web-api');
const { saveSlackMessage } = require('../models/slack.model');
const { pool } = require('../db');

const channelId = process.env.SLACK_CHANNEL_ID;
const intervalMs = Number(process.env.SLACK_POLL_INTERVAL_MS || 15000);

let latestTimestamp = '0';

const requireConfig = () => {
  if (!process.env.SLACK_BOT_TOKEN) {
    throw new Error('SLACK_BOT_TOKEN is missing from .env');
  }

  if (!channelId) {
    throw new Error('SLACK_CHANNEL_ID is missing from .env');
  }
};

const saveHistoryMessage = async (message) => {
  await saveSlackMessage({
    message: {
      ...message,
      channel: channelId,
      event_ts: message.ts,
    },
    body: {
      event_id: `poll-${channelId}-${message.ts}`,
      event_time: Math.floor(Number.parseFloat(message.ts)),
      event: {
        ...message,
        channel: channelId,
        event_ts: message.ts,
        type: 'message',
      },
    },
  });
};

const poll = async (client) => {
  const result = await client.conversations.history({
    channel: channelId,
    oldest: latestTimestamp,
    inclusive: false,
    limit: 20,
  });

  const messages = (result.messages || [])
    .filter((message) => message.text && !message.subtype && !message.bot_id)
    .sort((a, b) => Number.parseFloat(a.ts) - Number.parseFloat(b.ts));

  for (const message of messages) {
    await saveHistoryMessage(message);
    latestTimestamp = message.ts;
    console.log(`Saved Slack message from history: ${message.ts}`);
  }

  if (messages.length === 0) {
    console.log('No new Slack messages found.');
  }
};

const run = async () => {
  requireConfig();

  const client = new WebClient(process.env.SLACK_BOT_TOKEN);
  await poll(client);

  const timer = setInterval(() => {
    poll(client).catch((error) => {
      console.error('Slack polling failed:', error.message);
    });
  }, intervalMs);

  const shutdown = async () => {
    clearInterval(timer);
    await pool.end();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

run().catch(async (error) => {
  console.error('Slack polling failed.');
  console.error(error.message);
  await pool.end();
  process.exit(1);
});
