require('dotenv').config();

const crypto = require('crypto');
const http = require('http');
const app = require('../app');

const testSlackChallenge = () => {
  if (!process.env.SLACK_SIGNING_SECRET) {
    throw new Error('SLACK_SIGNING_SECRET is missing from .env');
  }

  const payload = JSON.stringify({
    token: 'local-test-token',
    challenge: 'local-slack-challenge-ok',
    type: 'url_verification',
  });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = `v0=${crypto
    .createHmac('sha256', process.env.SLACK_SIGNING_SECRET)
    .update(`v0:${timestamp}:${payload}`)
    .digest('hex')}`;

  const server = app.listen(0, () => {
    const port = server.address().port;
    const request = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/webhooks/slack/events',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
          'x-slack-request-timestamp': timestamp,
          'x-slack-signature': signature,
        },
      },
      (response) => {
        let body = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          server.close();
          console.log({ statusCode: response.statusCode, body });
          process.exit(
            response.statusCode === 200 && body === 'local-slack-challenge-ok'
              ? 0
              : 1,
          );
        });
      },
    );

    request.on('error', (error) => {
      server.close();
      console.error(error.message);
      process.exit(1);
    });

    request.write(payload);
    request.end();
  });
};

try {
  testSlackChallenge();
} catch (error) {
  console.error('Slack challenge test failed.');
  console.error(error.message);
  process.exit(1);
}
