const portfolioData = require('../data/portfolio.data');
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

const getPortfolio = async (req, res) => {
  try {
    const data = await withGitHubSummaries();

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
