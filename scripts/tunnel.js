require('dotenv').config();

const ngrok = require('@ngrok/ngrok');

const port = process.env.PORT || 3000;
const localApiUrl = `http://127.0.0.1:${port}/api`;

const assertLocalServerIsReachable = async () => {
  try {
    const response = await fetch(localApiUrl);

    if (!response.ok) {
      throw new Error(`local webhook check returned HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Local backend is not reachable at ${localApiUrl}. Start it first with: npm run dev`,
    );
  }
};

const startTunnel = async () => {
  if (!process.env.NGROK_AUTHTOKEN) {
    throw new Error('NGROK_AUTHTOKEN is missing from .env');
  }

  await assertLocalServerIsReachable();

  const listener = await ngrok.forward({
    addr: `http://localhost:${port}`,
    authtoken_from_env: true,
  });

  const url = listener.url();

  console.log(`ngrok tunnel running: ${url}`);
  console.log('');
  console.log(`GitHub Payload URL: ${url}/api/webhooks/github`);
  console.log(`Slack Events Request URL: ${url}/api/webhooks/slack/events`);
  console.log('');
  console.log('Keep this terminal open while testing webhooks.');

  setInterval(() => {}, 60_000);
};

startTunnel().catch((error) => {
  console.error('Failed to start ngrok tunnel.');
  console.error(error.message);
  process.exit(1);
});
