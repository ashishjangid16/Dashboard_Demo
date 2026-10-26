require('dotenv').config();

const { WebClient } = require('@slack/web-api');

const testSlackAuth = async () => {
  if (!process.env.SLACK_BOT_TOKEN) {
    throw new Error('SLACK_BOT_TOKEN is missing from .env');
  }

  const client = new WebClient(process.env.SLACK_BOT_TOKEN);
  const auth = await client.auth.test();

  console.log({
    ok: auth.ok,
    team: auth.team,
    user: auth.user,
    botId: auth.bot_id,
    url: auth.url,
  });
};

testSlackAuth()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Slack auth test failed.');
    console.error(error.message);
    process.exit(1);
  });
