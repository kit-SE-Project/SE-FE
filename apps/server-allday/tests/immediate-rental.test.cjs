const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { canRentNow, runImmediateRental } = require('../src/immediate-rental.cjs');
const { normalizeRental } = require('../src/domain.cjs');

const rental = { id: 103, serverId: 57, memberId: 2002, version: 3, desiredRevision: 0, status: 'RESERVED' };
const job = (type, status, extra = {}) => ({ id: 1, type, status, desiredRevision: 0, ...extra });
const detail = (status, version, jobs = []) => ({ ...rental, status, version, jobs });
function harness(states, overrides = {}) {
  let index = 0; const writes = []; const updates = []; const stages = [];
  const api = {
    detail: async id => { assert.equal(id, rental.id); return states[Math.min(index++, states.length - 1)]; },
    prepareNow: async (...args) => { writes.push(['prepareNow', ...args]); },
    startNow: async (...args) => { writes.push(['startNow', ...args]); },
    ...overrides,
  };
  let sequence = 0;
  const options = { api, rental, reason: ' 발표 시연 ', attempt: {}, requestKey: () => `key-${++sequence}`,
    onDetail: value => updates.push(value), onStage: value => stages.push(value), pause: async () => {} };
  return { options, writes, updates, stages };
}

test('only identified pending/preparing/ready reservations can be selected', () => {
  for (const status of ['RESERVED', 'PROVISIONING', 'READY']) assert.equal(canRentNow({ ...rental, status }), true);
  for (const status of ['ACTIVE', 'RETAINED', 'RETURNING', 'RETURNED', 'CANCELLED', 'UNKNOWN']) assert.equal(canRentNow({ ...rental, status }), false);
  for (const field of ['id', 'serverId', 'memberId', 'version']) assert.equal(canRentNow({ ...rental, [field]: undefined }), false);
});

test('starting tomorrow\'s reservation today replaces dates cached by a prior list normalization', () => {
  const reserved = normalizeRental({ ...rental, contractStart: '2026-11-04T07:00:00Z', contractEnd: '2026-11-04T14:00:00Z' }, []);
  assert.equal(reserved.from, '2026-11-04');
  const active = normalizeRental({ ...reserved, status: 'ACTIVE', contractStart: '2026-11-03T08:00:00Z' }, []);
  assert.equal(active.from, '2026-11-03'); assert.equal(active.to, '2026-11-04');
});

test('one action prepares, waits for readiness, starts with the new version and waits for ACTIVE', async () => {
  const h = harness([
    detail('RESERVED', 3, [job('PREPARE', 'PENDING')]),
    detail('PROVISIONING', 5, [job('PREPARE', 'RUNNING')]),
    detail('READY', 7, [job('PREPARE', 'SUCCEEDED')]), // lifecycle has not created START yet
    detail('READY', 7, [job('PREPARE', 'SUCCEEDED'), job('START', 'PENDING')]),
    detail('READY', 8, [job('START', 'RUNNING')]),
    detail('ACTIVE', 9, [job('START', 'SUCCEEDED')]),
  ]);
  const result = await runImmediateRental(h.options);
  assert.equal(result.status, 'ACTIVE');
  assert.deepEqual(h.writes.map(([method, input, reason, key]) => [method, input.id, input.serverId, input.memberId, input.version, reason, key]), [
    ['prepareNow', 103, 57, 2002, 3, '발표 시연', 'key-1'],
    ['startNow', 103, 57, 2002, 7, '발표 시연', 'key-2'],
  ]);
  assert.equal(h.updates.length, 6); assert.equal(h.stages.at(-1), 'active');
  assert.equal(rental.version, 3); assert.equal(rental.status, 'RESERVED');
});

test('joining existing preparation does not request duplicate VM creation', async () => {
  const h = harness([
    detail('PROVISIONING', 5, [job('PREPARE', 'RUNNING')]),
    detail('READY', 7, [job('START', 'PENDING')]), detail('ACTIVE', 9),
  ]);
  await runImmediateRental(h.options);
  assert.deepEqual(h.writes.map(write => write[0]), ['startNow']);
});

test('already active after a race succeeds without issuing either mutation', async () => {
  const h = harness([detail('ACTIVE', 9)]);
  await runImmediateRental(h.options); assert.deepEqual(h.writes, []);
});

test('a first slot already due waits for scheduled execution instead of repeating an early-start request', async () => {
  const h = harness([
    { ...detail('RESERVED', 3), contractStart: '2026-11-03T00:00:00Z' },
    { ...detail('READY', 7, [job('START', 'PENDING')]), contractStart: '2026-11-03T00:00:00Z' },
    detail('ACTIVE', 9),
  ]);
  await runImmediateRental({ ...h.options, now: () => Date.parse('2026-11-03T00:00:10Z') });
  assert.deepEqual(h.writes, []);
});

test('stale ownership, revision changes, closed states and failed jobs never trigger a start', async () => {
  for (const state of [
    { ...detail('READY', 7), memberId: 9001 }, { ...detail('READY', 7), serverId: 58 },
    { ...detail('READY', 7), desiredRevision: 1 }, detail('RETURNING', 8),
    detail('READY', 7, [job('PREPARE', 'FAILED', { reasonCode: 'GUEST_NOT_READY' })]),
    { ...detail('READY', 7), jobs: null },
  ]) {
    const h = harness([state]); await assert.rejects(runImmediateRental(h.options)); assert.deepEqual(h.writes, []);
  }
});

