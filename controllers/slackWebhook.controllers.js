const crypto = require('crypto');
const { saveSlackMessage } = require('../models/slack.model');

const parseSlackBody = (req) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  const contentType = req.get('content-type') || '';

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(rawBody));
  }

  return JSON.parse(rawBody);
};

const verifySlackSignature = (req) => {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    throw new Error('SLACK_SIGNING_SECRET is missing from .env');
  }

  const timestamp = req.get('x-slack-request-timestamp');
  const signature = req.get('x-slack-signature');

  if (!timestamp || !signature) {
    return false;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const requestTime = Number(timestamp);

  if (!Number.isFinite(requestTime) || Math.abs(currentTime - requestTime) > 300) {
    return false;
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  const baseString = `v0:${timestamp}:${rawBody}`;
  const expectedSignature = `v0=${crypto
    .createHmac('sha256', signingSecret)
    .update(baseString)
    .digest('hex')}`;

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature),
  );
};

const handleSlackEvents = async (req, res) => {
  try {
    if (!verifySlackSignature(req)) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid Slack signature.',
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }

  let payload;

  try {
    payload = parseSlackBody(req);
  } catch (error) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid Slack payload.',
    });
  }

  if (payload.type === 'url_verification') {
    return res.status(200).send(payload.challenge);
  }

  if (payload.type !== 'event_callback') {
    return res.status(200).json({ status: 'ignored' });
  }

  const event = payload.event;

  if (event?.type !== 'message' || event.subtype || event.bot_id) {
    return res.status(200).json({ status: 'ignored' });
  }

  try {
    const savedMessage = await saveSlackMessage({
      message: event,
      body: payload,
    });

    console.log(
      `Slack HTTP message saved: ${event.channel} ${event.ts} (${savedMessage.id})`,
    );
  } catch (error) {
    console.error('Failed to save Slack HTTP event:', error.message);

    return res.status(500).json({
      status: 'error',
      message: 'Slack event received but could not be saved.',
    });
  }

  return res.status(200).json({ status: 'ok' });
};

const checkSlackWebhook = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Slack webhook endpoint is reachable. Use POST for Slack events.',
  });
};

module.exports = {
  checkSlackWebhook,
  handleSlackEvents,
};
