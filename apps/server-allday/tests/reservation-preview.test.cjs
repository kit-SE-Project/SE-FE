const test = require('node:test');
const assert = require('node:assert/strict');
const { makeSlots, validateReservation, calendarDayState, reservationConflict } = require('../src/domain.cjs');
const { reservationPreviewFailure } = require('../src/reservation-preview.cjs');

const allowed = { serverId: 57, serverAvailable: true, canReserve: true, conflicts: [], minimumSwitchSeconds: 3600 };

test('October 28–31 afternoon slots remain available alongside daily morning reservations with an exact hour gap', () => {
  const morning = makeSlots('2026-10-28', '2026-10-31', 'MORNING').map(slot => ({ ...slot, blockedStart: slot.startAt, blockedEnd: slot.endAt, state: 'SCHEDULED' }));
  const now = new Date('2026-10-27T23:00:00Z');
  const afternoon = makeSlots('2026-10-28', '2026-10-31', 'AFTERNOON');
  assert.equal(afternoon.length, 4);
  for (const candidate of afternoon) for (const existing of morning) assert.equal(reservationConflict(candidate, existing, 3600), null);
  for (const day of ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31']) {
    const state = calendarDayState(day, 'AFTERNOON', morning, now, 3600);
    assert.equal(state.morning, true); assert.equal(state.afternoon, false); assert.equal(state.disabled, false);
  }
  assert.equal(validateReservation({ from: '2026-10-28', to: '2026-10-31', band: 'AFTERNOON', purpose: '오후 대여 테스트', now, minimumSwitchSeconds: 3600, blockedSlots: morning }), null);
});

test('a real afternoon conflict anywhere in the selected range still blocks the reservation', () => {
  const slots = makeSlots('2026-10-30', '2026-10-30', 'AFTERNOON');
  assert.match(validateReservation({ from: '2026-10-28', to: '2026-10-31', band: 'AFTERNOON', purpose: '오후 대여 테스트', now: new Date('2026-10-27T23:00:00Z'), minimumSwitchSeconds: 3600, blockedSlots: slots }), /이미 예약된/);
  const candidate = makeSlots('2026-10-28', '2026-10-28', 'AFTERNOON')[0];
  assert.equal(reservationConflict(candidate, { startAt: '2026-10-28T08:00:00+09:00', endAt: '2026-10-28T15:00:00.001+09:00' }, 3600), 'switch');
});

test('server conflicts display the actual candidate and blocked interval in Seoul time', () => {
  const result = reservationPreviewFailure({ ...allowed, canReserve: false, conflicts: [{ code: 'SLOT_CONFLICT', candidate: { startAt: '2026-10-28T07:00:00Z', endAt: '2026-10-28T14:00:00Z' }, blockedStart: '2026-10-28T06:30:00Z', blockedEnd: '2026-10-28T07:30:00Z' }] }, 57);
  assert.equal(result.code, 'SLOT_CONFLICT');
  assert.match(result.message, /2026-10-28 16:00:00 ~ 2026-10-28 23:00:00/);
  assert.match(result.message, /2026-10-28 15:30:00 ~ 2026-10-28 16:30:00/);
  assert.match(result.message, /한국 시간/);
  assert.equal(reservationPreviewFailure(allowed, 57), null);
});

test('switch-time conflicts have their own explanation and retain sub-second boundaries', () => {
  const result = reservationPreviewFailure({ ...allowed, canReserve: false, conflicts: [{ code: 'INSUFFICIENT_SWITCH_TIME', candidate: makeSlots('2026-10-28', '2026-10-28', 'AFTERNOON')[0], blockedStart: '2026-10-28T08:00:00+09:00', blockedEnd: '2026-10-28T15:00:00.001+09:00' }] }, 57);
  assert.equal(result.code, 'INSUFFICIENT_SWITCH_TIME');
  assert.match(result.message, /60분 이상의 간격/);
  assert.match(result.message, /15:00:00.001/);
});

test('missing, inconsistent, unknown or wrong-server preview data is never invented into a booking conflict or permitted', () => {
  for (const value of [null, {}, { ...allowed, serverId: 2 }, { ...allowed, canReserve: 'true' }, { ...allowed, canReserve: false }, { ...allowed, conflicts: [{ code: 'SLOT_CONFLICT' }] }, { ...allowed, canReserve: false, conflicts: [{ code: 'UNKNOWN' }] }]) {
    const result = reservationPreviewFailure(value, 57);
    assert.equal(result.code, 'INVALID_RESPONSE'); assert.equal(result.status, 502);
  }
  assert.equal(reservationPreviewFailure({ ...allowed, canReserve: false, serverAvailable: false }, 57).code, 'SERVER_UNAVAILABLE');
});

test('the reported continuous October 28 to November 2 interval cannot replace daily afternoon requests', () => {
  const requested = makeSlots('2026-11-01', '2026-11-05', 'AFTERNOON');
  const observedSlots = [
    { startAt: '2026-10-28T00:26:43.141354Z', endAt: '2026-11-02T14:00:00Z' },
    { startAt: '2026-11-03T07:00:00Z', endAt: '2026-11-03T14:00:00Z' },
    { startAt: '2026-11-04T07:00:00Z', endAt: '2026-11-04T14:00:00Z' },
  ];
  for (const canReserve of [false, true]) {
    const result = reservationPreviewFailure({ ...allowed, canReserve, slots: observedSlots }, 57, requested);
    assert.equal(result.code, 'PREVIEW_SLOT_MISMATCH');
    assert.match(result.message, /2026-11-01 16:00:00/);
    assert.match(result.message, /2026-11-02 23:00:00/);
  }
  const normal = requested.map(slot => ({ startAt: new Date(slot.startAt).toISOString(), endAt: new Date(slot.endAt).toISOString() }));
  assert.equal(reservationPreviewFailure({ ...allowed, slots: normal }, 57, requested), null);
});

test('coverage checks allow equivalent representations but never fill unrequested gaps or accept missing slots', () => {
  const requested = [{ startAt: '2026-10-28T16:00:00+09:00', endAt: '2026-10-28T20:00:00+09:00' }, { startAt: '2026-10-28T20:00:00+09:00', endAt: '2026-10-28T23:00:00+09:00' }];
  const merged = [{ startAt: '2026-10-28T07:00:00Z', endAt: '2026-10-28T14:00:00Z' }];
  assert.equal(reservationPreviewFailure({ ...allowed, slots: merged }, 57, requested), null);
  const gap = [{ ...requested[0], endAt: '2026-10-28T19:00:00+09:00' }, requested[1]];
  assert.equal(reservationPreviewFailure({ ...allowed, slots: merged }, 57, gap).code, 'PREVIEW_SLOT_MISMATCH');
  for (const slots of [undefined, [], [{ startAt: 'invalid', endAt: 'invalid' }]]) assert.equal(reservationPreviewFailure({ ...allowed, slots }, 57, requested).code, 'INVALID_RESPONSE');
});

test('an open contract blocks a reservation on a different computer', () => {
  const result = reservationPreviewFailure({ ...allowed, canReserve: false, conflicts: [{ code: 'MEMBER_RENTAL_LIMIT' }] }, 57);
  assert.equal(result.status, 409);
  assert.equal(result.code, 'MEMBER_RENTAL_LIMIT');
  assert.match(result.message, /취소하거나 대여를 반납/);
});
