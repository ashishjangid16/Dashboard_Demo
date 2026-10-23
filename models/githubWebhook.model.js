const { pool } = require('../db');

const upsertRepository = async (repository) => {
  if (!repository?.id) {
    return null;
  }

  const { rows } = await pool.query(
    `
      INSERT INTO github_repositories (
        id,
        full_name,
        name,
        owner_login,
        html_url,
        default_branch,
        private,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        name = EXCLUDED.name,
        owner_login = EXCLUDED.owner_login,
        html_url = EXCLUDED.html_url,
        default_branch = EXCLUDED.default_branch,
        private = EXCLUDED.private,
        updated_at = NOW()
      RETURNING id
    `,
    [
      repository.id,
      repository.full_name,
      repository.name,
      repository.owner?.login,
      repository.html_url,
      repository.default_branch,
      repository.private,
    ],
  );

  return rows[0].id;
};

const saveWebhookEvent = async ({ event, delivery, payload }) => {
  const repositoryId = await upsertRepository(payload.repository);

  const { rows } = await pool.query(
    `
      INSERT INTO github_webhook_events (
        delivery_id,
        event_name,
        action,
        repository_id,
        repository_full_name,
        sender_login,
        ref,
        before_sha,
        after_sha,
        commit_count,
        payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (delivery_id)
      DO UPDATE SET
        event_name = EXCLUDED.event_name,
        action = EXCLUDED.action,
        repository_id = EXCLUDED.repository_id,
        repository_full_name = EXCLUDED.repository_full_name,
        sender_login = EXCLUDED.sender_login,
        ref = EXCLUDED.ref,
        before_sha = EXCLUDED.before_sha,
        after_sha = EXCLUDED.after_sha,
        commit_count = EXCLUDED.commit_count,
        payload = EXCLUDED.payload
      RETURNING id
    `,
    [
      delivery,
      event,
      payload.action,
      repositoryId,
      payload.repository?.full_name,
      payload.sender?.login,
      payload.ref,
      payload.before,
      payload.after,
      payload.commits?.length || 0,
      payload,
    ],
  );

  return rows[0];
};

module.exports = {
  saveWebhookEvent,
};
