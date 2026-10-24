const crypto = require('crypto');
const { saveWebhookEvent } = require('../models/githubWebhook.model');

const getWebhookSecret = () =>
  process.env.GITHUB_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;

const parseGitHubPayload = (req) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  const contentType = req.get('content-type') || '';

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(rawBody);
    const payload = params.get('payload');

    if (!payload) {
      throw new Error('Missing payload form field.');
    }

    return JSON.parse(payload);
  }

  return JSON.parse(rawBody);
};

const verifyGitHubSignature = (payload, signature, secret) => {
  if (!Buffer.isBuffer(payload)) {
    return false;
  }

  if (!signature || !signature.startsWith('sha256=')) {
    return false;
  }

  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`;

  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  return (
    received.length === expected.length &&
    crypto.timingSafeEqual(received, expected)
  );
};

const handleGitHubWebhook = async (req, res) => {
  const secret = getWebhookSecret();

  if (!secret) {
    return res.status(500).json({
      status: 'error',
      message: 'GitHub webhook secret is not configured.',
    });
  }

  const signature = req.get('x-hub-signature-256');

  if (!verifyGitHubSignature(req.body, signature, secret)) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid GitHub webhook signature.',
    });
  }

  const event = req.get('x-github-event');
  const delivery = req.get('x-github-delivery');
  let payload;

  try {
    payload = parseGitHubPayload(req);
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid JSON payload.',
    });
  }

  console.log(`GitHub webhook received: ${event} (${delivery})`);

  let savedEvent;

  try {
    savedEvent = await saveWebhookEvent({ event, delivery, payload });
  } catch (error) {
    console.error('Failed to save GitHub webhook event:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'GitHub webhook received but could not be saved.',
    });
  }

  if (event === 'ping') {
    return res.status(200).json({
      status: 'ok',
      message: 'GitHub webhook connected.',
      repository: payload.repository?.full_name,
      recordId: savedEvent.id,
    });
  }

  if (event === 'push') {
    console.log(
      `Push to ${payload.repository?.full_name} on ${payload.ref} by ${payload.pusher?.name}`,
    );
  }

  return res.status(200).json({
    status: 'ok',
    message: 'GitHub webhook received and saved.',
    event,
    recordId: savedEvent.id,
  });
};

module.exports = {
  handleGitHubWebhook,
};
