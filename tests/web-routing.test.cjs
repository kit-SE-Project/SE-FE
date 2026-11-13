const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createWebPreview, callbackLocation } = require('../scripts/preview-web.cjs');
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`)));
const close = server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });

test('the integrated site separates board, rental, portal and missing assets on refresh', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'se-web-routing-'));
  const boardRoot = path.join(directory, 'board'); const alldayRoot = path.join(directory, 'rental');
  fs.mkdirSync(boardRoot); fs.mkdirSync(alldayRoot); fs.writeFileSync(path.join(boardRoot, 'index.html'), 'BOARD'); fs.writeFileSync(path.join(alldayRoot, 'index.html'), 'RENTAL');
  const server = createWebPreview({ boardRoot, alldayRoot }); const origin = await listen(server);
  try {
    for (const [route, body] of [['/', 'BOARD'], ['/notice/42', 'BOARD'], ['/allday/', 'RENTAL'], ['/allday/mine', 'RENTAL'], ['/allday/sso', 'BOARD']]) {
      const response = await fetch(origin + route); assert.equal(response.status, 200); assert.equal(await response.text(), body);
    }
    for (const route of ['/allday/_expo/missing.js', '/allday/assets/missing.woff2', '/allday/_expo/unknown', '/api/internal/leases']) assert.equal((await fetch(origin + route)).status, 404);
    const redirect = await fetch(origin + '/allday?view=mine', { redirect: 'manual' }); assert.equal(redirect.headers.get('location'), '/allday/?view=mine');
    assert.equal((await fetch(origin + '/allday/sso/', { redirect: 'manual' })).headers.get('location'), '/allday/sso');
  } finally {
    await close(server);
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('se-web-routing-'));
    fs.rmSync(directory, { recursive: true });
  }
});

test('API proxy keeps cookie, origin, JSON, method and idempotency key; 204 preserves cookies', async () => {
  let observed;
  const backend = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    observed = { url: req.url, method: req.method, headers: req.headers, body };
    res.writeHead(204, { 'Set-Cookie': ['allday_session=; Path=/; Max-Age=0; HttpOnly', 'allday_flow=; Path=/; Max-Age=0; HttpOnly'] }).end();
  });
  const upstream = await listen(backend); const server = createWebPreview({ upstream }); const origin = await listen(server);
  try {
    const response = await fetch(origin + '/api/v1/admin/categories/42', { method: 'DELETE', headers: { Cookie: 'allday_session=test-only-cookie', Origin: origin, 'Content-Type': 'application/json', 'Idempotency-Key': 'test-delete' }, body: JSON.stringify({ expectedVersion: 3 }) });
    assert.equal(response.status, 204); assert.equal(await response.text(), ''); assert.equal(response.headers.getSetCookie().length, 2);
    assert.equal(observed.url, '/api/v1/admin/categories/42'); assert.equal(observed.method, 'DELETE');
    assert.equal(observed.headers.cookie, 'allday_session=test-only-cookie'); assert.equal(observed.headers.origin, origin); assert.equal(observed.headers['idempotency-key'], 'test-delete');
    assert.deepEqual(JSON.parse(observed.body), { expectedVersion: 3 }); assert.equal(observed.headers.authorization, undefined);
  } finally { await close(server); await close(backend); }
});

test('only the legacy callback root redirects are remapped to the rental web path', () => {
  for (const origin of ['', 'https://board.example']) {
    assert.equal(callbackLocation(origin + '/'), '/allday/');
    for (const status of ['expired', 'unavailable']) assert.equal(callbackLocation(origin + '/?sso=' + status), '/allday/?sso=' + status);
  }
  for (const location of ['https://board.example/allday/', '/api/v1/sso/start', '/?unrelated=1']) assert.equal(callbackLocation(location), location);
});

test('an unavailable real backend returns 503 rather than a signed-in or HTML fallback', async () => {
  const unavailable = http.createServer(); const upstream = await listen(unavailable); await close(unavailable);
  const server = createWebPreview({ upstream }); const origin = await listen(server);
  try { const response = await fetch(origin + '/api/v1/me'); assert.equal(response.status, 503); assert.equal((await response.json()).code, 'API_UNAVAILABLE'); }
  finally { await close(server); }
});
