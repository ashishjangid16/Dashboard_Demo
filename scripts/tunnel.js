require('dotenv').config();

const ngrok = require('@ngrok/ngrok');

const port = process.env.PORT || 3000;
const localWebhookUrl = `http://127.0.0.1:${port}/api/webhooks/github`;

const assertLocalServerIsReachable = async () => {
  try {
    const response = await fetch(localWebhookUrl);

    if (!response.ok) {
      throw new Error(`local webhook check returned HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Local backend is not reachable at ${localWebhookUrl}. Start it first with: npm run dev`,
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
  console.log(`GitHub Payload URL: ${url}/api/webhooks/github`);
  console.log('Keep this terminal open while testing GitHub webhooks.');

  setInterval(() => {}, 60_000);
};

startTunnel().catch((error) => {
  console.error('Failed to start ngrok tunnel.');
  console.error(error.message);
  process.exit(1);
});
