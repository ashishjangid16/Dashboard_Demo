CREATE TABLE IF NOT EXISTS slack_channels (
  channel_id TEXT PRIMARY KEY,
  name TEXT,
  is_channel BOOLEAN,
  is_group BOOLEAN,
  is_im BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS slack_events (
  id BIGSERIAL PRIMARY KEY,
  event_id TEXT UNIQUE,
  event_type TEXT,
  team_id TEXT,
  api_app_id TEXT,
  event_time TIMESTAMPTZ,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slack_events_event_type
  ON slack_events(event_type);

CREATE INDEX IF NOT EXISTS idx_slack_events_received_at
  ON slack_events(received_at DESC);

CREATE TABLE IF NOT EXISTS slack_messages (
  id BIGSERIAL PRIMARY KEY,
  slack_event_id BIGINT REFERENCES slack_events(id) ON DELETE SET NULL,
  channel_id TEXT REFERENCES slack_channels(channel_id) ON DELETE SET NULL,
  user_id TEXT,
  bot_id TEXT,
  client_msg_id TEXT,
  message_ts TEXT NOT NULL,
  thread_ts TEXT,
  subtype TEXT,
  text TEXT,
  event_ts TIMESTAMPTZ,
  raw_event JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (channel_id, message_ts)
);

CREATE INDEX IF NOT EXISTS idx_slack_messages_channel_id
  ON slack_messages(channel_id);

CREATE INDEX IF NOT EXISTS idx_slack_messages_event_ts
  ON slack_messages(event_ts DESC);

CREATE INDEX IF NOT EXISTS idx_slack_messages_received_at
  ON slack_messages(received_at DESC);

CREATE TABLE IF NOT EXISTS slack_commands (
  id BIGSERIAL PRIMARY KEY,
  command TEXT NOT NULL,
  text TEXT,
  user_id TEXT,
  channel_id TEXT,
  team_id TEXT,
  response_url TEXT,
  raw_command JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slack_commands_command
  ON slack_commands(command);

CREATE INDEX IF NOT EXISTS idx_slack_commands_received_at
  ON slack_commands(received_at DESC);
