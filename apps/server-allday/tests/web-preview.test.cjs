const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { once } = require('node:events');
const { gunzipSync } = require('node:zlib');
const { createPreviewServer } = require('../scripts/preview.cjs');

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'allday-preview-'));
  const scriptName = 'index-0123456789abcdef0123456789abcdef.js';
  const script = 'window.previewCheck = "compressed asset";\n'.repeat(200);
  await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><div id="root">startup</div>');
  await fs.writeFile(path.join(root, scriptName), script);
  await fs.writeFile(path.join(root, 'font.woff2'), 'test font bytes');
  const server = createPreviewServer({ root });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(root, { recursive: true, force: true }); });
  const get = (name, headers = {}, method = 'GET') => new Promise((resolve, reject) => {
    const request = http.request({ hostname: '127.0.0.1', port: server.address().port, path: name, headers, method }, response => {
      const parts = [];
      response.on('data', part => parts.push(part));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(parts) }));
      response.on('error', reject);
    });
    request.on('error', reject); request.end();
  });
  return { get, root, scriptName, script };
}

test('production JavaScript is gzip compressed and content-hashed assets can be cached', async t => {
  const { get, scriptName, script } = await fixture(t);
  const zipped = await get('/' + scriptName, { 'Accept-Encoding': 'gzip, deflate' });
  assert.equal(zipped.status, 200);
  assert.equal(zipped.headers['content-encoding'], 'gzip');
  assert.match(zipped.headers['cache-control'], /max-age=31536000, immutable/);
  assert.equal(zipped.headers.vary, 'Accept-Encoding');
  assert.equal(gunzipSync(zipped.body).toString(), script);
  assert.ok(zipped.body.length < Buffer.byteLength(script) / 2);
  const plain = await get('/' + scriptName, { 'Accept-Encoding': 'gzip;q=0, *;q=1' });
  assert.equal(plain.headers['content-encoding'], undefined);
  assert.equal(plain.body.toString(), script);
  assert.notEqual(plain.headers.etag, zipped.headers.etag);
  const unchanged = await get('/' + scriptName, { 'Accept-Encoding': 'gzip', 'If-None-Match': zipped.headers.etag });
  assert.equal(unchanged.status, 304); assert.equal(unchanged.body.length, 0);
  const head = await get('/' + scriptName, { 'Accept-Encoding': 'gzip' }, 'HEAD');
  assert.equal(head.body.length, 0); assert.equal(Number(head.headers['content-length']), zipped.body.length);
});

test('HTML and fonts revalidate, and rebuilding at the same URL does not serve stale content', async t => {
  const { get, root } = await fixture(t);
  const html = await get('/');
  assert.equal(html.headers['cache-control'], 'no-cache');
  assert.equal((await get('/', { 'If-None-Match': html.headers.etag })).status, 304);
  const font = await get('/font.woff2');
  assert.equal(font.headers['content-type'], 'font/woff2');
  assert.equal(font.headers['cache-control'], 'public, max-age=0, must-revalidate');
  assert.equal((await get('/font.woff2', { 'If-None-Match': font.headers.etag })).status, 304);
  await fs.writeFile(path.join(root, 'index.html'), '<!doctype html><div id="root">new deployment</div>');
  const updated = await get('/', { 'If-None-Match': html.headers.etag });
  assert.equal(updated.status, 200); assert.match(updated.body.toString(), /new deployment/);
  assert.notEqual(updated.headers.etag, html.headers.etag);
});

test('missing scripts and API paths return errors, while client routes retain the SPA fallback', async t => {
  const { get } = await fixture(t);
  assert.equal((await get('/missing.js')).status, 404);
  const api = await get('/api/v1/servers');
  assert.equal(api.status, 404); assert.equal(api.headers['cache-control'], 'no-store');
  assert.equal((await get('/%2e%2e%2foutside.txt')).status, 403);
  assert.equal((await get('/%zz')).status, 400);
  assert.equal((await get('/', {}, 'POST')).status, 405);
  const route = await get('/my-rentals');
  assert.equal(route.status, 200); assert.match(route.body.toString(), /startup/);
});
