process.env.GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'local-test-secret';

const crypto = require('crypto');
const http = require('http');
const app = require('../app');

const now = new Date().toISOString();
const payload = JSON.stringify({
  action: 'opened',
  repository: {
    id: 123456789,
    full_name: 'ashishjangid16/Quantum-lab-Conference',
    name: 'Quantum-lab-Conference',
    html_url: 'https://github.com/ashishjangid16/Quantum-lab-Conference',
    default_branch: 'main',
    private: false,
    owner: {
      login: 'ashishjangid16',
    },
  },
  sender: {
    login: 'ashishjangid16',
  },
  pull_request: {
    id: 987654321,
    number: 42,
    title: 'Add conference schedule page',
    body: 'Adds the agenda and speaker list for the conference site.',
    state: 'open',
    html_url: 'https://github.com/ashishjangid16/Quantum-lab-Conference/pull/42',
    merged: false,
    draft: false,
    review_decision: 'APPROVED',
    mergeable: true,
    mergeable_state: 'clean',
    created_at: now,
    updated_at: now,
    closed_at: null,
    merged_at: null,
    user: {
      login: 'ashishjangid16',
    },
    base: {
      ref: 'main',
    },
    head: {
      ref: 'feature/conference-schedule',
      repo: {
        full_name: 'ashishjangid16/Quantum-lab-Conference',
      },
    },
  },
});

const signature = `sha256=${crypto
  .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
  .update(payload)
  .digest('hex')}`;

const server = app.listen(0, () => {
  const address = server.address();
  const port = address && address.port;

  if (!port) {
    server.close();
    console.error('Could not start test server.');
    process.exit(1);
  }

  const request = http.request(
    {
      hostname: '127.0.0.1',
      port,
      path: '/api/webhooks/github',
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(payload),
        'x-github-event': 'pull_request',
        'x-github-delivery': `local-pr-test-${Date.now()}`,
        'x-hub-signature-256': signature,
      },
    },
    (res) => {
      let body = '';

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        server.close();
        console.log({ statusCode: res.statusCode, body: JSON.parse(body) });
        process.exit(res.statusCode === 200 ? 0 : 1);
      });
    },
  );

  request.on('error', (error) => {
    server.close();
    console.error(error.message);
    process.exit(1);
  });

  request.write(payload);
  request.end();
});
