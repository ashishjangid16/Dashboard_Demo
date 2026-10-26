require('dotenv').config();

const { pool } = require('../db');

const clearMockData = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const mockMessageRows = await client.query(`
      SELECT id
      FROM slack_messages
      WHERE client_msg_id LIKE 'mock-%'
         OR slack_event_id IN (
           SELECT id
           FROM slack_events
           WHERE event_id LIKE 'mock-slack-%'
         )
    `);
    const mockMessageIds = mockMessageRows.rows.map((row) => row.id);

    const deletedSnapshots = await client.query(
      `
        DELETE FROM portfolio_snapshots
        WHERE source_insight_id IN (
          SELECT insight.id
          FROM project_activity_insights insight
          JOIN project_processing_batches batch ON batch.id = insight.batch_id
          WHERE batch.slack_message_ids && $1::BIGINT[]
        )
      `,
      [mockMessageIds],
    );
    const deletedInsights = await client.query(
      `
        DELETE FROM project_activity_insights
        WHERE batch_id IN (
          SELECT id
          FROM project_processing_batches
          WHERE slack_message_ids && $1::BIGINT[]
        )
      `,
      [mockMessageIds],
    );
    const deletedBatches = await client.query(
      `
        DELETE FROM project_processing_batches
        WHERE slack_message_ids && $1::BIGINT[]
      `,
      [mockMessageIds],
    );
    const deletedMessages = await client.query(`
      DELETE FROM slack_messages
      WHERE client_msg_id LIKE 'mock-%'
         OR slack_event_id IN (
           SELECT id
           FROM slack_events
           WHERE event_id LIKE 'mock-slack-%'
         )
    `);
    const deletedEvents = await client.query(`
      DELETE FROM slack_events
      WHERE event_id LIKE 'mock-slack-%'
    `);

    await client.query('COMMIT');

    console.log(
      JSON.stringify(
        {
          deleted: {
            portfolio_snapshots: deletedSnapshots.rowCount,
            project_activity_insights: deletedInsights.rowCount,
            project_processing_batches: deletedBatches.rowCount,
            slack_messages: deletedMessages.rowCount,
            slack_events: deletedEvents.rowCount,
          },
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to clear mock processing data.');
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

clearMockData();
