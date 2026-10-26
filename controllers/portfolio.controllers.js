const portfolioData = require('../data/portfolio.data');
const { pool } = require('../db');
const { getPullRequestActivity } = require('../models/githubActivity.model');

const formatTimestamp = (value) => {
  if (!value) {
    return 'Timestamp unavailable';
  }

  return new Date(value).toISOString();
};

const formatGitHubWeekSummary = (activity) => {
  if (activity.length === 0) {
    return [
      'No real GitHub PR activity is saved yet.',
      'Repository ID: waiting for GitHub webhook data.',
    ].join('\n');
  }

  return activity
    .map((entry) => {
      const prLabel = entry.pull_request_number
        ? `PR #${entry.pull_request_number}`
        : 'PR';
      const prComment = entry.pr_comment || entry.title || 'No PR comment/body available.';
      const reviewerComment = entry.reviewer_comment
        ? `${entry.reviewer_login || 'Reviewer'}: ${entry.reviewer_comment}`
        : 'No reviewer comment yet.';

      return [
        `${prLabel} | Repository ID: ${entry.repository_id}`,
        `PR comment: ${prComment}`,
        `Reviewer comment: ${reviewerComment}`,
        `Timestamp: ${formatTimestamp(entry.activity_timestamp)}`,
      ].join('\n');
    })
    .join('\n\n');
};

const withGitHubSummaries = async () => {
  const activity = await getPullRequestActivity();
  const axisWeekSummary = formatGitHubWeekSummary(activity);

  return {
    ...portfolioData,
    projects: portfolioData.projects.map((project) =>
      project.name === 'Axis Bank'
        ? { ...project, weekSummary: axisWeekSummary }
        : project,
    ),
  };
};

const fetchLatestSnapshots = async (projectNames) => {
  const { rows } = await pool.query(
    `
      SELECT DISTINCT ON (project_name) *
      FROM portfolio_snapshots
      WHERE project_name = ANY($1::TEXT[])
      ORDER BY project_name, created_at DESC
    `,
    [projectNames],
  );

  return new Map(rows.map((snapshot) => [snapshot.project_name, snapshot]));
};

const formatSnapshotProjectFields = (snapshot) => ({
  status: snapshot.health_status,
  blocker: snapshot.blocker || 'None reported',
  blockerDescription: snapshot.blocker_description || '',
  nextMilestone: snapshot.next_milestone || '',
  milestoneDeadline: snapshot.milestone_deadline
    ? new Date(snapshot.milestone_deadline).toISOString().slice(0, 10)
    : '',
  nextAction: snapshot.next_action || '',
  nextActionOwner: snapshot.next_action_owner || '',
  confidence: Number(snapshot.confidence || 0),
  sourceInsightId: snapshot.source_insight_id,
  snapshotId: snapshot.id,
  snapshotCreatedAt: snapshot.created_at,
  changeReason: snapshot.change_reason,
  leadershipAttention: snapshot.leadership_attention || {},
  needsReview: snapshot.needs_review || {},
  clientMeeting: snapshot.client_meeting || {},
  recoveryPlan: snapshot.recovery_plan || {},
});

const withPortfolioSnapshots = async (data) => {
  const snapshotsByProject = await fetchLatestSnapshots(data.projects.map((project) => project.name));

  return {
    ...data,
    projects: data.projects.map((project) => {
      const snapshot = snapshotsByProject.get(project.name);

      return snapshot
        ? {
            ...project,
            ...formatSnapshotProjectFields(snapshot),
            dataSource: 'portfolio_snapshots',
          }
        : project;
    }),
  };
};

const getPortfolio = async (req, res) => {
  try {
    const dataWithGitHub = await withGitHubSummaries();
    const data = await withPortfolioSnapshots(dataWithGitHub);

    res.status(200).json({
      success: true,
      status: 'ok',
      data,
    });
  } catch (error) {
    console.error('Failed to load portfolio data:', error.message);

    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Unable to load portfolio data.',
    });
  }
};

module.exports = {
  getPortfolio,
};
