const test = require('node:test');
const assert = require('node:assert/strict');
const { horizonInstant, horizonDay, makeSlots, validateReservation, calendarDayState, reservationConflict, reservationClock, reservationNow, normalizeRental } = require('../src/domain.cjs');
test('transition validation blocks insufficient gaps before and after bookings but permits exact minimum', () => {
  const now = new Date('2026-10-14T01:00:00Z');
  const input = { from: '2026-10-15', to: '2026-10-15', band: 'MORNING', purpose: '전환 검증', now, minimumSwitchSeconds: 3600 };
  const before = { startAt: '2026-10-15T00:00:00+09:00', endAt: '2026-10-15T07:30:00+09:00' };
  const after = { startAt: '2026-10-15T15:30:00+09:00', endAt: '2026-10-15T23:00:00+09:00' };
  for (const booking of [before, after]) {
    assert.match(validateReservation({ ...input, blockedSlots: [booking] }), /전환 준비 시간/);
    assert.equal(calendarDayState(input.from, input.band, [booking], now, 3600).disabled, true);
  }
  assert.equal(validateReservation({ ...input, blockedSlots: [{ ...before, endAt: '2026-10-15T07:00:00+09:00' }] }), null);
  assert.equal(validateReservation({ ...input, blockedSlots: [{ ...after, startAt: '2026-10-15T16:00:00+09:00' }] }), null);
  const ownSlot = makeSlots(input.from, input.to, input.band)[0];
  assert.equal(reservationConflict(ownSlot, { ...ownSlot, state: 'CANCELLED' }, 3600), null);
  const state = calendarDayState(input.from, input.band, [before], now, 3600);
  assert.equal(state.morning, false);assert.equal(state.disabled, true);
  assert.match(validateReservation({ ...input, to: '2026-10-17', blockedSlots: [{ ...before, startAt: '2026-10-16T00:00:00+09:00', endAt: '2026-10-16T07:30:00+09:00' }] }), /전환 준비 시간/);
});

test('month horizon preserves Seoul time, milliseconds and clamps leap/year boundaries', () => {
  assert.equal(horizonInstant(new Date('2026-10-14T01:02:03.456Z')).toISOString(), '2026-12-14T01:02:03.456Z');
  assert.equal(horizonInstant(new Date('2026-12-31T14:30:00Z')).toISOString(), '2027-02-28T14:30:00.000Z');
  assert.equal(horizonInstant(new Date('2023-12-31T15:30:00Z')).toISOString(), '2024-02-29T15:30:00.000Z');
  assert.equal(horizonDay(new Date('2026-12-31T00:00:00Z')), '2027-02-28');
});

test('calendar and range validation reject final-day end beyond the exact horizon and accept equality', () => {
  const input = { from: '2026-12-14', to: '2026-12-14', band: 'MORNING', purpose: '한도 검증', now: new Date('2026-10-14T01:00:00Z') };
  assert.match(validateReservation(input), /종료 시각/);
  assert.equal(calendarDayState(input.from, input.band, [], input.now).disabled, true);
  assert.equal(validateReservation({ ...input, now: new Date('2026-10-14T06:00:00Z') }), null);
  assert.equal(calendarDayState(input.from, input.band, [], new Date('2026-10-14T06:00:00Z')).disabled, false);
  assert.match(validateReservation({ ...input, band: 'LONG_TERM' }), /종료 시각/);
  assert.equal(validateReservation({ ...input, to: '2026-12-13', from: '2026-12-13', band: 'LONG_TERM' }), null);
});

test('server clock and horizon override a skewed device clock for dates and final-day validation',()=>{
  const receivedAt=Date.parse('2027-03-01T00:00:00Z');
  const clock=reservationClock({serverNow:'2026-10-14T01:00:00Z',reservationHorizonAt:'2026-12-14T01:00:00Z'},receivedAt);
  assert.equal(reservationNow(clock,receivedAt+5000).toISOString(),'2026-10-14T01:00:05.000Z');
  const input={from:'2026-12-14',to:'2026-12-14',band:'MORNING',purpose:'시각 검증',now:reservationNow(clock,receivedAt),reservationHorizonAt:clock.horizonAt};
  assert.match(validateReservation(input),/종료 시각/);
  assert.equal(calendarDayState(input.from,input.band,[],input.now,0,clock.horizonAt).disabled,true);
  assert.equal(validateReservation({...input,from:'2026-10-15',to:'2026-10-15'}),null);
  assert.throws(()=>reservationClock({serverNow:'invalid'}),/기준 시각/);
});
