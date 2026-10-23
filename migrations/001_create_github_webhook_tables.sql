CREATE TABLE IF NOT EXISTS github_repositories (
  id BIGINT PRIMARY KEY,
  full_name TEXT NOT NULL UNIQUE,
  name TEXT,
  owner_login TEXT,
  html_url TEXT,
  default_branch TEXT,
  private BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS github_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  delivery_id UUID NOT NULL UNIQUE,
  event_name TEXT NOT NULL,
  action TEXT,
  repository_id BIGINT REFERENCES github_repositories(id) ON DELETE SET NULL,
  repository_full_name TEXT,
  sender_login TEXT,
  ref TEXT,
  before_sha TEXT,
  after_sha TEXT,
  commit_count INTEGER,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_webhook_events_event_name
  ON github_webhook_events(event_name);

CREATE INDEX IF NOT EXISTS idx_github_webhook_events_repository_full_name
  ON github_webhook_events(repository_full_name);

CREATE INDEX IF NOT EXISTS idx_github_webhook_events_received_at
  ON github_webhook_events(received_at DESC);
