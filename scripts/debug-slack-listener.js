require('dotenv').config();

const { App, LogLevel } = require('@slack/bolt');
const { saveSlackMessage } = require('../models/slack.model');
const { pool } = require('../db');

const appToken = process.env.SLACK_APP_TOKEN || process.env.APP_LEVEL_TOKEN;

const run = async () => {
  if (!process.env.SLACK_BOT_TOKEN) {
    throw new Error('SLACK_BOT_TOKEN is missing from .env');
  }

  if (!appToken) {
    throw new Error('SLACK_APP_TOKEN or APP_LEVEL_TOKEN is missing from .env');
  }

  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken,
    socketMode: true,
    logLevel: LogLevel.DEBUG,
  });

  app.event('message', async ({ event, body }) => {
    console.log(
      'Slack message event received:',
      JSON.stringify(
        {
          channel: event.channel,
          user: event.user,
          subtype: event.subtype,
          botId: event.bot_id,
          text: event.text,
          ts: event.ts,
        },
        null,
        2,
      ),
    );

    if (event.subtype || event.bot_id) {
      console.log('Skipped message because it is a subtype/bot message.');
      return;
    }

    const savedMessage = await saveSlackMessage({ message: event, body });
    console.log(`Saved Slack message row ${savedMessage.id}.`);
  });

  await app.start();
  console.log('Slack debug listener connected for 120 seconds.');
  console.log('Post a NEW message in the channel now.');

  setTimeout(async () => {
    await app.stop();
    await pool.end();
    console.log('Slack debug listener stopped.');
    process.exit(0);
  }, 120_000);
};

run().catch(async (error) => {
  console.error('Slack debug listener failed.');
  console.error(error.message);
  await pool.end();
  process.exit(1);
});
