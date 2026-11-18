const test = require('node:test');
const assert = require('node:assert/strict');
const { makeSlots, validateReservation, calendarDayState } = require('../src/domain.cjs');
const input = { from: '2026-11-03', to: '2026-11-03', band: 'CUSTOM', startTime: '17:30', endTime: '17:45',
  purpose: '시간 지정 예약', now: new Date('2026-11-03T08:20:00Z') };
test('custom reservations preserve the actual future minute instead of replacing it with a selection band', () => {
  assert.equal(validateReservation(input), null);
  assert.deepEqual(makeSlots(input.from,input.to,input.band,input),[{startAt:'2026-11-03T17:30:00+09:00',endAt:'2026-11-03T17:45:00+09:00'}]);
  assert.equal(calendarDayState(input.from,'CUSTOM',[],input.now).disabled,false);
});
test('custom times reject invalid format, past starts, reversed periods, conflicts and insufficient switching time', () => {
  for(const change of [{startTime:'25:00'},{startTime:'7:30'},{endTime:'17:20'},{startTime:'17:10'}]) assert.ok(validateReservation({...input,...change}));
  const blockedSlots=[{startAt:'2026-11-03T17:35:00+09:00',endAt:'2026-11-03T18:00:00+09:00'}];
  assert.match(validateReservation({...input,blockedSlots}),/예약된/);
  assert.match(validateReservation({...input,blockedSlots:[{startAt:'2026-11-03T16:00:00+09:00',endAt:'2026-11-03T17:00:00+09:00'}],minimumSwitchSeconds:3600}),/전환 준비/);
});
test('custom overnight reservations honor the backend horizon and Seoul dates', () => {
  assert.equal(validateReservation({...input,startTime:'23:30',to:'2026-11-04',endTime:'00:15'}),null);
  assert.match(validateReservation({...input,reservationHorizonAt:Date.parse('2026-11-03T08:40:00Z')}),/2개월/);
});

test('custom date inputs reject malformed or nonexistent dates rather than normalizing them', () => {
  for (const from of ['2026-11-3', '2026-11-00', '2026-11-31', '2026-02-29']) {
    assert.throws(() => makeSlots(from, '2026-12-01', 'CUSTOM', input), /올바른 날짜/);
  }
  assert.throws(() => makeSlots('2026-11-03', '2026-11-31', 'CUSTOM', input), /올바른 날짜/);
});
