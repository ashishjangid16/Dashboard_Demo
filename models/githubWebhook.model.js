const { pool } = require('../db');

const getBranchFromRef = (ref) => {
  if (!ref) {
    return null;
  }

  return ref.replace('refs/heads/', '');
};

const getPullRequestActivityTimestamp = (pullRequest) =>
  pullRequest?.merged_at ||
  pullRequest?.closed_at ||
  pullRequest?.updated_at ||
  pullRequest?.created_at ||
  new Date().toISOString();

const getPullRequestWorkflowFlags = (pullRequest) => {
  const isOpen = pullRequest?.state === 'open';
  const isDraft = Boolean(pullRequest?.draft);
  const hasRequestedChanges = pullRequest?.review_decision === 'CHANGES_REQUESTED';
  const isApproved = pullRequest?.review_decision === 'APPROVED';
  const isMergeable =
    pullRequest?.mergeable === true ||
    pullRequest?.mergeable_state === 'clean' ||
    pullRequest?.mergeable_state === 'has_hooks';

  return {
    awaitingApproval: isOpen && !isDraft && !isApproved && !hasRequestedChanges,
    needsAction: isOpen && (isDraft || hasRequestedChanges),
    readyToMerge: isOpen && !isDraft && isApproved && isMergeable,
  };
};

