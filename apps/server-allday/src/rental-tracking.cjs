const { browserVisibility } = require('./polling.cjs');
const JOB_STATUS = {
  PENDING: '대기', RUNNING: '실행 중', SUCCEEDED: '성공', FAILED: '실패',
  CANCELLED: '취소', SUPERSEDED: '새 요청으로 대체됨',
};
const JOB_TYPE = {
  PREPARE: 'VM 준비', START: 'VM 시작', STOP: 'VM 정지', SWITCH: '사용자 변경',
  RETURN: '최종 반납', RESET_CREDENTIAL: '비밀번호 재설정',
};
const STEP_LABEL = { QUEUED: '작업 대기' };
const TERMINAL = ['RETURNED', 'CANCELLED'];
const STOP_ERRORS = [401, 403, 404];
const activeJob = job => ['PENDING', 'RUNNING'].includes(job.status);
const RENTAL_SUMMARY = {
  RESERVED: '예약 일정에 맞춰 서버가 준비됩니다.',
  PROVISIONING: '대여 환경을 준비하고 있습니다.',
  READY: '접속 준비가 완료되었습니다.',
  ACTIVE: '대여가 진행 중입니다.',
  RETAINED: '다음 이용 시간까지 대기 중입니다.',
  RETURNING: '반납 및 데이터 정리를 진행하고 있습니다.',
  RETURNED: '반납이 완료되었습니다.',
  CANCELLED: '예약이 취소되었습니다.',
};
const RUNNING_SUMMARY = {
  PREPARE: '대여 환경을 준비하고 있습니다.', START: '서버를 시작하고 있습니다.',
  STOP: '이번 이용 시간을 마무리하고 있습니다.', SWITCH: '서버 연결을 변경하고 있습니다.',
  RETURN: '반납 및 데이터 정리를 진행하고 있습니다.', RESET_CREDENTIAL: '접속 비밀번호를 변경하고 있습니다.',
};

function currentWorkSummary(rental) {
  const text = RENTAL_SUMMARY[rental.status] || '현재 대여 상태를 확인하고 있습니다.';
  if (TERMINAL.includes(rental.status)) return { text, running: false };
  const running = (Array.isArray(rental.jobs) ? rental.jobs : [])
    .filter(job => job.status === 'RUNNING' && (!Number.isSafeInteger(rental.desiredRevision) || job.desiredRevision === rental.desiredRevision))
    .sort((a, b) => b.id - a.id)[0];
  if(!running && rental.status==='RETURNING') {
    const jobs=(rental.jobs||[]).filter(job=>job.type==='RETURN'&&(!Number.isSafeInteger(rental.desiredRevision)||job.desiredRevision===rental.desiredRevision));
    if(jobs.some(job=>job.status==='FAILED'))return {text:'반납 정리 작업이 실패했습니다. 아직 반납 완료가 아닙니다. 장비 연결과 오류를 확인하세요.',running:false,error:true};
    if(jobs.some(job=>job.status==='PENDING'&&job.reasonCode==='SERVER_OPERATION_PENDING'))return {text:'이전 작업의 결과를 확인하며 반납 복구를 기다리고 있습니다. 장비 연결과 진행 중인 작업을 확인하세요.',running:false,blocked:true};
  }
  return running ? { text: RUNNING_SUMMARY[running.type] || '현재 작업을 처리하고 있습니다.', running: true }
    : { text, running: false };
}

function rentalPollDelay(rental) {
  if (!rental || ['PROVISIONING', 'RETURNING'].includes(rental.status) || currentWorkSummary(rental).running) return 2000;
  return ['RESERVED', 'RETAINED'].includes(rental.status) ? 30000 : 15000;
}

const detailRequests = new WeakMap();
function sharedDetail(api, rentalId) {
  let requests = detailRequests.get(api);
  if (!requests) { requests = new Map(); detailRequests.set(api, requests); }
  if (!requests.has(rentalId)) {
    const pending = Promise.resolve().then(() => api.detail(rentalId)).finally(() => {
      if (requests.get(rentalId) === pending) requests.delete(rentalId);
    });
    requests.set(rentalId, pending);
  }
  return requests.get(rentalId);
}

function trackingTime(value, date = true) {
  if (!value || !Number.isFinite(Date.parse(value))) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', ...(date ? { month: '2-digit', day: '2-digit' } : {}),
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date(value));
}

