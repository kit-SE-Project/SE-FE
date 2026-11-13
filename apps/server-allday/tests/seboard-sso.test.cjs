const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

async function apiModule() {
  const source = await fs.readFile(path.join(__dirname, '../src/api.js'), 'utf8');
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}

const origin = 'https://rental.example';
const profile = { memberId: 83, role: 'ADMIN', authorities: ['ROLE_ADMIN'], rentalEligible: true };
const response = (status, body) => new Response(status === 204 ? null : JSON.stringify(body), { status });

test('SSO restores and mutates with the AllDay cookie, then logs out without a bearer token', async () => {
  const { restoreSsoSession } = await apiModule();
  const old = global.fetch;
  const calls = [];
  try {
    global.fetch = async (url, options) => {
      calls.push([new URL(url).pathname, options]);
      if (url.endsWith('/me')) return response(200, profile);
      if (url.endsWith('/sso/profile')) return response(200, { memberId: 83, nickname: '관리자' });
      if (url.endsWith('/logout')) return response(204);
      return response(200, []);
    };
    const { client, actor } = await restoreSsoSession({ origin });
    assert.equal(actor.role, 'ADMIN');
    assert.equal((await client.profile()).nickname, '관리자');
    await client.createCategory({ name: 'GPU' }, 'category-key');
    await client.logout();
    await assert.rejects(client.me(), { status: 401 });
    assert.deepEqual(calls.map(([route, req]) => [route, req.method]), [
      ['/api/v1/me', 'GET'], ['/api/v1/servers', 'GET'], ['/api/v1/sso/profile', 'GET'],
      ['/api/v1/admin/categories', 'POST'], ['/api/v1/sso/logout', 'POST'],
    ]);
    assert.ok(calls.every(([, req]) => req.credentials === 'same-origin' && !req.headers.Authorization));
    assert.equal(calls[3][1].headers['Idempotency-Key'], 'category-key');
  } finally {
    global.fetch = old;
  }
});

test('SSO treats a fresh visit as signed out and signals an expired active session once', async () => {
  const { restoreSsoSession } = await apiModule();
  const old = global.fetch;
  let expired = 0;
  const onSessionExpired = () => { expired++; };
  try {
    global.fetch = async () => response(401, {});
    assert.equal(await restoreSsoSession({ origin, onSessionExpired }), null);
    assert.equal(expired, 0);
    global.fetch = async url => response(200, url.endsWith('/me') ? profile : []);
    const { client } = await restoreSsoSession({ origin, onSessionExpired });
    global.fetch = async () => response(401, {});
    const results = await Promise.allSettled([client.me(), client.categories()]);
    assert.ok(results.every(result => result.status === 'rejected' && result.reason.status === 401));
    assert.equal(expired, 1);
  } finally {
    global.fetch = old;
  }
});
