ALTER TABLE project_activity_insights
  ADD COLUMN IF NOT EXISTS needs_review JSONB NOT NULL DEFAULT '{}'::JSONB;

ALTER TABLE portfolio_snapshots
  ADD COLUMN IF NOT EXISTS needs_review JSONB NOT NULL DEFAULT '{}'::JSONB;
