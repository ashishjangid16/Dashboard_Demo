const { pool } = require('../db');

const slackTimestampToDate = (timestamp) => {
  if (!timestamp) {
    return null;
  }

  const seconds = Number.parseFloat(timestamp);

  if (Number.isNaN(seconds)) {
    return null;
  }

  return new Date(seconds * 1000);
};

const saveSlackEvent = async (client, { body }) => {
  const eventId = body?.event_id || null;
  const event = body?.event || {};
  const eventTime = body?.event_time
    ? new Date(Number(body.event_time) * 1000)
    : slackTimestampToDate(event.event_ts || event.ts);

  const { rows } = await client.query(
    `
      INSERT INTO slack_events (
        event_id,
        event_type,
        team_id,
        api_app_id,
        event_time,
        payload
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (event_id)
      DO UPDATE SET
        event_type = EXCLUDED.event_type,
        team_id = EXCLUDED.team_id,
        api_app_id = EXCLUDED.api_app_id,
        event_time = EXCLUDED.event_time,
        payload = EXCLUDED.payload
      RETURNING id
    `,
    [
      eventId,
      event.type,
      body?.team_id || event.team,
      body?.api_app_id,
      eventTime,
      body,
    ],
  );

  return rows[0];
};

const upsertSlackChannel = async (client, channelId) => {
  if (!channelId) {
    return null;
  }

  await client.query(
    `
      INSERT INTO slack_channels (channel_id, updated_at)
      VALUES ($1, NOW())
      ON CONFLICT (channel_id)
      DO UPDATE SET updated_at = NOW()
    `,
    [channelId],
  );

  return channelId;
};

const saveSlackMessage = async ({ message, body }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const savedEvent = await saveSlackEvent(client, { body });
    const channelId = await upsertSlackChannel(client, message.channel);
    const messageTimestamp = message.ts || message.event_ts;

    if (!channelId || !messageTimestamp) {
      throw new Error('Slack message is missing channel or timestamp.');
    }

    const { rows } = await client.query(
      `
        INSERT INTO slack_messages (
          slack_event_id,
          channel_id,
          user_id,
          bot_id,
          client_msg_id,
          message_ts,
          thread_ts,
          subtype,
          text,
          event_ts,
          raw_event
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (channel_id, message_ts)
        DO UPDATE SET
          slack_event_id = EXCLUDED.slack_event_id,
          user_id = EXCLUDED.user_id,
          bot_id = EXCLUDED.bot_id,
          client_msg_id = EXCLUDED.client_msg_id,
          thread_ts = EXCLUDED.thread_ts,
          subtype = EXCLUDED.subtype,
          text = EXCLUDED.text,
          event_ts = EXCLUDED.event_ts,
          raw_event = EXCLUDED.raw_event
        RETURNING id
      `,
      [
        savedEvent.id,
        channelId,
        message.user,
        message.bot_id,
        message.client_msg_id,
        messageTimestamp,
        message.thread_ts,
        message.subtype,
        message.text,
        slackTimestampToDate(message.event_ts || message.ts),
        message,
      ],
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const listSlackMessages = async ({ limit = 20 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const { rows } = await pool.query(
    `
      SELECT
        id,
        channel_id,
        user_id,
        bot_id,
        message_ts,
        thread_ts,
        subtype,
        text,
        event_ts,
        received_at
      FROM slack_messages
      ORDER BY received_at DESC
      LIMIT $1
    `,
    [safeLimit],
  );

  return rows;
};

module.exports = {
  listSlackMessages,
  saveSlackMessage,
};