function jobRows(jobs) {
  const priority = { RUNNING: 0, FAILED: 1, PENDING: 2, SUCCEEDED: 3, CANCELLED: 4, SUPERSEDED: 5 };
  return [...jobs].sort((a, b) => (priority[a.status] ?? 6) - (priority[b.status] ?? 6) || b.id - a.id)
    .map(job => ({ ...job, typeLabel: JOB_TYPE[job.type] || job.type || '작업',
      statusLabel: JOB_STATUS[job.status] || `상태 미확인 (${job.status || '-'})`,
      stepLabel: STEP_LABEL[job.step] || job.step || '단계 정보 없음',
      retryLabel: Number.isSafeInteger(job.retryCount) && job.retryCount >= 0 ? `${job.retryCount}회` : '-',
      nextRunLabel: job.status === 'PENDING' ? trackingTime(job.nextRunAt) : null,
    }));
}

function recentEvents(events) {
  const unique = new Map();
  for (const event of events) if (event && Number.isSafeInteger(event.id)) unique.set(event.id, event);
  return [...unique.values()].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0) || b.id - a.id).slice(0, 10);
}

function invalidResponse() {
  const error = new Error('작업 상태 응답 형식이 명세와 다릅니다.');
  error.code = 'INVALID_RESPONSE';
  return error;
}

function createRentalTracker({ api, rentalId, onDetail, onEvents = () => {}, onError, onEventError = () => {}, includeEvents = true,
  interval = 2000, adaptive = false, visibility = browserVisibility, schedule = setTimeout, cancel = clearTimeout }) {
  let stopped = false; let halted = false; let pending = null; let timer = null; let failures = 0; let eventsBlocked = false;
  const clearTimer = () => { if (timer !== null) cancel(timer); timer = null; };
  const refresh = () => {
    if (stopped || halted || !visibility.isVisible()) return Promise.resolve();
    if (pending) return pending;
    clearTimer();
    pending = (async () => {
      const results = await Promise.allSettled([
        sharedDetail(api, rentalId),
        !includeEvents || eventsBlocked ? Promise.resolve(null) : Promise.resolve().then(() => api.rentalEvents(rentalId)),
      ]);
      if (stopped) return;
      const [detail, events] = results;
      let again = true; let nextInterval = interval;
      if (detail.status === 'fulfilled') {
        const value = detail.value;
        if (!value || value.id !== rentalId || typeof value.status !== 'string' || !Array.isArray(value.jobs) || value.jobs.some(job => !job || !Number.isSafeInteger(job.id)
          || typeof job.type !== 'string' || typeof job.status !== 'string' || typeof job.step !== 'string'
          || !Number.isSafeInteger(job.retryCount) || job.retryCount < 0
          || (job.reasonCode != null && typeof job.reasonCode !== 'string'))) {
          failures++; onError(invalidResponse());
        } else {
          failures = 0; onError(null); onDetail(value);
          again = !TERMINAL.includes(value.status) || value.jobs.some(activeJob);
          if (adaptive) nextInterval = rentalPollDelay(value);
        }
      } else {
        failures++; onError(detail.reason);
        if (STOP_ERRORS.includes(detail.reason?.status)) halted = true;
      }
      if (includeEvents && !eventsBlocked) {
        if (events.status === 'fulfilled') {
          if (Array.isArray(events.value) && events.value.every(event => event && Number.isSafeInteger(event.id)
            && ['beforeStatus', 'afterStatus', 'step', 'reasonCode'].every(key => event[key] == null || typeof event[key] === 'string'))) {
            onEvents(recentEvents(events.value)); onEventError(null);
          }
          else onEventError(invalidResponse());
        } else {
          onEventError(events.reason);
          if (STOP_ERRORS.includes(events.reason?.status)) {
            eventsBlocked = true;
            if (events.reason?.status === 401) halted = true;
          }
        }
      }
      if (!again) halted = true;
      if (!halted && visibility.isVisible()) timer = schedule(() => { timer = null; refresh(); }, Math.min(nextInterval * 2 ** Math.min(failures, 4), 30000));
    })().finally(() => { pending = null; });
    return pending;
  };
  const unsubscribe = visibility.subscribe(() => { clearTimer(); if (visibility.isVisible()) refresh(); });
  return { refresh, stop() { stopped = true; clearTimer(); unsubscribe(); } };
}

module.exports = { JOB_STATUS, JOB_TYPE, STEP_LABEL, jobRows, recentEvents, trackingTime, currentWorkSummary, rentalPollDelay, createRentalTracker };
