CREATE TABLE IF NOT EXISTS project_processing_batches (
  id BIGSERIAL PRIMARY KEY,
  project_name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'slack',
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  slack_message_ids BIGINT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT project_processing_batches_status_check
    CHECK (status IN ('pending', 'processed', 'skipped', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_project_processing_batches_project_window
  ON project_processing_batches(project_name, window_start DESC, window_end DESC);

CREATE INDEX IF NOT EXISTS idx_project_processing_batches_status
  ON project_processing_batches(status);

CREATE TABLE IF NOT EXISTS project_activity_insights (
  id BIGSERIAL PRIMARY KEY,
  batch_id BIGINT NOT NULL REFERENCES project_processing_batches(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  health_status TEXT NOT NULL,
  health_change TEXT NOT NULL DEFAULT 'unchanged',
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 0,
  summary TEXT,
  blockers JSONB NOT NULL DEFAULT '[]'::JSONB,
  next_milestone JSONB NOT NULL DEFAULT '{}'::JSONB,
  next_actions JSONB NOT NULL DEFAULT '[]'::JSONB,
  important_updates JSONB NOT NULL DEFAULT '[]'::JSONB,
  evidence JSONB NOT NULL DEFAULT '{}'::JSONB,
  llm_raw_response JSONB NOT NULL DEFAULT '{}'::JSONB,
  validation_status TEXT NOT NULL DEFAULT 'pending',
  validation_errors JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT project_activity_insights_health_status_check
    CHECK (health_status IN ('on-track', 'at-risk', 'off-track', 'needs-review')),
  CONSTRAINT project_activity_insights_health_change_check
    CHECK (health_change IN ('improved', 'worsened', 'unchanged', 'unknown')),
  CONSTRAINT project_activity_insights_validation_status_check
    CHECK (validation_status IN ('pending', 'valid', 'invalid'))
);

CREATE INDEX IF NOT EXISTS idx_project_activity_insights_project_created
  ON project_activity_insights(project_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_activity_insights_batch_id
  ON project_activity_insights(batch_id);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id BIGSERIAL PRIMARY KEY,
  project_name TEXT NOT NULL,
  health_status TEXT NOT NULL,
  blocker TEXT,
  blocker_description TEXT,
  next_milestone TEXT,
  milestone_deadline DATE,
  next_action TEXT,
  next_action_owner TEXT,
  management_owner TEXT,
  fde_owner TEXT,
  confidence NUMERIC(4, 3) NOT NULL DEFAULT 0,
  source_insight_id BIGINT REFERENCES project_activity_insights(id) ON DELETE SET NULL,
  previous_snapshot_id BIGINT REFERENCES portfolio_snapshots(id) ON DELETE SET NULL,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT portfolio_snapshots_health_status_check
    CHECK (health_status IN ('on-track', 'at-risk', 'off-track', 'needs-review'))
);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_project_created
  ON portfolio_snapshots(project_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_source_insight_id
  ON portfolio_snapshots(source_insight_id);
