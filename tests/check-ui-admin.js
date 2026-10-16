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
