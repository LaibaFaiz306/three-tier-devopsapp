const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { app } = require('../app');
const { randomPosition } = require('../galaxy');

function get(port, path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}${path}`, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    }).on('error', reject);
  });
}

test('GET /api/health returns ok', async () => {
  const server = app.listen(0);
  const { status, body } = await get(server.address().port, '/api/health');
  assert.strictEqual(status, 200);
  assert.strictEqual(body.status, 'ok');
  server.close();
});

test('randomPosition stays inside the galaxy', () => {
  for (let i = 0; i < 500; i++) {
    const { x, y, z } = randomPosition();
    assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z));
    assert.ok(Math.hypot(x, z) <= 31);
    assert.ok(Math.abs(y) <= 1.2);
  }
});