test('a preparation failure after acceptance stops the chain and reports the backend reason', async () => {
  const h = harness([detail('RESERVED', 3), detail('PROVISIONING', 5, [job('PREPARE', 'FAILED', { reasonCode: 'CLONE_FAILED' })])]);
  await assert.rejects(runImmediateRental(h.options), /CLONE_FAILED/);
  assert.deepEqual(h.writes.map(write => write[0]), ['prepareNow']);
});

test('retry after a lost prepare response preserves the exact original body and idempotency key', async () => {
  const seen = []; let failed = false;
  const h = harness([detail('RESERVED', 3), detail('PROVISIONING', 5), detail('READY', 7, [job('START', 'PENDING')]), detail('ACTIVE', 9)], {
    prepareNow: async (...args) => { seen.push(args); if (!failed) { failed = true; throw new Error('응답 끊김'); } },
  });
  await assert.rejects(runImmediateRental(h.options), /응답 끊김/);
  await runImmediateRental(h.options);
  assert.equal(seen.length, 2); assert.deepEqual(seen[0], seen[1]); assert.equal(seen[1][0].version, 3);
  assert.deepEqual(h.writes.map(write => write[0]), ['startNow']);
});

test('retry after a lost start response reuses the first version and does not advance the start twice', async () => {
  const seen = []; let failed = false;
  const h = harness([detail('READY', 7, [job('START', 'PENDING')]), detail('READY', 8, [job('START', 'RUNNING')]), detail('ACTIVE', 9)], {
    startNow: async (...args) => { seen.push(args); if (!failed) { failed = true; throw new Error('응답 끊김'); } },
  });
  await assert.rejects(runImmediateRental(h.options), /응답 끊김/);
  await runImmediateRental(h.options);
  assert.equal(seen.length, 2); assert.deepEqual(seen[0], seen[1]); assert.equal(seen[1][0].version, 7);
});

test('a definite version rejection allows a manual retry using newly fetched state', async () => {
  const seen = []; let failed = false;
  const h = harness([detail('READY', 7, [job('START', 'PENDING')]), detail('READY', 8, [job('START', 'PENDING')]), detail('ACTIVE', 9)], {
    startNow: async (...args) => { seen.push(args); if (!failed) { failed = true; const error = new Error('버전 충돌'); error.status = 409; throw error; } },
  });
  await assert.rejects(runImmediateRental(h.options), /버전 충돌/);
  await runImmediateRental(h.options);
  assert.equal(seen[0][0].version, 7); assert.equal(seen[1][0].version, 8); assert.notEqual(seen[0][2], seen[1][2]);
});

test('unmount/session cancellation while fetching detail prevents late auto-starts and UI updates', async () => {
  const controller = new AbortController();
  const h = harness([], { detail: async () => { controller.abort(); return detail('READY', 7, [job('START', 'PENDING')]); } });
  await assert.rejects(runImmediateRental({ ...h.options, signal: controller.signal }), { name: 'AbortError' });
  assert.deepEqual(h.writes, []); assert.deepEqual(h.updates, []);
});

test('long preparation times out without treating an accepted request as completed rental', async () => {
  let elapsed = 0; const h = harness([detail('PROVISIONING', 5)]);
  await assert.rejects(runImmediateRental({ ...h.options, timeoutMs: 5000, now: () => elapsed, pause: async ms => { elapsed += ms; } }), /시간이 초과/);
  assert.deepEqual(h.writes, []); assert.notEqual(h.stages.at(-1), 'active');
});

test('the two admin APIs send the chosen rental, server, owner, version, reason and independent keys', async () => {
  const source = await fs.readFile(path.join(__dirname, '../src/api.js'), 'utf8');
  const { createApi } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const previous = global.fetch; const writes = [];
  const response = value => new Response(JSON.stringify(value), { status: 200 });
  try {
    global.fetch = async (url, options) => {
      if (url.endsWith('/formLogin')) return response({ accessToken: 'test-admin-access', refreshToken: 'test-admin-refresh' });
      if (url.endsWith('/me')) return response({ memberId: 9001, role: 'ADMIN' });
      writes.push({ url, options }); return response({ id: rental.id, status: 'READY' });
    };
    const api = createApi('http://contract.invalid'); await api.login('test-admin', 'test-password');
    await api.prepareNow(rental, '시연', 'prepare-key');
    await api.startNow({ ...rental, version: 7 }, '시연', 'start-key');
    for (let index = 0; index < 2; index++) {
      const { url, options } = writes[index];
      assert.equal(new URL(url).pathname, `/api/v1/admin/rentals/103/${index ? 'start-now' : 'prepare-now'}`);
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.Authorization, 'Bearer test-admin-access');
      assert.equal(options.headers['Idempotency-Key'], index ? 'start-key' : 'prepare-key');
      assert.deepEqual(JSON.parse(options.body), { expectedVersion: index ? 7 : 3, serverId: 57, memberId: 2002, reason: '시연' });
    }
  } finally { global.fetch = previous; }
});
