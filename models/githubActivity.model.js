const { pool } = require('../db');

const DEFAULT_REPOSITORY_FULL_NAME = 'ashishjangid16/Quantum-lab-Conference';

const getPullRequestActivity = async (
  repositoryFullName = DEFAULT_REPOSITORY_FULL_NAME,
) => {
  const { rows } = await pool.query(
    `
      WITH pr_events AS (
        SELECT DISTINCT ON (pull_request_number)
          repository_id,
          repository_full_name,
          pull_request_number,
          title,
          body AS pr_comment,
          NULL::TEXT AS reviewer_comment,
          NULL::TEXT AS reviewer_login,
          activity_timestamp,
          html_url
        FROM github_pull_request_events
        WHERE repository_full_name = $1
        ORDER BY pull_request_number, activity_timestamp DESC
      ),
      review_events AS (
        SELECT
          repository_id,
          repository_full_name,
          COALESCE(
            (payload->'pull_request'->>'number')::INTEGER,
            (payload->'issue'->>'number')::INTEGER
          ) AS pull_request_number,
          COALESCE(
            payload->'pull_request'->>'title',
            payload->'issue'->>'title'
          ) AS title,
          NULL::TEXT AS pr_comment,
          COALESCE(
            payload->'review'->>'body',
            payload->'comment'->>'body'
          ) AS reviewer_comment,
          COALESCE(
            payload->'review'->'user'->>'login',
            payload->'comment'->'user'->>'login',
            sender_login
          ) AS reviewer_login,
          COALESCE(
            payload->'review'->>'submitted_at',
            payload->'comment'->>'updated_at',
            payload->'comment'->>'created_at',
            received_at::TEXT
          )::TIMESTAMPTZ AS activity_timestamp,
          COALESCE(
            payload->'review'->>'html_url',
            payload->'comment'->>'html_url'
          ) AS html_url
        FROM github_webhook_events
        WHERE repository_full_name = $1
          AND event_name IN (
            'pull_request_review',
            'pull_request_review_comment',
            'issue_comment'
          )
          AND COALESCE(
            payload->'review'->>'body',
            payload->'comment'->>'body'
          ) IS NOT NULL
      )
      SELECT *
      FROM (
        SELECT * FROM pr_events
        UNION ALL
        SELECT * FROM review_events
      ) activity
      ORDER BY activity_timestamp DESC
      LIMIT 10
    `,
    [repositoryFullName],
  );

  return rows;
};

module.exports = {
  getPullRequestActivity,
};