const upsertRepository = async (client, repository) => {
  if (!repository?.full_name) {
    return null;
  }

  const { rows } = await client.query(
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
      ON CONFLICT (full_name)
      DO UPDATE SET
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

const saveRawWebhookEvent = async (client, { event, delivery, payload, repositoryId }) => {
  const { rows } = await client.query(
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

const savePushEvent = async (client, { rawEventId, repositoryId, payload }) => {
  const { rows } = await client.query(
    `
      INSERT INTO github_push_events (
        webhook_event_id,
        repository_id,
        repository_full_name,
        ref,
        branch,
        before_sha,
        after_sha,
        head_commit_id,
        commit_count,
        created,
        deleted,
        forced,
        compare_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (webhook_event_id)
      DO UPDATE SET
        repository_id = EXCLUDED.repository_id,
        repository_full_name = EXCLUDED.repository_full_name,
        ref = EXCLUDED.ref,
        branch = EXCLUDED.branch,
        before_sha = EXCLUDED.before_sha,
        after_sha = EXCLUDED.after_sha,
        head_commit_id = EXCLUDED.head_commit_id,
        commit_count = EXCLUDED.commit_count,
        created = EXCLUDED.created,
        deleted = EXCLUDED.deleted,
        forced = EXCLUDED.forced,
        compare_url = EXCLUDED.compare_url
      RETURNING id
    `,
    [
      rawEventId,
      repositoryId,
      payload.repository?.full_name,
      payload.ref,
      getBranchFromRef(payload.ref),
      payload.before,
      payload.after,
      payload.head_commit?.id,
      payload.commits?.length || 0,
      payload.created,
      payload.deleted,
      payload.forced,
      payload.compare,
    ],
  );

  return rows[0];
};

const saveCommit = async (client, { commit, pushEventId, repositoryId, repositoryFullName, branch }) => {
  await client.query(
    `
      INSERT INTO github_commits (
        sha,
        push_event_id,
        repository_id,
        repository_full_name,
        message,
        author_name,
        author_email,
        author_username,
        committer_name,
        committer_email,
        committer_username,
        url,
        committed_at,
        added_files,
        removed_files,
        modified_files,
        branch,
        activity_timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (sha)
      DO UPDATE SET
        push_event_id = EXCLUDED.push_event_id,
        repository_id = EXCLUDED.repository_id,
        repository_full_name = EXCLUDED.repository_full_name,
        message = EXCLUDED.message,
        author_name = EXCLUDED.author_name,
        author_email = EXCLUDED.author_email,
        author_username = EXCLUDED.author_username,
        committer_name = EXCLUDED.committer_name,
        committer_email = EXCLUDED.committer_email,
        committer_username = EXCLUDED.committer_username,
        url = EXCLUDED.url,
        committed_at = EXCLUDED.committed_at,
        added_files = EXCLUDED.added_files,
        removed_files = EXCLUDED.removed_files,
        modified_files = EXCLUDED.modified_files,
        branch = EXCLUDED.branch,
        activity_timestamp = EXCLUDED.activity_timestamp
    `,
    [
      commit.id,
      pushEventId,
      repositoryId,
      repositoryFullName,
      commit.message,
      commit.author?.name,
      commit.author?.email,
      commit.author?.username,
      commit.committer?.name,
      commit.committer?.email,
      commit.committer?.username,
      commit.url,
      commit.timestamp,
      JSON.stringify(commit.added || []),
      JSON.stringify(commit.removed || []),
      JSON.stringify(commit.modified || []),
      branch,
      commit.timestamp,
    ],
  );
};

const savePullRequestEvent = async (client, { rawEventId, repositoryId, payload }) => {
  const pullRequest = payload.pull_request;

  if (!pullRequest) {
    return null;
  }

  const workflowFlags = getPullRequestWorkflowFlags(pullRequest);

  const { rows } = await client.query(
    `
      INSERT INTO github_pull_request_events (
        webhook_event_id,
        repository_id,
        repository_full_name,
        action,
        pull_request_id,
        pull_request_number,
        title,
        body,
        state,
        html_url,
        base_branch,
        head_branch,
        head_repo_full_name,
        merged,
        draft,
        author_login,
        activity_timestamp,
        awaiting_approval,
        needs_action,
        ready_to_merge
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (webhook_event_id)
      DO UPDATE SET
        repository_id = EXCLUDED.repository_id,
        repository_full_name = EXCLUDED.repository_full_name,
        action = EXCLUDED.action,
        pull_request_id = EXCLUDED.pull_request_id,
        pull_request_number = EXCLUDED.pull_request_number,
        title = EXCLUDED.title,
        body = EXCLUDED.body,
        state = EXCLUDED.state,
        html_url = EXCLUDED.html_url,
        base_branch = EXCLUDED.base_branch,
        head_branch = EXCLUDED.head_branch,
        head_repo_full_name = EXCLUDED.head_repo_full_name,
        merged = EXCLUDED.merged,
        draft = EXCLUDED.draft,
        author_login = EXCLUDED.author_login,
        activity_timestamp = EXCLUDED.activity_timestamp,
        awaiting_approval = EXCLUDED.awaiting_approval,
        needs_action = EXCLUDED.needs_action,
        ready_to_merge = EXCLUDED.ready_to_merge
      RETURNING id
    `,
    [
      rawEventId,
      repositoryId,
      payload.repository?.full_name,
      payload.action,
      pullRequest.id,
      pullRequest.number,
      pullRequest.title,
      pullRequest.body,
      pullRequest.state,
      pullRequest.html_url,
      pullRequest.base?.ref,
      pullRequest.head?.ref,
      pullRequest.head?.repo?.full_name,
      pullRequest.merged,
      pullRequest.draft,
      pullRequest.user?.login,
      getPullRequestActivityTimestamp(pullRequest),
      workflowFlags.awaitingApproval,
      workflowFlags.needsAction,
      workflowFlags.readyToMerge,
    ],
  );

  return rows[0];
};

const saveWebhookEvent = async ({ event, delivery, payload }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const repositoryId = await upsertRepository(client, payload.repository);
    const rawEvent = await saveRawWebhookEvent(client, {
      event,
      delivery,
      payload,
      repositoryId,
    });
    let pushEvent = null;
    let pullRequestEvent = null;

    if (event === 'push') {
      const branch = getBranchFromRef(payload.ref);

      pushEvent = await savePushEvent(client, {
        rawEventId: rawEvent.id,
        repositoryId,
        payload,
      });

      for (const commit of payload.commits || []) {
        await saveCommit(client, {
          commit,
          pushEventId: pushEvent.id,
          repositoryId,
          repositoryFullName: payload.repository?.full_name,
          branch,
        });
      }
    }

    if (event === 'pull_request') {
      pullRequestEvent = await savePullRequestEvent(client, {
        rawEventId: rawEvent.id,
        repositoryId,
        payload,
      });
    }

    await client.query('COMMIT');

    return {
      id: rawEvent.id,
      pushEventId: pushEvent?.id,
      pullRequestEventId: pullRequestEvent?.id,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  saveWebhookEvent,
};
