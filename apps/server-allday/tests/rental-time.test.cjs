const test = require('node:test');
const assert = require('node:assert/strict');
const { rentalTimeLabel } = require('../src/domain.cjs');

test('an early-started short contract shows its real end time rather than the afternoon band', () => {
  const slot = { startAt: '2026-11-03T07:27:01Z', endAt: '2026-11-03T08:46:15Z' };
  for (const rental of [
    { band: 'AFTERNOON', contractStart: slot.startAt, contractEnd: slot.endAt },
    { slots: [slot] },
  ]) assert.equal(rentalTimeLabel(rental), '16:27 ~ 17:46 (KST)');
});

test('contracts crossing midnight include both Seoul dates, including an exclusive midnight end', () => {
  assert.equal(rentalTimeLabel({ contractStart: '2026-11-03T14:50:00Z', contractEnd: '2026-11-03T15:20:00Z' }),
    '2026-11-03 23:50 ~ 2026-11-04 00:20 (KST)');
  assert.equal(rentalTimeLabel({ contractStart: '2026-11-02T15:00:00Z', contractEnd: '2026-11-05T15:00:00Z' }),
    '2026-11-03 00:00 ~ 2026-11-06 00:00 (KST)');
});

test('missing or invalid timestamps never invent a fixed usage window', () => {
  for (const rental of [{ band: 'AFTERNOON' }, { contractStart: 'invalid', contractEnd: '2026-11-03T08:00:00Z' },
    { contractStart: '2026-11-03T09:00:00Z', contractEnd: '2026-11-03T08:00:00Z' }])
    assert.equal(rentalTimeLabel(rental), '이용 시간 확인 중');
});
