const test = require('node:test');
const assert = require('node:assert/strict');
const { createRentalTracker, jobRows, recentEvents, trackingTime, currentWorkSummary } = require('../src/rental-tracking.cjs');
const contract = require('./contracts/public-api.json');

const job = (status = 'PENDING', extra = {}) => ({ id: 51, type: 'PREPARE', status, step: 'QUEUED', retryCount: 0, reasonCode: null, ...extra });
const detail = (jobs = [job()], status = 'PROVISIONING') => ({ id: 101, status, jobs });
function harness(overrides = {}, trackerOptions = {}) {
  const seen = { details: [], events: [], errors: [], eventErrors: [], timers: [] };
  const api = { detail: async () => detail(), rentalEvents: async () => [], ...overrides };
  const tracker = createRentalTracker({ api, rentalId: 101,
    ...trackerOptions,
    onDetail: value => seen.details.push(value), onEvents: value => seen.events.push(value),
    onError: value => seen.errors.push(value), onEventError: value => seen.eventErrors.push(value),
    schedule: (callback, delay) => { const timer = { callback, delay, cancelled: false }; seen.timers.push(timer); return timer; },
    cancel: timer => { timer.cancelled = true; },
  });
  return { tracker, seen };
}

test('tracking displays all six job states, known types, exact steps, retries and reason codes without percentages', () => {
  for (const [state, label] of Object.entries({ PENDING: '대기', RUNNING: '실행 중', SUCCEEDED: '성공', FAILED: '실패', CANCELLED: '취소', SUPERSEDED: '새 요청으로 대체됨' })) {
    const [row] = jobRows([job(state, { retryCount: 2, step: 'PVE_CLONE_WAIT', reasonCode: 'PVE_TASK_FAILED' })]);
    assert.equal(row.statusLabel, label); assert.equal(row.typeLabel, 'VM 준비');
    assert.equal(row.stepLabel, 'PVE_CLONE_WAIT'); assert.equal(row.reasonCode, 'PVE_TASK_FAILED');
    assert.equal(row.retryLabel, '2회'); assert.equal(Object.hasOwn(row, 'percent'), false);
  }
  assert.equal(jobRows([job()])[0].stepLabel, '작업 대기');
  assert.equal(trackingTime('invalid'), '-');
  assert.match(trackingTime('2026-10-23T00:00:00Z'), /09:00:00/);
});

test('real contract detail examples preserve job fields and display next run only for pending jobs', () => {
  const examples = contract.examples.filter(value => value.response.status === 200 && /^\/api\/v1\/rentals\/\d+$/.test(value.request.path));
  for (const example of examples) {
    const raw = example.response.body.jobs;
    const rows = jobRows(raw);
    assert.equal(rows.length, raw.length);
    for (const row of rows) {
      const source = raw.find(value => value.id === row.id);
      assert.equal(row.step, source.step); assert.equal(row.reasonCode, source.reasonCode);
      assert.equal(row.nextRunLabel !== null, row.status === 'PENDING');
    }
  }
});

test('jobs are ordered running, failed, pending then completed without changing the response array', () => {
  const input = [job('SUCCEEDED', { id: 1 }), job('PENDING', { id: 2 }), job('FAILED', { id: 3 }), job('RUNNING', { id: 4 })];
  assert.deepEqual(jobRows(input).map(value => value.id), [4, 3, 2, 1]);
  assert.deepEqual(input.map(value => value.id), [1, 2, 3, 4]);
});

test('the monitor polls detail and events every 2 seconds and updates pending/running/failed jobs', async () => {
  let index = 0; let detailCalls = 0; let eventCalls = 0;
  const snapshots = [detail(), detail([job('RUNNING', { step: 'CLONE_WAIT' })]), detail([job('FAILED', { retryCount: 1, reasonCode: 'PVE_TASK_FAILED' })])];
  const { tracker, seen } = harness({ detail: async id => { assert.equal(id, 101); detailCalls++; return snapshots[index++]; }, rentalEvents: async id => { assert.equal(id, 101); eventCalls++; return []; } });
  for (let i = 0; i < 3; i++) { await tracker.refresh(); assert.equal(seen.timers.at(-1).delay, 2000); }
  assert.deepEqual(seen.details.map(value => value.jobs[0].status), ['PENDING', 'RUNNING', 'FAILED']);
  assert.equal(detailCalls, 3); assert.equal(eventCalls, 3);
  tracker.stop(); assert.equal(seen.timers.at(-1).cancelled, true);
});

test('a slow request never overlaps and stopping ignores both late detail and event responses', async () => {
  let resolveDetail; let calls = 0;
  const { tracker, seen } = harness({ detail: () => { calls++; return new Promise(resolve => { resolveDetail = resolve; }); } });
  const first = tracker.refresh(); const second = tracker.refresh(); assert.equal(first, second);
  await Promise.resolve(); assert.equal(calls, 1);
  tracker.stop(); resolveDetail(detail()); await first;
  assert.equal(seen.details.length, 0); assert.equal(seen.events.length, 0); assert.equal(seen.timers.length, 0);
});

