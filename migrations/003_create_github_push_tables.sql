CREATE TABLE IF NOT EXISTS github_push_events (
  id BIGSERIAL PRIMARY KEY,
  webhook_event_id BIGINT NOT NULL UNIQUE REFERENCES github_webhook_events(id) ON DELETE CASCADE,
  repository_id BIGINT REFERENCES github_repositories(id) ON DELETE SET NULL,
  repository_full_name TEXT,
  ref TEXT,
  branch TEXT,
  before_sha TEXT,
  after_sha TEXT,
  pusher_name TEXT,
  pusher_email TEXT,
  head_commit_id TEXT,
  commit_count INTEGER DEFAULT 0,
  created BOOLEAN,
  deleted BOOLEAN,
  forced BOOLEAN,
  compare_url TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_push_events_repository_full_name
  ON github_push_events(repository_full_name);

CREATE INDEX IF NOT EXISTS idx_github_push_events_branch
  ON github_push_events(branch);

CREATE INDEX IF NOT EXISTS idx_github_push_events_received_at
  ON github_push_events(received_at DESC);

CREATE TABLE IF NOT EXISTS github_commits (
  sha TEXT PRIMARY KEY,
  push_event_id BIGINT NOT NULL REFERENCES github_push_events(id) ON DELETE CASCADE,
  repository_id BIGINT REFERENCES github_repositories(id) ON DELETE SET NULL,
  repository_full_name TEXT,
  message TEXT,
  author_name TEXT,
  author_email TEXT,
  author_username TEXT,
  committer_name TEXT,
  committer_email TEXT,
  committer_username TEXT,
  url TEXT,
  committed_at TIMESTAMPTZ,
  added_files JSONB DEFAULT '[]'::JSONB,
  removed_files JSONB DEFAULT '[]'::JSONB,
  modified_files JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_commits_push_event_id
  ON github_commits(push_event_id);

CREATE INDEX IF NOT EXISTS idx_github_commits_repository_full_name
  ON github_commits(repository_full_name);

CREATE INDEX IF NOT EXISTS idx_github_commits_committed_at
  ON github_commits(committed_at DESC);
