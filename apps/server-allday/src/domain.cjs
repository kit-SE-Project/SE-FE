const CLOSED = ['RETURNED', 'CANCELLED'];
const LABELS = { RESERVED: '신청 완료', PROVISIONING: 'VM 생성 중', READY: '접속 준비 완료', ACTIVE: '사용 중', RETAINED: '다음 이용 대기', RETURNING: '초기화 중', RETURNED: '반납 완료', CANCELLED: '취소 완료' };
const STEPS = ['신청 완료', 'VM 생성 중', '접속 정보 전달', '사용 중', '반납 요청', '초기화 중', '반납 완료'];
const STEP_INDEX = { RESERVED: 0, PROVISIONING: 1, READY: 2, ACTIVE: 3, RETAINED: 3, RETURNING: 5, RETURNED: 6, CANCELLED: 0 };
function isoDay(date) { return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'); }
function seoulDay(now = new Date()) { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
function addDays(day, count) { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + count); return isoDay(d); }
function monthCells(year, month) { const first = new Date(year, month, 1); const start = new Date(year, month, 1 - first.getDay()); return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return { date: isoDay(d), day: d.getDate(), current: d.getMonth() === month }; }); }
function horizonInstant(now = new Date()) {
  const local = new Date(now.getTime() + 9 * 3600000);
  const month = local.getUTCMonth() + 2;
  const last = new Date(Date.UTC(local.getUTCFullYear(), month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(local.getUTCFullYear(), month, Math.min(local.getUTCDate(), last), local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds(), local.getUTCMilliseconds()) - 9 * 3600000);
}
function horizonDay(now = new Date()) { return seoulDay(horizonInstant(now)); }
function makeSlots(from, to, band, { startTime, endTime } = {}) {
  if (!from || !to || to < from) throw new Error('대여 시작일과 종료일을 선택하세요.');
  if (band === 'CUSTOM') {
    const validDate = value => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00+09:00`);
      return Number.isFinite(date.getTime()) && seoulDay(date) === value;
    };
    if (!validDate(from) || !validDate(to)) throw new Error('대여·반납 날짜를 YYYY-MM-DD 형식의 올바른 날짜로 입력하세요.');
    const valid = value => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value || '');
    if (!valid(startTime) || !valid(endTime)) throw new Error('시작·종료 시간을 HH:mm 형식으로 입력하세요.');
    const slot = { startAt: `${from}T${startTime}:00+09:00`, endAt: `${to}T${endTime}:00+09:00` };
    if (new Date(slot.startAt) >= new Date(slot.endAt)) throw new Error('종료 시각은 시작 시각보다 늦어야 합니다.');
    return [slot];
  }
  if (band === 'LONG_TERM') return [{ startAt: `${from}T00:00:00+09:00`, endAt: `${addDays(to, 1)}T00:00:00+09:00` }];
  const slots = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    slots.push({ startAt: `${day}T${band === 'AFTERNOON' ? '16' : '08'}:00:00+09:00`, endAt: `${day}T${band === 'AFTERNOON' ? '23' : '15'}:00:00+09:00` });
    if (slots.length > 256) throw new Error('대여 기간이 너무 깁니다.');
  }
  return slots;
}
function overlaps(a, b) { return new Date(a.startAt) < new Date(b.blockedEnd || b.endAt) && new Date(a.endAt) > new Date(b.blockedStart || b.startAt); }
function reservationConflict(a, b, minimumSwitchSeconds = 0) {
  if (b.state === 'CANCELLED') return null;
  if (overlaps(a, b)) return 'overlap';
  const start = new Date(a.startAt).getTime(); const end = new Date(a.endAt).getTime();
  const blockedStart = new Date(b.blockedStart || b.startAt).getTime(); const blockedEnd = new Date(b.blockedEnd || b.endAt).getTime();
  const minimum = Math.max(0, minimumSwitchSeconds) * 1000;
  if ((end <= blockedStart && blockedStart - end < minimum) || (start >= blockedEnd && start - blockedEnd < minimum)) return 'switch';
  return null;
}
function isLongTermSlot(slot) {
  const start = new Date(slot.startAt); const end = new Date(slot.endAt);
  const midnight = date => new Date(date.getTime() + 9 * 3600000).toISOString().slice(11, 23) === '00:00:00.000';
  return Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end - start >= 86400000 && midnight(start) && midnight(end);
}
function reservationClock(availability = {}, receivedAt = Date.now()) {
  const nowAt = availability.serverNow ? Date.parse(availability.serverNow) : receivedAt;
  const horizonAt = availability.reservationHorizonAt ? Date.parse(availability.reservationHorizonAt) : horizonInstant(new Date(nowAt)).getTime();
  if (!Number.isFinite(nowAt) || !Number.isFinite(horizonAt) || horizonAt <= nowAt) throw new Error('예약 기준 시각을 확인하지 못했습니다. 가용 시간을 다시 조회하세요.');
  return {nowAt,horizonAt,receivedAt};
}
function reservationNow(clock, current = Date.now()) { return new Date(clock.nowAt + Math.max(0,current-clock.receivedAt)); }
function calendarDayState(day, band, blockedSlots = [], now = new Date(), minimumSwitchSeconds = 0, reservationHorizonAt = null) {
  const liveSlots = blockedSlots.filter(slot => slot.state !== 'CANCELLED');
  const reserved = b => liveSlots.some(slot => overlaps(makeSlots(day, day, b)[0], { startAt: slot.startAt, endAt: slot.endAt }));
  const fullDay = makeSlots(day, day, 'LONG_TERM')[0];
  const candidate = band === 'CUSTOM' ? fullDay : makeSlots(day, day, band)[0];
  return {
    morning: reserved('MORNING'), afternoon: reserved('AFTERNOON'),
    // Use the actual booked window for markers, rather than padded switch time.
    longTerm: liveSlots.some(slot => isLongTermSlot(slot) && overlaps(fullDay, { startAt: slot.startAt, endAt: slot.endAt })),
    disabled: band === 'CUSTOM' ? day < seoulDay(now) || day > seoulDay(reservationHorizonAt ? new Date(reservationHorizonAt) : horizonInstant(now)) : day < seoulDay(now) || new Date(candidate.startAt) <= now || new Date(candidate.endAt) > (reservationHorizonAt ? new Date(reservationHorizonAt) : horizonInstant(now)) || liveSlots.some(slot => reservationConflict(candidate, slot, minimumSwitchSeconds)),
  };
}
function bandLabel(band) { return band === 'CUSTOM' ? '시간 직접 지정' : band === 'LONG_TERM' ? '장기 대여 (24시간)' : band === 'AFTERNOON' ? '오후 (16:00 - 23:00)' : '오전 (08:00 - 15:00)'; }
// Existing contracts can be shortened or started early. A selection band does
// not describe their authoritative start/end timestamps.
function rentalTimeLabel(rental) {
  const slots = rental.slots || [];
  const start = new Date(rental.contractStart || slots[0]?.startAt);
  const end = new Date(rental.contractEnd || slots[slots.length - 1]?.endAt);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start >= end) return '이용 시간 확인 중';
  const clock = date => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  const first = seoulDay(start); const last = seoulDay(end);
  return first === last ? `${clock(start)} ~ ${clock(end)} (KST)` : `${first} ${clock(start)} ~ ${last} ${clock(end)} (KST)`;
}
function validateReservation({ from, to, band, startTime, endTime, purpose, blockedSlots = [], now = new Date(), minimumSwitchSeconds = 0, reservationHorizonAt = null }) {
  if (!purpose.trim()) return '사용 용도를 입력하세요.';
  if (purpose.length > 2000) return '사용 용도는 2,000자 이내로 입력하세요.';
  if (!from || !to || to < from) return '대여 시작일과 종료일을 선택하세요.';
  const endLimit = reservationHorizonAt ? new Date(reservationHorizonAt) : horizonInstant(now);
  if (from < seoulDay(now) || to > seoulDay(endLimit)) return '현재부터 2개월 이내의 날짜를 선택하세요.';
  let slots;
  try { slots = makeSlots(from, to, band, { startTime, endTime }); } catch (error) { return error.message; }
  if (slots.some(s => new Date(s.endAt) > endLimit)) return '대여 종료 시각은 현재 시각부터 2개월 이내여야 합니다.';
  if (slots.some(s => new Date(s.startAt) <= now)) return '이미 시작된 시간대는 선택할 수 없습니다.';
  const conflicts = slots.flatMap(s => blockedSlots.map(b => reservationConflict(s, b, minimumSwitchSeconds))).filter(Boolean);
  if (conflicts.includes('overlap')) return '선택한 기간에 이미 예약된 시간대가 있습니다.';
  if (conflicts.includes('switch')) return `다른 예약과 서버 전환 준비 시간 ${minimumSwitchSeconds}초 이상의 간격이 필요합니다.`;
  return null;
}
function normalizeServer(s) { return { ...s, name: s.displayName || s.name, cpu: s.cpuModel || s.cpu, ram: s.memoryGb ? `${s.memoryGb}GB` : s.ram, gpu: s.gpuModel || s.gpu || '-', reservationAllowed: s.status === 'AVAILABLE' && (s.reservationAllowed ?? true) }; }
function normalizeRental(r, servers) {
  const slots = r.slots || []; const start = r.contractStart || slots[0]?.startAt; const end = r.contractEnd || slots[slots.length - 1]?.endAt;
  const continuous = slots.length ? slots.length === 1 && isLongTermSlot(slots[0]) : start && end && isLongTermSlot({ startAt: start, endAt: end });
  const band = r.band || (continuous ? 'LONG_TERM' : start && new Date(start).toLocaleString('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', hour12: false }) === '16' ? 'AFTERNOON' : 'MORNING');
  return { ...r, serverName: r.serverSnapshot?.displayName || r.serverName || servers.find(s => s.id === r.serverId)?.name || `Server ${r.serverId}`, gpuSnapshot: r.serverSnapshot?.gpuModel || r.gpuSnapshot, from: start ? seoulDay(new Date(start)) : r.from, to: end ? seoulDay(new Date(new Date(end).getTime() - (band === 'LONG_TERM' ? 1 : 0))) : r.to, band };
}
module.exports = { CLOSED, LABELS, STEPS, STEP_INDEX, isoDay, seoulDay, addDays, monthCells, horizonDay, horizonInstant, reservationClock, reservationNow, makeSlots, overlaps, reservationConflict, isLongTermSlot, calendarDayState, bandLabel, rentalTimeLabel, validateReservation, normalizeServer, normalizeRental };
