const portfolioData = {
  projects: [
    {
      name: 'Axis Bank',
      status: 'on-track',
      needsReview: true,
      managementOwner: 'Srijan',
      fdeOwner: 'Rushab',
      weekSummary:
        'This week, the team made progress on the Identity and CIBIL Check workflows. Identity verification is functioning as expected, while an issue in the CKYC verification step was identified and investigated. The team focused on resolving the CKYC issue and improving the reliability of the verification process. CKYC verification remains the key area of focus before the overall workflow can be considered stable.',
      meetings: {
        teamDates: [],
        previousClientMeetings: [{ date: '2026-10-16', summary: '' }],
        nextClientDate: '2026-10-23',
      },
      needsReviewReason: 'Question to which founder needs to respond.',
      blocker: 'GLO Assistant API failure during e-stamp upload',
      blockerDescription:
        'Potential delay to loan documentation. Confirm whether uploads are blocked.',
      nextMilestone: 'E-stamp workflow verified',
      milestoneDeadline: '2026-11-06',
      nextAction: 'Investigate API failure',
      nextActionOwner: 'Aniket',
      blockerSummary:
        'The e-stamp upload is failing due to an expired or invalid API token, causing authentication requests to be rejected. Additionally, intermittent API timeouts may prevent the upload process from completing successfully. The team needs to validate token renewal and investigate timeout logs to restore reliable uploads.',
      milestoneSummary:
        'The e-stamp workflow was reviewed to validate document uploads, API authentication, and end-to-end processing. The team checked for token-related failures and intermittent API timeouts to identify potential points of failure. Further validation is needed to confirm that e-stamp uploads complete reliably and documents are processed successfully.',
      nextActionSummary:
        'The team is investigating the GLO Assistant API failure affecting e-stamp document uploads. The investigation focuses on expired or invalid API tokens, intermittent request timeouts, and error logs to identify the root cause. The goal is to restore reliable uploads and ensure documents are processed successfully without delays.',
      weekRange: 'Oct 12-18 | Weekly overview',
      weeklyBlockers: [
        {
          title: 'GLO Assistant API failure',
          status: 'ongoing',
          summary:
            'Expired or invalid API tokens and intermittent timeouts are causing e-stamp upload failures.',
          nextMilestone: 'E-stamp workflow verified',
          nextAction:
            'Validate token renewal and inspect timeout logs; confirm successful uploads.',
          dueDate: '2026-10-20',
          fdeOwner: 'Rushab',
        },
        {
          title: 'CKYC verification check',
          status: 'done',
          summary:
            'The CKYC verification issue was investigated, corrected, and passed the latest validation check.',
          nextMilestone: 'Identity and CKYC verification confirmed',
          nextAction: 'Monitor CKYC results in the next verification run.',
          dueDate: '2026-10-16',
          fdeOwner: 'Rushab',
        },
        {
          title: 'CIBIL API credentials check',
          status: 'done',
          summary:
            'CIBIL API credentials were checked and authentication completed successfully.',
          nextMilestone: 'Identity and CIBIL checks verified',
          nextAction: 'Confirm the credentials remain valid in the test environment.',
          dueDate: '2026-10-17',
          fdeOwner: 'Rushab',
        },
      ],
    },
    {
      name: 'Amar Chitra Katha',
      status: 'on-track',
      managementOwner: 'Bharat',
      fdeOwner: 'Jayesh',
      weekSummary:
        'This week, the team finalized two campaign assets and reviewed client feedback. One illustration still needs sign-off before the production package is complete. The next focus is securing approval and preparing the final handoff.',
      blocker: 'Final campaign assets awaiting content sign-off',
      blockerDescription:
        'Confirm approval of the remaining creative assets before production handoff.',
      nextMilestone: 'Content approval complete',
      milestoneDeadline: '2026-11-18',
      nextAction: 'Confirm asset approval',
      nextActionOwner: 'Ravish',
    },
    {
      name: 'Lodha',
      status: 'on-track',
      managementOwner: 'Srijan',
      fdeOwner: 'Ravish',
      weekSummary:
        'This week, the team advanced the valuation service integration and opened a pull request for review. The implementation is ready for feedback, with no confirmed delivery blocker at this time. The next focus is completing review and validating the integration.',
      blocker: 'Valuation service PR is awaiting review',
      blockerDescription:
        'Review the open change before integrating the valuation service.',
      nextMilestone: 'Valuation integration verified',
      milestoneDeadline: '2026-12-04',
      nextAction: 'Follow up on PR review',
      nextActionOwner: 'Abhishek',
    },
    {
      name: 'Mahyco',
      status: 'at-risk',
      managementOwner: 'Abhisekh',
      fdeOwner: 'None',
      weekSummary:
        'This week, the team refined crop-data mapping and shared the proposed fields for client approval. Work on finalizing the mapping is paused while approval is pending. The next focus is obtaining confirmation and resuming validation.',
      blocker: 'Client approval pending for crop-data mapping',
      blockerDescription:
        'Mapping changes cannot be finalized until the client confirms the proposed fields.',
      nextMilestone: 'Crop-data mapping approved',
      milestoneDeadline: '2026-10-19',
      nextAction: 'Request client confirmation',
      nextActionOwner: 'Koshik',
    },
    {
      name: 'Kiran Gems',
      status: 'off-track',
      managementOwner: 'Srijan',
      fdeOwner: 'None',
      weekSummary: 'No progress this week due to inactivity on Slack and GitHub',
      blocker: 'Nothing',
      blockerDescription: 'No Slack activity since last activity',
      nextMilestone: 'Nothing',
      milestoneDeadline: '',
      nextAction: 'Nothing',
      nextActionOwner: 'None',
    },
  ],
  sources: ['GitHub', 'Slack'],
  metrics: [
    { status: 'on-track', label: 'On track', count: 3, detail: '+1 vs last week' },
    { status: 'at-risk', label: 'At risk', count: 1, detail: '-1 vs last week' },
    { status: 'off-track', label: 'Off track', count: 1, detail: 'No change vs last week' },
    { status: 'needs-review', label: 'Needs review', count: 1, detail: 'Axis Bank' },
  ],
};

module.exports = portfolioData;
