require('dotenv').config();

const { pool } = require('../db');
const portfolioData = require('../data/portfolio.data');

const WINDOW_HOURS = Number(process.env.PROCESSING_WINDOW_HOURS || 2);
const PROJECTS = ['Axis Bank', 'Amar Chitra Katha'];
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.1';
const OPENAI_FALLBACK_MODELS = [...new Set([OPENAI_MODEL, 'gpt-5.1', 'gpt-4.1-mini', 'gpt-4o-mini'])];
const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const HEALTH_ORDER = {
  'on-track': 1,
  'at-risk': 2,
  'off-track': 3,
};
const PROCESSING_HEALTH_STATUSES = ['on-track', 'at-risk', 'off-track'];
const HEALTH_STATUS_RULES = [
  'ON-TRACK: Client approvals needed for upcoming work have arrived by their agreed dates.',
  'ON-TRACK: All milestones that are due are completed before deadline.',
  'ON-TRACK: Upcoming milestones have no known blocker likely to delay them.',
  'ON-TRACK: Active projects can still have future milestones that are not completed yet, as long as they are not due/overdue and have no likely blocker.',
  'AT-RISK: Some milestones are incomplete after deadline, but the project still has a credible recovery plan and revised date.',
  'AT-RISK: An upcoming milestone is likely to slip because an approval, decision, dependency, or action is delayed.',
  'AT-RISK: A required technical alignment, client decision, dependency, or action is unresolved and can block or delay upcoming delivery.',
  'OFF-TRACK: A critical milestone is overdue with no credible recovery plan, or the project target date is no longer achievable.',
  'OFF-TRACK: A critical client-side dependency is overdue and blocks delivery, with no confirmed owner or resolution date.',
  'If evidence is mixed, choose the worst supported status from the supplied Slack messages.',
  'health_status must only be on-track, at-risk, or off-track. Never output needs-review as health_status.',
  'A project can be at-risk and also need review. In that case, set health_status=at-risk and needs_review.show=true.',
].join('\n');

const INSIGHT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'project_name',
    'health_status',
    'health_change',
    'confidence',
    'summary',
    'blockers',
    'next_milestone',
    'next_actions',
    'important_updates',
    'leadership_attention',
    'needs_review',
    'client_meeting',
    'recovery_plan',
    'evidence',
  ],
  properties: {
    project_name: {
      type: 'string',
      enum: PROJECTS,
    },
    health_status: {
      type: 'string',
      enum: PROCESSING_HEALTH_STATUSES,
    },
    health_change: {
      type: 'string',
      enum: ['improved', 'worsened', 'unchanged'],
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
    summary: {
      type: 'string',
      minLength: 1,
    },
    blockers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'severity', 'owner', 'evidence_message_ids'],
        properties: {
          title: { type: 'string' },
          severity: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
          },
          owner: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
          },
          evidence_message_ids: {
            type: 'array',
            items: { type: 'integer' },
          },
        },
      },
    },
    next_milestone: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'due_date', 'risk'],
      properties: {
        title: {
          anyOf: [{ type: 'string' }, { type: 'null' }],
        },
        due_date: {
          anyOf: [{ type: 'string' }, { type: 'null' }],
        },
        risk: {
          type: 'string',
          enum: ['stable', 'may-slip', 'blocked', 'unknown'],
        },
      },
    },
    next_actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'owner', 'priority'],
        properties: {
          title: { type: 'string' },
          owner: {
            anyOf: [{ type: 'string' }, { type: 'null' }],
          },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high'],
          },
        },
      },
    },
    important_updates: {
      type: 'array',
      items: { type: 'string' },
    },
    leadership_attention: {
      type: 'object',
      additionalProperties: false,
      required: ['show', 'title', 'description', 'evidence_message_ids'],
      properties: {
        show: { type: 'boolean' },
        title: {
          anyOf: [{ type: 'string' }, { type: 'null' }],
        },
        description: {
          anyOf: [{ type: 'string' }, { type: 'null' }],
        },
        evidence_message_ids: {
          type: 'array',
          items: { type: 'integer' },
        },
      },
    },
    needs_review: {
      type: 'object',
      additionalProperties: false,
      required: ['show', 'title', 'description', 'evidence_message_ids'],
      properties: {
        show: { type: 'boolean' },
        title: {
          anyOf: [{ type: 'string' }, { type: 'null' }],
        },
        description: {
          anyOf: [{ type: 'string' }, { type: 'null' }],
        },
        evidence_message_ids: {
          type: 'array',
          items: { type: 'integer' },
        },
      },
    },
    client_meeting: {
      type: 'object',
      additionalProperties: false,
      required: ['scheduled', 'date', 'description', 'evidence_message_ids'],
      properties: {
        scheduled: { type: 'boolean' },
        date: {
          anyOf: [{ type: 'string' }, { type: 'null' }],
        },
        description: {
          anyOf: [{ type: 'string' }, { type: 'null' }],
        },
        evidence_message_ids: {
          type: 'array',
          items: { type: 'integer' },
        },
      },
    },
    recovery_plan: {
      type: 'object',
      additionalProperties: false,
      required: ['show', 'description', 'owner', 'target_date', 'evidence_message_ids'],
      properties: {
        show: { type: 'boolean' },
        description: {
          anyOf: [{ type: 'string' }, { type: 'null' }],
        },
        owner: {
          anyOf: [{ type: 'string' }, { type: 'null' }],
        },
        target_date: {
          anyOf: [{ type: 'string' }, { type: 'null' }],
        },
        evidence_message_ids: {
          type: 'array',
          items: { type: 'integer' },
        },
      },
    },
    evidence: {
      type: 'object',
      additionalProperties: false,
      required: ['slack_message_ids'],
      properties: {
        slack_message_ids: {
          type: 'array',
          items: { type: 'integer' },
        },
      },
    },
  },
};

