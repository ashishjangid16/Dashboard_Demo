require('dotenv').config();

const ngrok = require('@ngrok/ngrok');

const port = process.env.PORT || 3000;

const startTunnel = async () => {
  if (!process.env.NGROK_AUTHTOKEN) {
    throw new Error('NGROK_AUTHTOKEN is missing from .env');
  }

  const listener = await ngrok.forward({
    addr: port,
    authtoken_from_env: true,
  });

  const url = listener.url();

  console.log(`ngrok tunnel running: ${url}`);
  console.log(`GitHub Payload URL: ${url}/api/webhooks/github`);
  console.log('Keep this terminal open while testing GitHub webhooks.');
};

startTunnel().catch((error) => {
  console.error('Failed to start ngrok tunnel.');
  console.error(error.message);
  process.exit(1);
});
