const { LABELS } = require('./domain.cjs');

function normalizeSystemLogs(value) {
  const nullableText = item => item == null || typeof item === 'string';
  if (!Array.isArray(value) || value.some(row => !row || !Number.isSafeInteger(row.id) || row.id <= 0
    || !Number.isSafeInteger(row.rentalId) || row.rentalId <= 0 || typeof row.createdAt !== 'string' || !Number.isFinite(Date.parse(row.createdAt))
    || ['source', 'requestId', 'beforeStatus', 'afterStatus', 'step', 'reasonCode', 'reasonText'].some(key => !nullableText(row[key])))) {
    throw new Error('시스템 로그 응답을 확인하지 못했습니다. 다시 조회하세요.');
  }
  const unique = new Map();
  for (const row of value) unique.set(row.id, {
    id: row.id, rentalId: row.rentalId, createdAt: row.createdAt,
    source: row.source || '', requestId: row.requestId || '',
    beforeStatus: row.beforeStatus || '', afterStatus: row.afterStatus || '',
    step: row.step || '', reasonCode: row.reasonCode || '', reasonText: row.reasonText || '',
  });
  return [...unique.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id);
}

function systemLogTime(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return '-';
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(value));
}

function systemLogStatus(status) { return LABELS[status] || status || '-'; }

module.exports = { normalizeSystemLogs, systemLogTime, systemLogStatus };
