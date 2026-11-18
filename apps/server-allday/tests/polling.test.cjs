const test = require('node:test');
const assert = require('node:assert/strict');
const { createVisiblePoller, mergeRentalUpdate } = require('../src/polling.cjs');
const { createRentalTracker, rentalPollDelay } = require('../src/rental-tracking.cjs');
const { normalizeRental } = require('../src/domain.cjs');
const contract = require('./contracts/public-api.json');

function visibility(initial = true) {
  let visible = initial; const listeners = new Set();
  return { isVisible: () => visible, subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    set(value) { visible = value; for (const fn of listeners) fn(); }, listeners };
}
function timers() {
  const values = [];
  return { values, schedule(callback, delay) { const timer = { callback, delay }; values.push(timer); return timer; },
    cancel(timer) { timer.cancelled = true; } };
}
const rental = (status = 'RESERVED', jobs = []) => ({ id: 101, status, desiredRevision: 2, version: 3, jobs });
const running = { id: 4, type: 'START', status: 'RUNNING', step: 'STARTING', retryCount: 0, desiredRevision: 2 };

test('hidden pages send no automatic requests; returning refreshes immediately and removes listeners on stop', async () => {
  const visible = visibility(false); const clock = timers(); let calls = 0;
  const poller = createVisiblePoller({ task: async () => ++calls, visibility: visible, ...clock });
  await poller.refresh(); assert.equal(calls, 0); assert.equal(clock.values.length, 0);
  visible.set(true); await poller.refresh(); assert.equal(calls, 1); assert.equal(clock.values.at(-1).delay, 15000);
  visible.set(false); assert.equal(clock.values.at(-1).cancelled, true);
  await clock.values.at(-1).callback(); assert.equal(calls, 1);
  visible.set(true); await poller.refresh(); assert.equal(calls, 2);
  poller.stop(); assert.equal(visible.listeners.size, 0); visible.set(true); await poller.refresh(); assert.equal(calls, 2);
});

test('slow list/connection requests never overlap, even through hide/show; stopped views ignore late results', async () => {
  const visible = visibility(); const clock = timers(); let release; let calls = 0; const seen = [];
  const poller = createVisiblePoller({ task: () => { calls++; return new Promise(resolve => { release = resolve; }); },
    onValue: value => seen.push(value), visibility: visible, ...clock });
  const first = poller.refresh(); assert.equal(first, poller.refresh()); await Promise.resolve();
  visible.set(false); visible.set(true); assert.equal(first, poller.refresh()); assert.equal(calls, 1);
  poller.stop(); release('late'); await first; assert.deepEqual(seen, []); assert.equal(clock.values.length, 0);
});

test('background failure backs off to sixty seconds and successful recovery restores the normal interval', async () => {
  const clock = timers(); let fail = true; const errors = [];
  const poller = createVisiblePoller({ task: async () => { if (fail) throw new Error('offline'); return 'ok'; },
    onError: error => errors.push(error.message), ...clock });
  await poller.refresh(); assert.equal(clock.values.at(-1).delay, 30000);
  await poller.refresh(); assert.equal(clock.values.at(-1).delay, 60000);
  await poller.refresh(); assert.equal(clock.values.at(-1).delay, 60000);
  fail = false; await poller.refresh(); assert.equal(clock.values.at(-1).delay, 15000);
  assert.equal(errors.length, 3); poller.stop();
});

test('detail polling is fast only during preparation, return or a current running job, not future scheduled jobs', () => {
  for (const status of ['RESERVED', 'RETAINED']) assert.equal(rentalPollDelay(rental(status)), 30000);
  for (const status of ['PROVISIONING', 'RETURNING']) assert.equal(rentalPollDelay(rental(status)), 2000);
  for (const status of ['READY', 'ACTIVE']) assert.equal(rentalPollDelay(rental(status)), 15000);
  assert.equal(rentalPollDelay(rental('RESERVED', [{ ...running, status: 'PENDING' }])), 30000);
  assert.equal(rentalPollDelay(rental('ACTIVE', [running])), 2000);
  assert.equal(rentalPollDelay(rental('ACTIVE', [{ ...running, desiredRevision: 1 }])), 15000);
});

