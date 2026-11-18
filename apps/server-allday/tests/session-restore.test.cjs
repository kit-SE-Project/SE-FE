const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
async function moduleUnderTest() {
  const source = await fs.readFile(path.join(__dirname, '../src/api.js'), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const actor = { memberId: 1001, role: 'STUDENT', authorities: ['ROLE_USER'], rentalEligible: true };
const pair = number => ({ accessToken: `test-access-${number}`, refreshToken: `test-refresh-${number}` });
const reply = (status, value) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
function storageMemory() {
  const values = new Map(); const writes = [];
  return { values, writes, getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); writes.push(value); }, removeItem: key => values.delete(key) };
}
const loginFetch = async url => reply(200, url.endsWith('/formLogin') ? pair(1) : url.endsWith('/me') ? actor : []);

test('verified login saves only the API URL, refresh token and ownership marker, never password/profile/access token', async () => {
  const { openBackendSession, createWebSessionStore } = await moduleUnderTest();
  const memory = storageMemory(); const store = createWebSessionStore(memory); const old = global.fetch;
  try {
    global.fetch = loginFetch;
    const session = await openBackendSession({ url: 'http://contract.invalid/', username: 'private-user', password: 'private-password', sessionStore: store });
    assert.equal(session.persistent, true); assert.equal(session.url, 'http://contract.invalid');
    const record = store.read(); assert.deepEqual(Object.keys(record).sort(), ['baseUrl', 'refreshToken', 'sessionId', 'version']);
    assert.equal(record.refreshToken, pair(1).refreshToken);
    for (const value of memory.writes) for (const secret of ['test-access-1', 'private-user', 'private-password', 'memberId', 'authorities']) assert.equal(value.includes(secret), false);
    session.client.dispose(); assert.equal(store.read(), null);
  } finally { global.fetch = old; }
});

test('reload refreshes first, persists the rotated token, then revalidates identity/permissions and loads servers', async () => {
  const { openBackendSession, restoreBackendSession, createWebSessionStore } = await moduleUnderTest();
  const store = createWebSessionStore(storageMemory()); const old = global.fetch; const calls = [];
  try {
    global.fetch = loginFetch;
    await openBackendSession({ url: 'http://contract.invalid', username: 'user', password: 'password', sessionStore: store });
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith('/refresh')) { assert.deepEqual(JSON.parse(options.body), { refreshToken: 'test-refresh-1' }); return reply(200, pair(2)); }
      assert.equal(options.headers.Authorization, 'Bearer test-access-2');
      return reply(200, url.endsWith('/me') ? { ...actor, rentalEligible: false } : []);
    };
    const restored = await restoreBackendSession({ sessionStore: store });
    assert.deepEqual(calls.map(value => new URL(value.url).pathname), ['/refresh', '/api/v1/me', '/api/v1/servers']);
    assert.equal(restored.actor.rentalEligible, false); assert.equal(restored.actor.role, 'USER');
    assert.equal(store.read().refreshToken, 'test-refresh-2');
    restored.client.dispose();
  } finally { global.fetch = old; }
});

test('duplicate restore effects share one refresh operation instead of reusing a rotating refresh token', async () => {
  const { openBackendSession, restoreBackendSession, createWebSessionStore } = await moduleUnderTest();
  const store = createWebSessionStore(storageMemory()); const old = global.fetch; let finish; let count = 0;
  try {
    global.fetch = loginFetch;
    await openBackendSession({ url: 'http://contract.invalid', username: 'user', password: 'password', sessionStore: store });
    global.fetch = async url => url.endsWith('/refresh') ? (count++, new Promise(resolve => { finish = () => resolve(reply(200, pair(2))); })) : reply(200, url.endsWith('/me') ? actor : []);
    const first = restoreBackendSession({ sessionStore: store }); const second = restoreBackendSession({ sessionStore: store });
    assert.equal(first, second); assert.equal(count, 1); finish();
    const [a, b] = await Promise.all([first, second]); assert.equal(a.client, b.client); a.client.dispose();
  } finally { global.fetch = old; }
});

test('expired/revoked tokens and invalid server identity clear stored login without trusting cached roles', async () => {
  const { openBackendSession, restoreBackendSession, createWebSessionStore } = await moduleUnderTest(); const old = global.fetch;
  try {
    for (const invalid of ['expired', 'forbidden', 'identity']) {
      const store = createWebSessionStore(storageMemory());
      global.fetch = loginFetch;
      await openBackendSession({ url: 'http://contract.invalid', username: 'user', password: 'password', sessionStore: store });
      global.fetch = async url => invalid === 'identity' ? reply(200, url.endsWith('/refresh') ? pair(2) : { ...actor, role: 'SUPER_ADMIN' }) : reply(invalid === 'expired' ? 401 : 403, { code: 'INVALID_OR_EXPIRED_TOKEN' });
      await assert.rejects(restoreBackendSession({ sessionStore: store })); assert.equal(store.read(), null);
    }
  } finally { global.fetch = old; }
});

