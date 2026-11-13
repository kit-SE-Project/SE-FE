const ELIGIBLE = ['RESERVED', 'PROVISIONING', 'READY'];

function canRentNow(rental) {
  return !!rental && ELIGIBLE.includes(rental.status)
    && ['id', 'serverId', 'memberId'].every(field => Number.isSafeInteger(rental[field]) && rental[field] > 0)
    && Number.isSafeInteger(rental.version) && rental.version >= 0;
}

function aborted() { const error = new Error('즉시 대여 진행을 중단했습니다.'); error.name = 'AbortError'; return error; }
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(aborted()); return; }
    const stop = () => { clearTimeout(timer); reject(aborted()); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', stop); resolve(); }, ms);
    signal?.addEventListener('abort', stop, { once: true });
  });
}

// The attempt survives a manual retry so an uncertain HTTP response is replayed
// with the same idempotency key AND original version/body.
async function runImmediateRental({ api, rental, reason, attempt, requestKey, signal,
  onDetail = () => {}, onStage = () => {}, pause = wait, now = Date.now, timeoutMs = 600000 }) {
  if (!canRentNow(rental)) throw new Error('즉시 대여할 예약을 다시 선택하세요.');
  reason = reason.trim();
  if (!reason || reason.length > 500) throw new Error('즉시 대여 사유를 1~500자로 입력하세요.');
  const deadline = now() + timeoutMs;
  const guard = () => { if (signal?.aborted) throw aborted(); };
  const mutate = async (method, current) => {
    guard();
    if (!attempt[method]) attempt[method] = { rental: { id: current.id, serverId: current.serverId, memberId: current.memberId, version: current.version }, reason, key: requestKey(), accepted: false };
    const saved = attempt[method];
    if (!saved.accepted) {
      try { await api[method](saved.rental, saved.reason, saved.key); saved.accepted = true; }
      catch (error) {
        // A definite rejection can be retried against newly fetched state.
        if (error.status >= 400 && error.status < 500 && error.status !== 408) delete attempt[method];
        throw error;
      }
    }
    guard();
  };
  onStage('checking');
  while (now() < deadline) {
    guard();
    const current = await api.detail(rental.id);
    guard();
    if (!current || ['id', 'serverId', 'memberId'].some(field => current[field] !== rental[field])
      || !Number.isSafeInteger(current.version) || current.version < 0 || !Array.isArray(current.jobs)) {
      throw new Error('예약 대상이나 최신 상태를 확인하지 못했습니다. 목록을 다시 조회하세요.');
    }
    onDetail(current);
    if (Number.isSafeInteger(rental.desiredRevision) && current.desiredRevision !== rental.desiredRevision) {
      throw new Error('예약의 실행 조건이 변경되었습니다. 목록에서 상태를 다시 확인하세요.');
    }
    if (current.status === 'ACTIVE') { onStage('active'); return current; }
    if (!ELIGIBLE.includes(current.status)) throw new Error('즉시 대여를 계속할 수 없는 상태입니다. 목록에서 예약 상태를 확인하세요.');
    const jobs = current.jobs.filter(job => job.desiredRevision === current.desiredRevision);
    const failed = jobs.find(job => ['PREPARE', 'START'].includes(job.type) && job.status === 'FAILED');
    if (failed) throw new Error(`서버 ${failed.type === 'PREPARE' ? '준비' : '시작'} 작업이 실패했습니다.${failed.reasonCode ? ` (${failed.reasonCode})` : ''} 관리자 로그를 확인하세요.`);
    const firstStart = Date.parse(current.slots?.[0]?.startAt || current.contractStart);
    const alreadyDue = Number.isFinite(firstStart) && firstStart <= now();

    // Resolve an uncertain write before constructing another request/version.
    for (const method of ['prepareNow', 'startNow']) {
      if (attempt[method] && !attempt[method].accepted) await mutate(method, current);
    }
    if (current.status === 'RESERVED') {
      onStage('preparing');
      const preparing = jobs.some(job => job.type === 'PREPARE' && ['RUNNING', 'SUCCEEDED'].includes(job.status));
      if (!alreadyDue && !preparing && !attempt.prepareNow?.accepted) await mutate('prepareNow', current);
    } else if (current.status === 'PROVISIONING') {
      onStage('preparing');
    } else if (current.status === 'READY') {
      onStage('starting');
      // Lifecycle creates the START intent asynchronously after reservation.
      if (!alreadyDue && jobs.some(job => job.type === 'START' && job.status === 'PENDING') && !attempt.startNow?.accepted) {
        await mutate('startNow', current);
      }
    }
    guard();
    await pause(2000, signal);
  }
  throw new Error('상태 확인 시간이 초과되었습니다. 접수된 작업은 계속될 수 있으니 목록에서 상태를 확인한 뒤 다시 시도하세요.');
}

module.exports = { canRentNow, runImmediateRental };
