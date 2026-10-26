const fs = require('fs');
const { MOCK_TEXT_FILE, seedMockSlackMessages } = require('./mockSlackSeeder');
const { runPortfolioProcessing } = require('./portfolioProcessor');

let watcher = null;
let debounceTimer = null;
let processingQueue = Promise.resolve();

const runSeedAndProcess = async (reason) => {
  if (!process.env.OPENAI_API_KEY) {
    console.log('Portfolio automation skipped: OPENAI_API_KEY is missing.');
    return null;
  }

  const seedResult = await seedMockSlackMessages();
  const processResult = await runPortfolioProcessing();

  console.log(
    'Portfolio automation completed for ' +
      reason +
      '. Seeded ' +
      seedResult.count +
      ' mock message(s).',
  );

  return {
    seedResult,
    processResult,
  };
};

const enqueueSeedAndProcess = (reason) => {
  processingQueue = processingQueue
    .catch(() => null)
    .then(() => runSeedAndProcess(reason))
    .catch((error) => {
      console.error('Portfolio automation failed:', error.message);
    });

  return processingQueue;
};

const scheduleSeedAndProcess = (reason) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    enqueueSeedAndProcess(reason);
  }, 1000);
};

const startPortfolioAutomation = () => {
  if (process.env.PORTFOLIO_AUTOMATION === 'false') {
    console.log('Portfolio automation disabled. Set PORTFOLIO_AUTOMATION=true to enable it.');
    return null;
  }

  scheduleSeedAndProcess('server start');

  if (fs.existsSync(MOCK_TEXT_FILE)) {
    watcher = fs.watch(MOCK_TEXT_FILE, { persistent: false }, () => {
      scheduleSeedAndProcess('mock Slack text change');
    });
    console.log('Watching mock Slack text for portfolio processing: ' + MOCK_TEXT_FILE);
  } else {
    console.log('Mock Slack text file not found: ' + MOCK_TEXT_FILE);
  }

  return watcher;
};

const stopPortfolioAutomation = () => {
  clearTimeout(debounceTimer);

  if (watcher) {
    watcher.close();
    watcher = null;
  }
};

module.exports = {
  startPortfolioAutomation,
  stopPortfolioAutomation,
};
