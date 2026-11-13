const test = require('node:test');
const assert = require('node:assert/strict');
const { connectionPolicy, connectionScope, sshHostKeyRemovalCommand, createConnectionWatcher } = require('../src/rental-access.cjs');
const { normalizeServer } = require('../src/domain.cjs');
const { mergeVersionedUpdate } = require('../src/polling.cjs');
const rental = { id: 101, serverId: 1, status: 'ACTIVE', version: 2, desiredRevision: 1 };
const server = { id: 1, status: 'AVAILABLE', version: 1, reservationAllowed: false };
const open = { available: true, host: 'vm.example.invalid', port: 7540, username: 'r101' };

test('host key recovery targets the rental alias while older commands still target the shared endpoint', () => {
  const aliased = { ...open, sshCommand: 'ssh -o HostKeyAlias=allday-r101 -p 7540 student@vm.example.invalid' };
  assert.equal(sshHostKeyRemovalCommand(aliased), 'ssh-keygen -R "allday-r101"');
  assert.equal(sshHostKeyRemovalCommand({ ...aliased, sshCommand: aliased.sshCommand.replace('r101', 'r102') }), 'ssh-keygen -R "allday-r102"');
  assert.equal(sshHostKeyRemovalCommand({ ...open, sshCommand: 'ssh -p 7540 student@vm.example.invalid' }), 'ssh-keygen -R "[vm.example.invalid]:7540"');
  assert.equal(sshHostKeyRemovalCommand(null), '');
});

function harness(api = {}) {
  let visible = true; const listeners = new Set();
  const visibility = { isVisible: () => visible, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    set(value) { visible = value; for (const fn of listeners) fn(); } };
  const seen = { connection: null, password: null, loading: false, errors: [], timers: [], calls: [] };
  const watcher = createConnectionWatcher({ rentalId: rental.id,
    api: { connection: async id => { seen.calls.push(['connection', id]); return open; }, credential: async id => { seen.calls.push(['credential', id]); return { password: 'fixture-only' }; }, ...api },
    visibility, onConnection: value => { seen.connection = value; }, onPassword: value => { seen.password = value; },
    onLoadingPassword: value => { seen.loading = value; }, onError: error => seen.errors.push(error),
    schedule(callback, delay) { const timer = { callback, delay }; seen.timers.push(timer); return timer; },
    cancel(timer) { timer.cancelled = true; },
  });
  return { watcher, seen, visibility, listeners };
}

test('maintenance blocks connection data even while a rental remains ACTIVE; unknown/missing nodes fail closed', () => {
  assert.equal(connectionPolicy(rental, server).allowed, true);
  assert.equal(connectionPolicy({ ...rental, status: 'READY' }, server).allowed, true);
  assert.match(connectionPolicy(rental, { ...server, status: 'MAINTENANCE' }).reason, /점검/);
  for (const status of ['MAINTENANCE', 'QUARANTINED', 'UNKNOWN', undefined]) assert.equal(connectionPolicy(rental, { ...server, status }).allowed, false);
  assert.equal(connectionPolicy(rental, undefined).allowed, false);
  assert.equal(connectionPolicy(rental, { ...server, id: 2 }).allowed, false);
  for (const status of ['RESERVED', 'RETAINED', 'PROVISIONING', 'RETURNING', 'RETURNED', 'CANCELLED']) assert.equal(connectionPolicy({ ...rental, status }, server).allowed, false);
});

test('maintenance release, node/rental version and contract changes require a new connection verification scope', () => {
  const original = connectionScope(rental, server);
  for (const node of [{ ...server, status: 'MAINTENANCE' }, { ...server, version: 3 }]) assert.notEqual(connectionScope(rental, node), original);
  for (const value of [{ ...rental, id: 102 }, { ...rental, version: 4 }, { ...rental, status: 'RETURNING' }, { ...rental, desiredRevision: 2 }]) assert.notEqual(connectionScope(value, server), original);
  assert.equal(connectionPolicy({ ...rental, status: 'RETURNED' }, { ...server, version: 3 }).allowed, false);
});

