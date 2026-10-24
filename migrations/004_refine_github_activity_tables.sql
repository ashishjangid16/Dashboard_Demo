ALTER TABLE github_push_events
  DROP COLUMN IF EXISTS pusher_name,
  DROP COLUMN IF EXISTS pusher_email;

ALTER TABLE github_commits
  ADD COLUMN IF NOT EXISTS branch TEXT,
  ADD COLUMN IF NOT EXISTS activity_timestamp TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_github_commits_branch
  ON github_commits(branch);

CREATE INDEX IF NOT EXISTS idx_github_commits_activity_timestamp
  ON github_commits(activity_timestamp DESC);

CREATE TABLE IF NOT EXISTS github_pull_request_events (
  id BIGSERIAL PRIMARY KEY,
  webhook_event_id BIGINT NOT NULL UNIQUE REFERENCES github_webhook_events(id) ON DELETE CASCADE,
  repository_id BIGINT REFERENCES github_repositories(id) ON DELETE SET NULL,
  repository_full_name TEXT,
  action TEXT,
  pull_request_id BIGINT,
  pull_request_number INTEGER,
  title TEXT,
  body TEXT,
  state TEXT,
  html_url TEXT,
  base_branch TEXT,
  head_branch TEXT,
  head_repo_full_name TEXT,
  merged BOOLEAN,
  draft BOOLEAN,
  author_login TEXT,
  activity_timestamp TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_pull_request_events_repository_full_name
  ON github_pull_request_events(repository_full_name);

CREATE INDEX IF NOT EXISTS idx_github_pull_request_events_base_branch
  ON github_pull_request_events(base_branch);

CREATE INDEX IF NOT EXISTS idx_github_pull_request_events_head_branch
  ON github_pull_request_events(head_branch);

CREATE INDEX IF NOT EXISTS idx_github_pull_request_events_activity_timestamp
  ON github_pull_request_events(activity_timestamp DESC);