const clampConfidence = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const getProjectDefaults = (projectName) => {
  const project = portfolioData.projects.find((entry) => entry.name === projectName);

  return {
    project_name: projectName,
    health_status: PROCESSING_HEALTH_STATUSES.includes(project?.status) ? project.status : 'on-track',
    blocker: project?.blocker || null,
    blocker_description: project?.blockerDescription || null,
    next_milestone: project?.nextMilestone || null,
    milestone_deadline: project?.milestoneDeadline || null,
    next_action: project?.nextAction || null,
    next_action_owner: project?.nextActionOwner || null,
    management_owner: project?.managementOwner || null,
    fde_owner: project?.fdeOwner || null,
  };
};

const fetchLatestSnapshot = async (client, projectName) => {
  const { rows } = await client.query(
    `
      SELECT *
      FROM portfolio_snapshots
      WHERE project_name = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [projectName],
  );

  return rows[0] || getProjectDefaults(projectName);
};

const fetchSlackMessages = async (client, { projectName, windowStart, windowEnd }) => {
  const { rows } = await client.query(
    `
      SELECT
        id,
        channel_id,
        user_id,
        text,
        event_ts,
        received_at
      FROM slack_messages
      WHERE COALESCE(event_ts, received_at) >= $1
        AND COALESCE(event_ts, received_at) < $2
        AND text ILIKE $3
      ORDER BY COALESCE(event_ts, received_at) ASC
    `,
    [windowStart, windowEnd, `%${projectName}%`],
  );

  return rows;
};

const createBatch = async (client, { projectName, windowStart, windowEnd, messageIds }) => {
  const { rows } = await client.query(
    `
      INSERT INTO project_processing_batches (
        project_name,
        source_type,
        window_start,
        window_end,
        slack_message_ids,
        status
      )
      VALUES ($1, 'slack', $2, $3, $4, 'pending')
      RETURNING id
    `,
    [projectName, windowStart, windowEnd, messageIds],
  );

  return rows[0];
};

const inferHealthChange = (previousStatus, nextStatus) => {
  const previous = HEALTH_ORDER[previousStatus] || HEALTH_ORDER['on-track'];
  const next = HEALTH_ORDER[nextStatus] || HEALTH_ORDER['on-track'];

  if (next > previous) {
    return 'worsened';
  }

  if (next < previous) {
    return 'improved';
  }

  return 'unchanged';
};

const extractResponseText = (responseBody) => {
  if (typeof responseBody.output_text === 'string') {
    return responseBody.output_text;
  }

  const contentItems = responseBody.output
    ?.flatMap((item) => item.content || [])
    ?.map((content) => content.text || content.output_text)
    ?.filter(Boolean);

  return contentItems?.[0] || null;
};

const requestOpenAIInsight = async ({ model, payload }) => {
  const systemPrompt = [
    'You analyze Slack messages for project portfolio health.',
    'Return only the requested JSON schema.',
    'Do not invent facts. Use null when unknown.',
    'Evidence Slack message IDs must come only from the supplied messages.',
    'Ignore GitHub because this run is Slack-only.',
    'Use the previous snapshot only to determine health_change and continuity, not as evidence for current blockers or updates.',
    'Do not copy previous snapshot blocker, milestone, due date, or next action into the response unless the supplied Slack messages explicitly mention or reaffirm that same item.',
    'If the supplied messages mention a planned review, checkpoint, approval, alignment, implementation plan, or decision with a date/deadline, extract that as next_milestone.title and next_milestone.due_date.',
    'For relative or partial dates, infer the date from the processing year when obvious. For example, "before Oct 30" in a 2026 processing run means due_date "2026-10-30".',
    'For client_meeting.date, also infer the processing year for partial dates. For example, "Nov 1" in a 2026 processing run means date "2026-11-01".',
    '',
    'Health status decision rules:',
    HEALTH_STATUS_RULES,
    '',
    'Display decision rules:',
    'If supplied messages mention a missed deadline, overdue check, delayed dependency, or risk to client meeting outcome, surface it in blockers, summary, and next_actions.',
    'If a deadline was missed but the messages still describe a path to recover before the client meeting/checkpoint, classify health_status as at-risk. If no credible path or owner exists for a critical missed deadline, classify health_status as off-track.',
    'needs_review.show must be true when the supplied messages contain a requirement/design decision, implementation approach, unresolved alignment point, open decision, or review-worthy action that needs human/team review.',
    'needs_review.show is not a health status. It is a separate display signal.',
    'leadership_attention.show must be true when the supplied messages contain a leadership-worthy escalation, high/critical blocker, off-track status, explicit management attention ask, or needs_review.show=true.',
    'client_meeting.scheduled must be true when the supplied messages mention an actual client meeting, client call, client review, client sync, client checkpoint, invite, or a participant confirming that a proposed client meeting date works.',
    'If no client meeting is found, set client_meeting.scheduled=false, date=null, and description="No upcoming client meeting has been recorded."',
    'recovery_plan.show must be true only for at-risk status when the supplied messages include a credible recovery plan, owner, revised date, or concrete mitigation path.',
    'recovery_plan.show must be false for on-track and off-track statuses.',
    'If needs_review.show=true and no credible recovery plan exists, recovery_plan.show must be false. Use next_actions for the review/alignment step.',
  ].join('\n');

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: JSON.stringify(payload),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'project_activity_insight',
          strict: true,
          schema: INSIGHT_SCHEMA,
        },
      },
    }),
  });

  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = responseBody.error?.message || `OpenAI request failed with status ${response.status}`;
    throw new Error(message);
  }

  return responseBody;
};

const analyzeWithOpenAI = async ({ projectName, messages, previousSnapshot }) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is missing from .env. Add it before running npm run process:slack.');
  }

  const payload = {
    project_name: projectName,
    previous_snapshot: {
      health_status: previousSnapshot.health_status,
      blocker: previousSnapshot.blocker,
      blocker_description: previousSnapshot.blocker_description,
      next_milestone: previousSnapshot.next_milestone,
      milestone_deadline: previousSnapshot.milestone_deadline,
      next_action: previousSnapshot.next_action,
      next_action_owner: previousSnapshot.next_action_owner,
      needs_review: previousSnapshot.needs_review || {},
    },
    messages: messages.map((message) => ({
      id: Number(message.id),
      channel_id: message.channel_id,
      user_id: message.user_id,
      text: message.text,
      timestamp: message.event_ts || message.received_at,
    })),
  };

  let responseBody = null;
  let selectedModel = null;
  const errors = [];

  for (const model of OPENAI_FALLBACK_MODELS) {
    try {
      responseBody = await requestOpenAIInsight({ model, payload });
      selectedModel = model;
      break;
    } catch (error) {
      errors.push(`${model}: ${error.message}`);
    }
  }

  if (!responseBody) {
    throw new Error(`OpenAI request failed for all configured models. ${errors.join(' | ')}`);
  }

  const outputText = extractResponseText(responseBody);

  if (!outputText) {
    throw new Error('OpenAI response did not include parseable output text.');
  }

  const insight = JSON.parse(outputText);

  return {
    ...insight,
    health_change: inferHealthChange(previousSnapshot.health_status, insight.health_status),
    llm_raw_response: {
      mode: 'openai-responses',
      model: selectedModel,
      response_id: responseBody.id || null,
      usage: responseBody.usage || null,
    },
  };
};

const validateInsight = async (client, insight, messages) => {
  const errors = [];
  const messageIds = new Set(messages.map((message) => Number(message.id)));
  const evidenceIds = insight.evidence?.slack_message_ids || [];

  if (!PROJECTS.includes(insight.project_name)) {
    errors.push('Unknown project_name.');
  }

  if (!PROCESSING_HEALTH_STATUSES.includes(insight.health_status)) {
    errors.push('Invalid health_status.');
  }

  if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) {
    errors.push('No Slack evidence message IDs provided.');
  }

  for (const id of evidenceIds) {
    if (!messageIds.has(Number(id))) {
      errors.push(`Evidence Slack message ID ${id} was not in this processing window.`);
    }
  }

  const validateSignalEvidence = (signalName, ids = [], shouldHaveEvidence) => {
    if (shouldHaveEvidence && (!Array.isArray(ids) || ids.length === 0)) {
      errors.push(`${signalName} has no Slack evidence message IDs.`);
    }

    for (const id of ids || []) {
      if (!messageIds.has(Number(id))) {
        errors.push(`${signalName} evidence Slack message ID ${id} was not in this processing window.`);
      }
    }
  };

  for (const [index, blocker] of (insight.blockers || []).entries()) {
    const blockerEvidenceIds = blocker.evidence_message_ids || [];

    if (!Array.isArray(blockerEvidenceIds) || blockerEvidenceIds.length === 0) {
      errors.push(`Blocker ${index + 1} has no Slack evidence message IDs.`);
      continue;
    }

    for (const id of blockerEvidenceIds) {
      if (!messageIds.has(Number(id))) {
        errors.push(`Blocker ${index + 1} evidence Slack message ID ${id} was not in this processing window.`);
      }
    }
  }

  validateSignalEvidence(
    'Leadership attention',
    insight.leadership_attention?.evidence_message_ids,
    Boolean(insight.leadership_attention?.show),
  );
  validateSignalEvidence(
    'Needs review',
    insight.needs_review?.evidence_message_ids,
    Boolean(insight.needs_review?.show),
  );
  validateSignalEvidence(
    'Client meeting',
    insight.client_meeting?.evidence_message_ids,
    Boolean(insight.client_meeting?.scheduled),
  );
  validateSignalEvidence(
    'Recovery plan',
    insight.recovery_plan?.evidence_message_ids,
    Boolean(insight.recovery_plan?.show),
  );

  if (insight.health_status === 'needs-review') {
    errors.push('needs-review is not a valid project health_status.');
  }

  if (insight.health_status !== 'at-risk' && insight.recovery_plan?.show) {
    errors.push('Recovery plan can only be shown for at-risk status.');
  }

  const confidence = calculateConfidence(insight, errors);

  return {
    isValid: errors.length === 0 && confidence >= 0.4,
    errors,
    confidence,
  };
};

const calculateConfidence = (insight, validationErrors) => {
  let confidence = clampConfidence(insight.confidence);
  const evidenceCount = insight.evidence?.slack_message_ids?.length || 0;
  const hasBlocker = Array.isArray(insight.blockers) && insight.blockers.length > 0;
  const hasAction = Array.isArray(insight.next_actions) && insight.next_actions.length > 0;
  const hasMilestone = Boolean(insight.next_milestone?.title);

  if (evidenceCount === 0) confidence -= 0.35;
  if (evidenceCount >= 2) confidence += 0.1;
  if (hasBlocker && hasAction) confidence += 0.1;
  if (hasMilestone) confidence += 0.05;
  if (validationErrors.length > 0) confidence -= validationErrors.length * 0.15;

  return clampConfidence(confidence);
};

const saveInsight = async (client, { batchId, insight, validation }) => {
  const { rows } = await client.query(
    `
      INSERT INTO project_activity_insights (
        batch_id,
        project_name,
        health_status,
        health_change,
        confidence,
        summary,
        blockers,
        next_milestone,
        next_actions,
        important_updates,
        leadership_attention,
        needs_review,
        client_meeting,
        recovery_plan,
        evidence,
        llm_raw_response,
        validation_status,
        validation_errors
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id
    `,
    [
      batchId,
      insight.project_name,
      insight.health_status,
      insight.health_change,
      validation.confidence,
      insight.summary,
      JSON.stringify(insight.blockers || []),
      JSON.stringify(insight.next_milestone || {}),
      JSON.stringify(insight.next_actions || []),
      JSON.stringify(insight.important_updates || []),
      JSON.stringify(insight.leadership_attention || {}),
      JSON.stringify(insight.needs_review || {}),
      JSON.stringify(insight.client_meeting || {}),
      JSON.stringify(insight.recovery_plan || {}),
      JSON.stringify(insight.evidence || {}),
      JSON.stringify(insight.llm_raw_response || {}),
      validation.isValid ? 'valid' : 'invalid',
      JSON.stringify(validation.errors),
    ],
  );

  return rows[0];
};

const shouldUpdateSnapshot = ({ insight, validation, previousSnapshot }) => {
  if (!validation.isValid) {
    return false;
  }

  if (insight.health_status !== previousSnapshot.health_status) {
    return validation.confidence >= 0.65;
  }

  return validation.confidence >= 0.4;
};

const saveSnapshot = async (client, { insight, validation, previousSnapshot, sourceInsightId }) => {
  const primaryBlocker = insight.blockers?.[0];
  const primaryAction = insight.next_actions?.[0];
  const nextMilestone = insight.next_milestone || {};
  const blockerTitle = primaryBlocker?.title || null;

  const { rows } = await client.query(
    `
      INSERT INTO portfolio_snapshots (
        project_name,
        health_status,
        blocker,
        blocker_description,
        next_milestone,
        milestone_deadline,
        next_action,
        next_action_owner,
        management_owner,
        fde_owner,
        confidence,
        source_insight_id,
        previous_snapshot_id,
        change_reason,
        leadership_attention,
        needs_review,
        client_meeting,
        recovery_plan
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id
    `,
    [
      insight.project_name,
      insight.health_status,
      blockerTitle,
      insight.summary || previousSnapshot.blocker_description,
      nextMilestone.title || null,
      nextMilestone.due_date || null,
      primaryAction?.title || null,
      primaryAction?.owner || null,
      previousSnapshot.management_owner,
      previousSnapshot.fde_owner,
      validation.confidence,
      sourceInsightId,
      previousSnapshot.id || null,
      insight.health_change,
      JSON.stringify(insight.leadership_attention || {}),
      JSON.stringify(insight.needs_review || {}),
      JSON.stringify(insight.client_meeting || {}),
      JSON.stringify(insight.recovery_plan || {}),
    ],
  );

  return rows[0];
};

const processProject = async (client, { projectName, windowStart, windowEnd }) => {
  const previousSnapshot = await fetchLatestSnapshot(client, projectName);
  const messages = await fetchSlackMessages(client, { projectName, windowStart, windowEnd });
  const messageIds = messages.map((message) => Number(message.id));
  const batch = await createBatch(client, { projectName, windowStart, windowEnd, messageIds });

  if (messages.length === 0) {
    await client.query(
      `
        UPDATE project_processing_batches
        SET status = 'skipped', completed_at = NOW()
        WHERE id = $1
      `,
      [batch.id],
    );

    return { projectName, status: 'skipped', messageCount: 0 };
  }

  const insight = await analyzeWithOpenAI({ projectName, messages, previousSnapshot });
  const validation = await validateInsight(client, insight, messages);
  const savedInsight = await saveInsight(client, { batchId: batch.id, insight, validation });
  let snapshot = null;

  if (shouldUpdateSnapshot({ insight, validation, previousSnapshot })) {
    snapshot = await saveSnapshot(client, {
      insight,
      validation,
      previousSnapshot,
      sourceInsightId: savedInsight.id,
    });
  }

  await client.query(
    `
      UPDATE project_processing_batches
      SET status = $2, completed_at = NOW()
      WHERE id = $1
    `,
    [batch.id, validation.isValid ? 'processed' : 'failed'],
  );

  return {
    projectName,
    status: validation.isValid ? 'processed' : 'failed',
    messageCount: messages.length,
    confidence: validation.confidence,
    insightId: savedInsight.id,
    snapshotId: snapshot?.id || null,
    validationErrors: validation.errors,
  };
};

const runPortfolioProcessing = async () => {
  const client = await pool.connect();
  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - WINDOW_HOURS * 60 * 60 * 1000);
  const results = [];

  try {
    await client.query('BEGIN');

    for (const projectName of PROJECTS) {
      results.push(await processProject(client, { projectName, windowStart, windowEnd }));
    }

    await client.query('COMMIT');
    const output = { windowStart, windowEnd, results };
    console.log(JSON.stringify(output, null, 2));
    return output;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  runPortfolioProcessing,
  HEALTH_STATUS_RULES,
  INSIGHT_SCHEMA,
};