test('password cannot be requested before a fresh available response or when the API denies access', async () => {
  let available = false;
  const { watcher, seen } = harness({ connection: async () => available ? open : { available: false, reason: 'OUTSIDE_SLOT' } });
  await watcher.revealPassword(); assert.equal(seen.calls.length, 0);
  await watcher.refresh(); await watcher.revealPassword(); assert.equal(seen.password, null);
  available = true; await watcher.refresh(); await watcher.revealPassword();
  assert.equal(seen.password, 'fixture-only'); assert.deepEqual(seen.calls, [['credential', 101]]); watcher.stop();
});

test('late credentials are ignored after maintenance/return replaces or unmounts the view', async () => {
  let resolve; const { watcher, seen } = harness({ credential: () => new Promise(done => { resolve = done; }) });
  await watcher.refresh(); const pending = watcher.revealPassword(); assert.equal(seen.loading, true);
  watcher.stop(); resolve({ password: 'MUST_NOT_REAPPEAR' }); await pending;
  assert.equal(seen.password, null);
});

test('hiding a password cancels a pending reveal and duplicate clicks make only one credential request', async () => {
  let resolve; let calls = 0;
  const { watcher, seen } = harness({ credential: () => { calls++; return new Promise(done => { resolve = done; }); } });
  await watcher.refresh(); const pending = watcher.revealPassword(); await watcher.revealPassword(); assert.equal(calls, 1);
  watcher.hidePassword(); resolve({ password: 'MUST_NOT_REAPPEAR' }); await pending;
  assert.equal(seen.password, null); assert.equal(seen.loading, false); watcher.stop();
});

test('a denied connection check clears a visible password and invalidates a delayed credential response', async () => {
  let available = true; let resolve;
  const { watcher, seen } = harness({ connection: async () => available ? open : { available: false, reason: 'MAINTENANCE' } });
  await watcher.refresh(); await watcher.revealPassword(); assert.equal(seen.password, 'fixture-only');
  available = false; await watcher.refresh(); assert.equal(seen.password, null); assert.equal(seen.connection.available, false); watcher.stop();
  const delayed = harness({ connection: async () => available ? open : { available: false, reason: 'RETURNING' }, credential: () => new Promise(done => { resolve = done; }) });
  available = true; await delayed.watcher.refresh(); const pending = delayed.watcher.revealPassword();
  available = false; await delayed.watcher.refresh(); resolve({ password: 'MUST_NOT_REAPPEAR' }); await pending;
  assert.equal(delayed.seen.password, null); delayed.watcher.stop();
});

test('hiding the browser tab forgets sensitive data; returning revalidates and never restores a password automatically', async () => {
  const { watcher, seen, visibility, listeners } = harness();
  await watcher.refresh(); await watcher.revealPassword(); visibility.set(false);
  assert.equal(seen.password, null); assert.equal(seen.connection, null);
  const count = seen.calls.length; await watcher.revealPassword(); assert.equal(seen.calls.length, count);
  visibility.set(true); await watcher.refresh(); assert.equal(seen.connection.available, true); assert.equal(seen.password, null);
  watcher.stop(); assert.equal(listeners.size, 0);
});

test('malformed responses and network failures clear rather than preserve usable connection information', async () => {
  let value = open; let fail = false;
  const { watcher, seen } = harness({ connection: async () => { if (fail) throw new Error('offline'); return value; } });
  await watcher.refresh(); await watcher.revealPassword(); value = {}; await watcher.refresh();
  assert.equal(seen.connection, null); assert.equal(seen.password, null); assert.match(seen.errors.at(-1).message, /확인/);
  value = open; await watcher.refresh(); await watcher.revealPassword(); fail = true; await watcher.refresh();
  assert.equal(seen.connection, null); assert.equal(seen.password, null); watcher.stop();
});

test('a stale server list cannot undo a newer maintenance status or allow booking a blocked server', () => {
  const maintained = { ...server, status: 'MAINTENANCE', version: 3 };
  assert.equal(mergeVersionedUpdate(maintained, server), maintained);
  for (const status of ['MAINTENANCE', 'QUARANTINED', 'UNKNOWN']) assert.equal(normalizeServer({ ...server, status, reservationAllowed: true }).reservationAllowed, false);
  assert.equal(normalizeServer({ ...server, reservationAllowed: true }).reservationAllowed, true);
});
