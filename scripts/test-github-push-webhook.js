process.env.GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'local-test-secret';

const crypto = require('crypto');
const http = require('http');
const app = require('../app');

const payload = JSON.stringify({
  ref: 'refs/heads/main',
  before: '1111111111111111111111111111111111111111',
  after: '2222222222222222222222222222222222222222',
  created: false,
  deleted: false,
  forced: false,
  compare: 'https://github.com/ashishjangid16/Quantum-lab-Conference/compare/111...222',
  pusher: {
    name: 'Ashish',
    email: 'ashish@example.com',
  },
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
  head_commit: {
    id: '2222222222222222222222222222222222222222',
  },
  commits: [
    {
      id: '2222222222222222222222222222222222222222',
      message: 'Test push webhook storage',
      timestamp: new Date().toISOString(),
      url: 'https://github.com/ashishjangid16/Quantum-lab-Conference/commit/2222222222222222222222222222222222222222',
      author: {
        name: 'Ashish',
        email: 'ashish@example.com',
        username: 'ashishjangid16',
      },
      committer: {
        name: 'Ashish',
        email: 'ashish@example.com',
        username: 'ashishjangid16',
      },
      added: ['README.md'],
      removed: [],
      modified: ['index.html'],
    },
  ],
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
        'x-github-event': 'push',
        'x-github-delivery': `local-push-test-${Date.now()}`,
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
