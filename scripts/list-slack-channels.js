require('dotenv').config();

const { WebClient } = require('@slack/web-api');

const listSlackChannels = async () => {
  if (!process.env.SLACK_BOT_TOKEN) {
    throw new Error('SLACK_BOT_TOKEN is missing from .env');
  }

  const client = new WebClient(process.env.SLACK_BOT_TOKEN);
  const channels = [];
  let cursor;

  do {
    const result = await client.conversations.list({
      cursor,
      exclude_archived: true,
      limit: 200,
      types: 'public_channel,private_channel',
    });

    channels.push(...(result.channels || []));
    cursor = result.response_metadata?.next_cursor;
  } while (cursor);

  if (channels.length === 0) {
    console.log('No channels visible to this bot token.');
    return;
  }

  console.table(
    channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      isPrivate: channel.is_private,
      isMember: channel.is_member,
    })),
  );
};

listSlackChannels().catch((error) => {
  console.error('Failed to list Slack channels.');
  console.error(error.message);
  process.exit(1);
});