test('network failure keeps the last confirmed data, backs off, and resumes the normal interval on recovery', async () => {
  let failure = false;
  const { tracker, seen } = harness({ detail: async () => { if (failure) throw Object.assign(new Error('offline'), { status: 503 }); return detail(); } });
  await tracker.refresh(); failure = true;
  await tracker.refresh(); assert.equal(seen.details.length, 1); assert.equal(seen.timers.at(-1).delay, 4000);
  await tracker.refresh(); assert.equal(seen.timers.at(-1).delay, 8000);
  failure = false; await tracker.refresh(); assert.equal(seen.details.length, 2); assert.equal(seen.errors.at(-1), null); assert.equal(seen.timers.at(-1).delay, 2000);
  tracker.stop();
});

test('401, 403 and deleted contracts stop polling instead of repeatedly sending unauthorized requests', async () => {
  for (const status of [401, 403, 404]) {
    let calls = 0;
    const { tracker, seen } = harness({ detail: async () => { calls++; throw Object.assign(new Error('denied'), { status }); } });
    await tracker.refresh(); await tracker.refresh();
    assert.equal(calls, 1); assert.equal(seen.timers.length, 0); tracker.stop();
  }
});

test('returned contracts stop after a final read unless there is still a pending or running job', async () => {
  for (const [status, expected] of [['SUCCEEDED', 0], ['RUNNING', 1], ['PENDING', 1]]) {
    const { tracker, seen } = harness({ detail: async () => detail([job(status)], 'RETURNED') });
    await tracker.refresh(); assert.equal(seen.timers.length, expected); tracker.stop();
  }
});

test('event failure does not erase the successfully observed jobs; malformed detail is never treated as an empty queue', async () => {
  const first = harness({ rentalEvents: async () => { throw new Error('events unavailable'); } });
  await first.tracker.refresh(); assert.equal(first.seen.details.length, 1); assert.match(first.seen.eventErrors[0].message, /unavailable/); first.tracker.stop();
  const second = harness({ detail: async () => ({ id: 101, status: 'ACTIVE' }) });
  await second.tracker.refresh(); assert.equal(second.seen.details.length, 0); assert.equal(second.seen.errors[0].code, 'INVALID_RESPONSE'); second.tracker.stop();
});

test('events are deduplicated and limited to the ten most recent records', () => {
  const entries = Array.from({ length: 12 }, (_, id) => ({ id, createdAt: `2026-10-23T00:00:${String(id).padStart(2, '0')}Z` }));
  const result = recentEvents([...entries, entries[11]]);
  assert.equal(result.length, 10); assert.deepEqual(result.map(value => value.id), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
});

test('a long reservation with many future start/stop jobs renders only the current reservation summary', () => {
  const jobs = Array.from({ length: 100 }, (_, id) => job('PENDING', { id, type: id % 2 ? 'STOP' : 'START', desiredRevision: 1, nextRunAt: '2026-11-18T00:00:00Z' }));
  const result = currentWorkSummary({ status: 'RESERVED', desiredRevision: 1, jobs });
  assert.deepEqual(result, { text: '예약 일정에 맞춰 서버가 준비됩니다.', running: false });
  assert.equal(Object.hasOwn(result, 'jobs'), false); assert.equal(jobs.length, 100);
});

test('current work ignores old-revision running jobs and hides completed/failed/historical jobs', () => {
  const jobs = [job('RUNNING', { id: 60, type: 'STOP', desiredRevision: 0 }), job('FAILED', { id: 50, desiredRevision: 1 }), job('SUCCEEDED', { id: 52, desiredRevision: 1 })];
  assert.equal(currentWorkSummary({ status: 'ACTIVE', desiredRevision: 1, jobs }).text, '대여가 진행 중입니다.');
  jobs.push(job('RUNNING', { id: 53, type: 'START', desiredRevision: 1 }));
  assert.deepEqual(currentWorkSummary({ status: 'PROVISIONING', desiredRevision: 1, jobs }), { text: '서버를 시작하고 있습니다.', running: true });
});

test('returned/cancelled contracts never look active because of leftover jobs', () => {
  for (const status of ['RETURNED', 'CANCELLED']) assert.equal(currentWorkSummary({ status, jobs: [job('RUNNING')] }).running, false);
});

test('compact user view polls detail only and never calls the event history endpoint', async () => {
  let eventCalls = 0;
  const { tracker, seen } = harness({ rentalEvents: async () => { eventCalls++; return []; } }, { includeEvents: false });
  await tracker.refresh(); await tracker.refresh();
  assert.equal(eventCalls, 0); assert.equal(seen.events.length, 0); assert.equal(seen.eventErrors.length, 0);
  assert.equal(seen.details.length, 2); assert.equal(seen.timers.at(-1).delay, 2000); tracker.stop();
});
