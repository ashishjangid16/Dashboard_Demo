const { App, LogLevel } = require('@slack/bolt');
const { saveSlackMessage } = require('../models/slack.model');

const getSlackAppToken = () =>
  process.env.SLACK_APP_TOKEN || process.env.APP_LEVEL_TOKEN;

const hasSlackConfig = () =>
  Boolean(process.env.SLACK_BOT_TOKEN && getSlackAppToken());

const validateSlackConfig = () => {
  const missingKeys = [];

  if (!process.env.SLACK_BOT_TOKEN) {
    missingKeys.push('SLACK_BOT_TOKEN');
  }

  const appToken = getSlackAppToken();

  if (!appToken) {
    missingKeys.push('SLACK_APP_TOKEN or APP_LEVEL_TOKEN');
  }

  if (missingKeys.length > 0) {
    throw new Error(`Missing Slack environment keys: ${missingKeys.join(', ')}`);
  }

  if (!process.env.SLACK_BOT_TOKEN.startsWith('xoxb-')) {
    throw new Error('SLACK_BOT_TOKEN should start with xoxb-.');
  }

  if (
    !appToken.startsWith('xapp-') &&
    !appToken.startsWith('xoxe.xapp-')
  ) {
    throw new Error('SLACK_APP_TOKEN should start with xapp- or xoxe.xapp-.');
  }
};

const createSlackApp = () => {
  validateSlackConfig();

  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: getSlackAppToken(),
    socketMode: true,
    logLevel: LogLevel.INFO,
  });

  app.event('message', async ({ event, body }) => {
    if (event.subtype || event.bot_id) {
      return;
    }

    try {
      const savedMessage = await saveSlackMessage({ message: event, body });
      console.log(
        `Slack message saved: ${event.channel} ${event.ts} (${savedMessage.id})`,
      );
    } catch (error) {
      console.error('Failed to save Slack message:', error.message);
    }
  });

  app.event('app_mention', async ({ event, say }) => {
    await say(
      `Hi <@${event.user}>. Riklr Slack integration is online and listening.`,
    );
  });

  app.message(/^status$/i, async ({ message, say }) => {
    if (message.subtype) {
      return;
    }

    await say('Riklr Slack integration is online.');
  });

  return app;
};

let slackApp;

const startSlackApp = async () => {
  if (!hasSlackConfig()) {
    console.log(
      'Slack app not started. Add SLACK_BOT_TOKEN and SLACK_APP_TOKEN to .env.',
    );
    return null;
  }

  slackApp = createSlackApp();
  await slackApp.start();
  console.log('Slack Socket Mode app connected.');

  return slackApp;
};

const stopSlackApp = async () => {
  if (!slackApp) {
    return;
  }

  await slackApp.stop();
  slackApp = null;
};

module.exports = {
  hasSlackConfig,
  startSlackApp,
  stopSlackApp,
};
