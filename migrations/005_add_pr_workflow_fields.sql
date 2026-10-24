ALTER TABLE github_pull_request_events
  ADD COLUMN IF NOT EXISTS awaiting_approval BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS needs_action BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ready_to_merge BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_github_pull_request_events_awaiting_approval
  ON github_pull_request_events(awaiting_approval);

CREATE INDEX IF NOT EXISTS idx_github_pull_request_events_needs_action
  ON github_pull_request_events(needs_action);

CREATE INDEX IF NOT EXISTS idx_github_pull_request_events_ready_to_merge
  ON github_pull_request_events(ready_to_merge);
