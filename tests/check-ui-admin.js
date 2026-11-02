const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { createAdmin } = require('../tools/ui-admin');

function request(handler, url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = Readable.from(options.body ? [Buffer.from(options.body)] : []);
    req.url = url; req.method = options.method || 'GET';
    const res = { statusCode: 200, setHeader() {}, writeHead(code) { this.statusCode = code; }, end(body = '') { resolve({ status: this.statusCode, json: async () => JSON.parse(body), text: async () => body }); } };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}
test('save and reset write locally; only confirmed POST publishes', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'illu-admin-'));
  const dir = path.join(root, '스크립트', '00_세팅');
  fs.mkdirSync(path.join(dir, 'ui_catalog'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'ui_catalog', 'test.json'), JSON.stringify({ dialog: 'test', controls: [{ id: 'a', type: 'button', text: 'old', orig: 'old' }] }));
  let calls = 0;
  const handler = createAdmin({ root, publish: async () => { calls++; return { message: 'published' }; }, status: async () => ({ ok: true, diff: 'preview' }) });
  const fetch = (route, options) => request(handler, route, options);
  const url = '';
  const post = (route, body) => fetch(route, { method: 'POST', body: JSON.stringify(body) });
  try {
    assert.equal((await fetch(url + '/api/publish')).status, 405);
    assert.equal((await post('/api/publish', {})).status, 400);
    assert.equal((await post('/api', { dialog: 'test', rows: [{ id: 'a', text: 'new' }] })).status, 200);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'ui_overrides.json'))).test.a.text, 'new');
    assert.equal(calls, 0);
    await post('/api', { dialog: 'test', rows: [] });
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'ui_overrides.json'))), {});
    assert.equal(calls, 0);
    assert.equal((await (await fetch(url + '/api/status')).json()).diff, 'preview');
    assert.equal((await post('/api/publish', { confirm: 'publish' })).status, 200);
    assert.equal(calls, 1);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

const http = require('node:http');
const { spawn } = require('node:child_process');
const { adminUrl, probe, waitUntilReady } = require('../tools/ui-admin-launch');
test('Windows launcher validates ports and recognizes the existing admin only', async () => {
  assert.equal(adminUrl('5300'), 'http://127.0.0.1:5300/');
  for (const bad of ['0', '65536', '5200 & calc', 'NaN']) assert.throws(() => adminUrl(bad));
  const server = http.createServer((req, res) => res.end('another application'));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = adminUrl(server.address().port);
    assert.equal(await probe(url), 'occupied');
    await assert.rejects(waitUntilReady(url, { exitCode: null }), /다른 프로그램/);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
test('Windows launcher waits for real server readiness and supports reuse', async () => {
  const reservation = http.createServer();
  await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const child = spawn(process.execPath, [path.join(__dirname, '../tools/ui-admin.js'), '--no-push'], {
    env: { ...process.env, UI_ADMIN_PORT: String(port) }, stdio: 'ignore'
  });
  const exited = new Promise((resolve) => child.once('exit', resolve));
  try {
    await waitUntilReady(adminUrl(port), child);
    assert.equal(await probe(adminUrl(port)), 'ready');
    assert.equal((await fetch(adminUrl(port) + 'api')).status, 200);
  } finally { child.kill(); await exited; }
  await assert.rejects(waitUntilReady(adminUrl(port), { exitCode: 1 }), /終了|종료/);
});