test('temporary network failure preserves the latest rotated refresh token for an explicit retry', async () => {
  const { openBackendSession, restoreBackendSession, createWebSessionStore } = await moduleUnderTest();
  const store = createWebSessionStore(storageMemory()); const old = global.fetch;
  try {
    global.fetch = loginFetch;
    await openBackendSession({ url: 'http://contract.invalid', username: 'user', password: 'password', sessionStore: store });
    global.fetch = async url => url.endsWith('/refresh') ? reply(200, pair(2)) : reply(503, { code: 'UNAVAILABLE' });
    await assert.rejects(restoreBackendSession({ sessionStore: store }), error => error.status === 503);
    assert.equal(store.read().refreshToken, 'test-refresh-2');
    global.fetch = async (url, options) => {
      if (url.endsWith('/refresh')) { assert.deepEqual(JSON.parse(options.body), { refreshToken: 'test-refresh-2' }); return reply(200, pair(3)); }
      return reply(200, url.endsWith('/me') ? actor : []);
    };
    const restored = await restoreBackendSession({ sessionStore: store }); assert.equal(restored.persistent, true); restored.client.dispose();
  } finally { global.fetch = old; }
});

test('logout removes the tab session even if the logout API is unreachable', async () => {
  const { openBackendSession, restoreBackendSession, createWebSessionStore } = await moduleUnderTest();
  const store = createWebSessionStore(storageMemory()); const old = global.fetch;
  try {
    global.fetch = loginFetch;
    const session = await openBackendSession({ url: 'http://contract.invalid', username: 'user', password: 'password', sessionStore: store });
    global.fetch = async () => { throw new TypeError('offline'); };
    await assert.rejects(session.client.logout()); assert.equal(store.read(), null);
    assert.equal(await restoreBackendSession({ sessionStore: store }), null);
  } finally { global.fetch = old; }
});

test('a late refresh or logout from a previous account cannot overwrite or remove the newly logged-in session', async () => {
  const { openBackendSession, createWebSessionStore } = await moduleUnderTest();
  const store = createWebSessionStore(storageMemory()); const old = global.fetch;
  try {
    global.fetch = loginFetch;
    const first = await openBackendSession({ url: 'http://contract.invalid', username: 'first', password: 'password', sessionStore: store });
    global.fetch = async url => reply(200, url.endsWith('/formLogin') ? pair(2) : url.endsWith('/me') ? { ...actor, memberId: 1002 } : []);
    const second = await openBackendSession({ url: 'http://contract.invalid', username: 'second', password: 'password', sessionStore: store });
    const currentId = store.read().sessionId;
    global.fetch = async url => reply(200, url.endsWith('/refresh') ? pair(3) : { loggedOut: true });
    await first.client.refresh(); assert.equal(store.read().sessionId, currentId); assert.equal(store.read().refreshToken, 'test-refresh-2');
    await first.client.logout(); assert.equal(store.read().sessionId, currentId);
    second.client.dispose();
  } finally { global.fetch = old; }
});

test('corrupt or unsafe storage records are deleted before any HTTP call and blocked storage degrades to memory', async () => {
  const { openBackendSession, restoreBackendSession, createWebSessionStore, WEB_SESSION_KEY } = await moduleUnderTest(); const old = global.fetch;
  try {
    const memory = storageMemory(); const store = createWebSessionStore(memory);
    const record = { version: 1, sessionId: 'safe-id', baseUrl: 'http://contract.invalid', refreshToken: 'test-refresh-1' };
    for (const value of ['bad json', JSON.stringify({ ...record, baseUrl: 'file:///private' }), JSON.stringify({ ...record, password: 'must-not-store' }), JSON.stringify({ ...record, baseUrl: 'https://user:password@example.test' })]) {
      memory.setItem(WEB_SESSION_KEY, value);
      global.fetch = async () => { throw new Error('HTTP must not run'); };
      assert.equal(await restoreBackendSession({ sessionStore: store }), null); assert.equal(memory.values.size, 0);
    }
    const blocked = createWebSessionStore({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } });
    global.fetch = loginFetch;
    const session = await openBackendSession({ url: 'http://contract.invalid', username: 'user', password: 'password', sessionStore: blocked });
    assert.equal(session.persistent, false); assert.match(session.storageWarning, /저장소/); assert.equal((await session.client.me()).memberId, 1001); session.client.dispose();
  } finally { global.fetch = old; }
});