test('adaptive tracker pauses while hidden and changes interval as actual state changes', async () => {
  const visible = visibility(false); const clock = timers(); let current = rental(); let calls = 0;
  const tracker = createRentalTracker({ api: { detail: async () => { calls++; return current; } }, rentalId: 101,
    includeEvents: false, adaptive: true, visibility: visible, onDetail() {}, onError() {}, ...clock });
  await tracker.refresh(); assert.equal(calls, 0);
  visible.set(true); await tracker.refresh(); assert.equal(clock.values.at(-1).delay, 30000);
  current = rental('PROVISIONING', [running]); await tracker.refresh(); assert.equal(clock.values.at(-1).delay, 2000);
  visible.set(false); assert.equal(clock.values.at(-1).cancelled, true); const previousCalls = calls;
  await tracker.refresh(); assert.equal(calls, previousCalls);
  current = rental('ACTIVE'); visible.set(true); await tracker.refresh(); assert.equal(clock.values.at(-1).delay, 15000);
  current = rental('RETURNED'); await tracker.refresh(); const count = calls;
  visible.set(false); visible.set(true); await tracker.refresh(); assert.equal(calls, count);
  tracker.stop(); assert.equal(visible.listeners.size, 0);
});

test('simultaneous readers share one detail HTTP request, without caching later refreshes or sharing other accounts', async () => {
  let calls = 0; let release; const seen = [];
  const api = { detail: () => { calls++; return new Promise(resolve => { release = resolve; }); } };
  const options = { api, rentalId: 101, includeEvents: false, onDetail: value => seen.push(value), onError() {} };
  const one = createRentalTracker({ ...options, ...timers() }); const two = createRentalTracker({ ...options, ...timers() });
  const reads = [one.refresh(), two.refresh()]; await Promise.resolve(); assert.equal(calls, 1);
  release(rental()); await Promise.all(reads); assert.equal(seen.length, 2);
  const next = one.refresh(); await Promise.resolve(); assert.equal(calls, 2); release(rental()); await next;
  let otherCalls = 0;
  const other = createRentalTracker({ ...options, api: { detail: async () => { otherCalls++; return rental(); } }, ...timers() });
  await other.refresh(); assert.equal(otherCalls, 1); one.stop(); two.stop(); other.stop();
});

test('late list responses cannot replace newer detail state or return version; summary rows supply display dates without detail fan-out', () => {
  const current = { ...rental('RETURNING'), version: 6, slots: [{ startAt: '2026-11-02T08:00:00+09:00', endAt: '2026-11-02T15:00:00+09:00' }] };
  assert.equal(mergeRentalUpdate(current, { ...rental('ACTIVE'), version: 5 }), current);
  const merged = mergeRentalUpdate(current, { ...rental('RETURNED'), version: 7 });
  assert.equal(merged.status, 'RETURNED'); assert.equal(merged.version, 7);
  const summary = { id: 101, serverId: 1, contractStart: '2026-11-02T00:00:00+09:00', contractEnd: '2026-11-19T00:00:00+09:00' };
  const normalized = normalizeRental(summary, []);
  assert.equal(normalized.band, 'LONG_TERM'); assert.equal(normalized.to, '2026-11-18');
  for (const example of contract.examples.filter(value => value.response.status === 200 && /^\/api\/v1\/rentals\/\d+$/.test(value.request.path))) {
    const detail = example.response.body; const { slots, jobs, ...row } = detail;
    const listDisplay = normalizeRental(row, []); const detailDisplay = normalizeRental(detail, []);
    assert.equal(listDisplay.from, detailDisplay.from); assert.equal(listDisplay.to, detailDisplay.to); assert.equal(listDisplay.band, detailDisplay.band);
  }
});
