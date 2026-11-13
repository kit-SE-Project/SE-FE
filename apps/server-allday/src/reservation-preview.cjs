function seoulTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    ...(date.getUTCMilliseconds() ? { fractionalSecondDigits: 3 } : {}),
  }).format(date);
}

function interval(start, end) {
  if (typeof start !== 'string' || typeof end !== 'string') return null;
  const from = seoulTime(start); const to = seoulTime(end);
  return from && to && Date.parse(start) < Date.parse(end) ? `${from} ~ ${to}` : null;
}

function coverage(slots) {
  if (!Array.isArray(slots) || slots.length === 0 || slots.length > 256) return null;
  const ranges = [];
  for (const slot of slots) {
    if (typeof slot?.startAt !== 'string' || typeof slot?.endAt !== 'string') return null;
    const start = Date.parse(slot.startAt); const end = Date.parse(slot.endAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) return null;
    ranges.push([start, end]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of ranges) {
    const previous = merged[merged.length - 1];
    if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end);
    else merged.push([start, end]);
  }
  return JSON.stringify(merged);
}

function reservationPreviewFailure(preview, serverId, requestedSlots) {
  const invalid = { code: 'INVALID_RESPONSE', message: '예약 사전검사 응답을 확인하지 못했습니다. 예약 가능 시간을 다시 조회하세요.', status: 502 };
  if (!preview || typeof preview.canReserve !== 'boolean' || typeof preview.serverAvailable !== 'boolean' || !Array.isArray(preview.conflicts) || preview.serverId !== serverId) return invalid;
  if (!preview.serverAvailable) return { code: 'SERVER_UNAVAILABLE', message: '현재 이 서버는 예약할 수 없습니다.', status: 503 };
  if (requestedSlots !== undefined) {
    const requested = coverage(requestedSlots); const compiled = coverage(preview.slots);
    if (!requested || !compiled) return invalid;
    if (requested !== compiled) {
      const messages = ['서버에서 검사한 대여 시간이 선택한 시간대와 다릅니다.'];
      const selected = interval(requestedSlots[0].startAt, requestedSlots[0].endAt);
      const checked = interval(preview.slots[0].startAt, preview.slots[0].endAt);
      if (selected) messages.push(`선택한 첫 대여 시간: ${selected}`);
      if (checked) messages.push(`서버에서 검사한 첫 구간: ${checked}`);
      messages.push('신청을 진행하지 않았습니다. 예약 가능 시간을 다시 확인하고 같은 문제가 계속되면 관리자에게 문의하세요.');
      return { code: 'PREVIEW_SLOT_MISMATCH', status: 502, message: messages.join('\n') };
    }
  }
  if (preview.canReserve) return preview.conflicts.length ? invalid : null;
  if (preview.conflicts.some(item => item?.code === 'MEMBER_RENTAL_LIMIT')) {
    return { code: 'MEMBER_RENTAL_LIMIT', status: 409, message: '기존 예약을 취소하거나 대여를 반납한 뒤 새로 예약하세요.' };
  }
  const conflicts = preview.conflicts.filter(item => item && ['SLOT_CONFLICT', 'INSUFFICIENT_SWITCH_TIME'].includes(item.code));
  const conflict = conflicts.find(item => item.code === 'SLOT_CONFLICT') || conflicts[0];
  if (!conflict) return { ...invalid, message: '서버에서 예약을 거절했지만 충돌 상세를 제공하지 않았습니다. 예약 가능 시간을 다시 조회하세요.' };
  const switching = conflict.code === 'INSUFFICIENT_SWITCH_TIME';
  const seconds = preview.minimumSwitchSeconds;
  const gap = Number.isSafeInteger(seconds) && seconds >= 0 ? `${seconds % 60 === 0 ? `${seconds / 60}분` : `${seconds}초`} 이상의 ` : '';
  const messages = [switching ? `서버 확인 결과, 기존 예약과 전환 준비 시간 ${gap}간격이 필요합니다.` : '서버 확인 결과, 선택한 시간과 겹치는 예약 또는 차단 구간이 있습니다.'];
  const candidate = interval(conflict.candidate?.startAt, conflict.candidate?.endAt);
  const blocked = interval(conflict.blockedStart, conflict.blockedEnd);
  if (candidate) messages.push(`충돌한 신청 시간: ${candidate}`);
  if (blocked) messages.push(`서버가 반환한 차단 구간: ${blocked}`);
  if (conflicts.length > 1) messages.push(`이외 충돌 ${conflicts.length - 1}건이 있습니다.`);
  messages.push('시간은 한국 시간 기준입니다. 예약 가능 시간을 다시 확인하세요.');
  return { code: conflict.code, message: messages.join('\n'), status: 409 };
}

module.exports = { reservationPreviewFailure };
