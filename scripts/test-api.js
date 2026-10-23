const http = require('http');
const app = require('../app');

const server = app.listen(0, () => {
  const { port } = server.address();

  http.get(`http://127.0.0.1:${port}/api/portfolio`, (res) => {
    let body = '';

    res.setEncoding('utf8');
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      server.close();

      const parsed = JSON.parse(body);
      console.log({
        statusCode: res.statusCode,
        status: parsed.status,
        projects: parsed.data.projects.length,
        metrics: parsed.data.metrics.length,
      });

      process.exit(res.statusCode === 200 ? 0 : 1);
    });
  }).on('error', (error) => {
    server.close();
    console.error(error.message);
    process.exit(1);
  });
});
