const test = require('node:test');
const assert = require('node:assert/strict');
const { makeSlots, validateReservation, monthCells, overlaps, normalizeRental, horizonDay, calendarDayState, bandLabel } = require('../src/domain.cjs');
test('date ranges create daily Korea time slots rather than one continuous VM window', () => {
  const slots = makeSlots('2026-10-08','2026-10-10','MORNING');
  assert.equal(slots.length,3); assert.equal(slots[0].startAt,'2026-10-08T08:00:00+09:00'); assert.equal(slots[2].endAt,'2026-10-10T15:00:00+09:00');
});
test('reservation validation rejects occupied days anywhere inside range', () => {
  const input = {from:'2026-10-08',to:'2026-10-12',band:'MORNING',purpose:'학습',now:new Date('2026-10-07T09:00:00Z'),blockedSlots:[{startAt:'2026-10-10T08:00:00+09:00',endAt:'2026-10-10T15:00:00+09:00'}]};
  assert.match(validateReservation(input),/예약된/); assert.equal(validateReservation({...input,band:'AFTERNOON'}),null);
});
test('past bands and calendar horizon are validated using Seoul time', () => {
  const input={from:'2026-10-07',to:'2026-10-07',band:'MORNING',purpose:'test',now:new Date('2026-10-07T01:00:00Z')};
  assert.match(validateReservation(input),/이미 시작/);assert.equal(validateReservation({...input,band:'AFTERNOON'}),null);
  assert.match(validateReservation({...input,from:'2026-12-08',to:'2026-12-08'}),/2개월/);
  assert.equal(horizonDay(new Date('2026-12-31T00:00:00Z')),'2027-02-28');
});
test('blocked transition padding prevents adjacent reservation collision',()=>{
  assert.equal(overlaps({startAt:'2026-10-08T16:00:00+09:00',endAt:'2026-10-08T23:00:00+09:00'},{startAt:'2026-10-08T08:00:00+09:00',endAt:'2026-10-08T15:00:00+09:00',blockedEnd:'2026-10-08T16:30:00+09:00'}),true);
});
test('calendar starts on Sunday and crosses month/year boundaries',()=>{
  const cells=monthCells(2026,11);assert.equal(cells.length,42);assert.equal(cells[0].date,'2026-11-29');assert.ok(cells.some(c=>c.date==='2027-01-09'));
});
test('API rental UTC timestamps normalize to Korean afternoon and proper server',()=>{
  const r=normalizeRental({serverId:2,status:'RESERVED',contractStart:'2026-10-08T07:00:00Z',contractEnd:'2026-10-12T14:00:00Z'},[{id:2,name:'SE-Server-02'}]);
  assert.equal(r.band,'AFTERNOON');assert.equal(r.from,'2026-10-08');assert.equal(r.to,'2026-10-12');assert.equal(r.serverName,'SE-Server-02');
});
test('long-term rental includes every hour through the selected final day across month boundaries', () => {
  const slots = makeSlots('2026-10-30','2026-11-02','LONG_TERM');
  assert.deepEqual(slots, [{ startAt:'2026-10-30T00:00:00+09:00', endAt:'2026-11-03T00:00:00+09:00' }]);
  assert.equal(new Date(slots[0].endAt) - new Date(slots[0].startAt), 4 * 24 * 3600000);
  assert.equal(makeSlots('2026-10-08','2026-10-08','LONG_TERM')[0].endAt,'2026-10-09T00:00:00+09:00');
});
test('long-term rental conflicts with morning, afternoon and overnight bookings inside the range', () => {
  const input = {from:'2026-10-08',to:'2026-10-12',band:'LONG_TERM',purpose:'학습',now:new Date('2026-10-07T09:00:00Z')};
  assert.equal(validateReservation(input),null);
  for (const blocked of [makeSlots('2026-10-10','2026-10-10','MORNING')[0],makeSlots('2026-10-10','2026-10-10','AFTERNOON')[0],{startAt:'2026-10-10T23:00:00+09:00',endAt:'2026-10-11T07:00:00+09:00'}]) {
    assert.match(validateReservation({...input,blockedSlots:[blocked]}),/예약된/);
  }
  assert.match(validateReservation({...input,from:'2026-10-07',to:'2026-10-08'}),/이미 시작/);
  assert.match(validateReservation({...input,to:'2026-12-07'}),/2개월/);
});
test('purple markers cover booked full days and distinguish paired short bookings and switch padding', () => {
  const now = new Date('2026-10-07T00:00:00Z');
  const long = makeSlots('2026-10-10','2026-10-12','LONG_TERM');
  for (const band of ['MORNING','AFTERNOON','LONG_TERM']) assert.equal(calendarDayState('2026-10-11',band,long,now).disabled,true);
  assert.equal(calendarDayState('2026-10-12','MORNING',long,now).longTerm,true);
  assert.equal(calendarDayState('2026-10-13','MORNING',long,now).longTerm,false);
  const both = [...makeSlots('2026-10-11','2026-10-11','MORNING'),...makeSlots('2026-10-11','2026-10-11','AFTERNOON')];
  assert.equal(calendarDayState('2026-10-11','MORNING',both,now).longTerm,false);
  assert.equal(calendarDayState('2026-10-11','LONG_TERM',both,now).disabled,true);
  assert.equal(calendarDayState('2026-10-11','LONG_TERM',[both[1]],now).disabled,true);
  const padded = [{...long[0],blockedEnd:'2026-10-13T00:15:00+09:00'}];
  assert.equal(calendarDayState('2026-10-13','LONG_TERM',padded,now).disabled,true);
  assert.equal(calendarDayState('2026-10-13','LONG_TERM',padded,now).longTerm,false);
});
test('API continuous UTC rental normalizes to long-term with an inclusive final date', () => {
  const slot = {startAt:'2026-10-07T15:00:00Z',endAt:'2026-10-12T15:00:00Z'};
  for (const raw of [{slots:[slot]},{contractStart:slot.startAt,contractEnd:slot.endAt}]) {
    const rental=normalizeRental({serverId:1,...raw},[{id:1,name:'SE-Server-01'}]);
    assert.equal(rental.band,'LONG_TERM'); assert.equal(rental.from,'2026-10-08'); assert.equal(rental.to,'2026-10-12');
    assert.equal(bandLabel(rental.band),'장기 대여 (24시간)');
  }
  assert.equal(normalizeRental({slots:makeSlots('2026-10-08','2026-10-12','MORNING')},[]).band,'MORNING');
});
