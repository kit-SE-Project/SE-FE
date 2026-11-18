// Local visual-test API only. Never imported by the app or connected to real equipment.
const http = require('node:http');
const contract = require('./contracts/public-api.json');
const sample = contract.examples.find(value => value.response.status === 200 && /^\/api\/v1\/rentals\/\d+$/.test(value.request.path)).response.body;
const serverModel = { id: 1, version: 1, displayName: '작업 상태 UI 시험 서버', categoryId: 1, nodeName: 'ui-test-only', cpuModel: '시험 CPU', memoryGb: 64, gpuModel: '시험 GPU', status: 'AVAILABLE', reservationAllowed: true };
let reads = 0;
let tokenGeneration = 0;
let refreshToken = null;
const accessTokens = new Set();
function issueTokens() {
  tokenGeneration++;
  const accessToken = `ui-fixture-access-${tokenGeneration}`;
  refreshToken = `ui-fixture-refresh-${tokenGeneration}`;
  accessTokens.add(accessToken);
  return { accessToken, refreshToken };
}
const started = new Date().toISOString();
const reservedScenario = process.argv.includes('--reserved');
const adminScenario = process.argv.includes('--admin');
const forceListScenario = process.argv.includes('--force-list');
const accessScenario = process.argv.includes('--access-check');
let accessPhase = 'active'; let accessVersion = 1;
const server = http.createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (['http://localhost:3000', 'http://127.0.0.1:3000'].includes(origin)) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  const send = (status, value) => { response.writeHead(status); response.end(JSON.stringify(value)); };
  if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
  const url = new URL(request.url, 'http://127.0.0.1:18089');
  console.log(JSON.stringify({ at: new Date().toISOString(), method: request.method, path: url.pathname }));
  if (accessScenario && request.method === 'GET' && url.pathname === '/__fixture/access') {
    const phase = url.searchParams.get('phase');
    if (!['active', 'maintenance', 'resumed', 'returning', 'returned'].includes(phase)) { send(400, {}); return; }
    accessPhase = phase; accessVersion++; send(200, { phase, version: accessVersion }); return;
  }
  if (request.method === 'POST' && url.pathname === '/formLogin') {
    let text = '';
    for await (const chunk of request) { text += chunk; if (text.length > 1024) { send(413, {}); return; } }
    const form = new URLSearchParams(text);
    if (form.get('username') !== 'tracking-test' || form.get('password') !== 'local-preview-only') { send(401, { message: 'UI 시험 계정만 사용합니다.' }); return; }
    send(200, issueTokens()); return;
  }
  if (request.method === 'POST' && url.pathname === '/refresh') {
    let text = '';
    for await (const chunk of request) { text += chunk; if (text.length > 1024) { send(413, {}); return; } }
    try {
      if (!refreshToken || JSON.parse(text).refreshToken !== refreshToken) { send(401, { code: 'INVALID_OR_EXPIRED_TOKEN' }); return; }
    } catch { send(400, {}); return; }
    send(200, issueTokens()); return;
  }
  if (!accessTokens.has((request.headers.authorization || '').replace(/^Bearer /, ''))) { send(401, {}); return; }
  if (request.method === 'POST' && url.pathname === '/logoutProc') {
    refreshToken = null; accessTokens.clear(); send(200, { loggedOut: true }); return;
  }
  if (request.method !== 'GET') { send(405, {}); return; }
  if (url.pathname === '/api/v1/me') send(200, { memberId: adminScenario ? 9001 : 1001, role: adminScenario ? 'ADMIN' : 'STUDENT', authorities: [adminScenario ? 'ROLE_ADMIN' : 'ROLE_USER'], rentalEligible: true });
  else if (url.pathname === '/mypage') send(200, { accountId: 1, userId: 1, memberId: adminScenario ? 9001 : 1001, nickname: '시험 사용자', email: 'fixture@example.invalid', roles: [adminScenario ? 'ROLE_ADMIN' : 'ROLE_USER'], rentalEligible: true, mode: 'DEMO' });
  else if (url.pathname === '/api/v1/servers') send(200, [{ ...serverModel, ...(accessScenario ? { status: accessPhase === 'maintenance' ? 'MAINTENANCE' : 'AVAILABLE', version: accessVersion } : {}) }]);
  else if (['/api/v1/categories', '/api/v1/admin/categories'].includes(url.pathname)) send(200, [{ id: 1, name: 'UI 시험', version: 0 }]);
  else if (url.pathname === '/api/v1/rentals' || url.pathname === '/api/v1/rentals/101' || (adminScenario && url.pathname === '/api/v1/admin/rentals')) {
    if (url.pathname.endsWith('/101')) reads++;
    const value = { ...sample, id: 101, serverId: 1, memberId: 1001, desiredRevision: 1, status: reservedScenario ? 'RESERVED' : 'PROVISIONING', purpose: '작업 모니터 화면 시험',
      serverSnapshot: { ...sample.serverSnapshot, displayName: serverModel.displayName },
      jobs: reservedScenario ? Array.from({ length: 40 }, (_, index) => ({ id: 2600 + index, type: index % 2 ? 'STOP' : 'START', status: 'PENDING', step: 'QUEUED', retryCount: 0, nextRunAt: '2026-11-18T00:00:00Z', reasonCode: null, desiredRevision: 1 })) : [
        { id: 51, type: 'PREPARE', status: 'RUNNING', step: reads % 2 ? 'CLONE_WAIT' : 'CONFIGURE_VM', retryCount: 1, nextRunAt: started, reasonCode: null, desiredRevision: 1 },
        { id: 50, type: 'START', status: 'FAILED', step: 'SSH_CHECK', retryCount: 2, nextRunAt: started, reasonCode: 'SSH_NOT_READY', desiredRevision: 0 },
      ] };
    if (accessScenario) Object.assign(value, { status: ['returning', 'returned'].includes(accessPhase) ? accessPhase.toUpperCase() : 'ACTIVE', version: accessVersion, jobs: [], purpose: '점검과 접속 안내 화면 시험' });
    const { slots, jobs, ...summary } = value;
    const adminRows = forceListScenario ? [
      { ...summary, id: 101, memberId: 1001, status: 'RESERVED', purpose: '모델 학습 예약', contractStart: '2026-11-02T08:00:00+09:00', contractEnd: '2026-11-04T15:00:00+09:00' },
      { ...summary, id: 102, memberId: 2002, status: 'ACTIVE', purpose: '데이터 전처리', contractStart: '2026-10-23T08:00:00+09:00', contractEnd: '2026-10-23T15:00:00+09:00', version: 7 },
      { ...summary, id: 103, memberId: 2002, status: 'RESERVED', purpose: '다음 주 별도 예약', contractStart: '2026-11-09T16:00:00+09:00', contractEnd: '2026-11-09T23:00:00+09:00', version: 3 },
      { ...summary, id: 104, memberId: 3003, status: 'RETURNING', purpose: '이미 반납 처리 중인 대여' },
      { ...summary, id: 105, memberId: 4004, status: 'RETURNED', purpose: '종료된 대여' },
    ] : [summary];
    send(200, url.pathname.endsWith('/101') ? value : url.pathname === '/api/v1/admin/rentals' ? adminRows : [summary]);
  } else if (accessScenario && url.pathname === '/api/v1/rentals/101/connection') send(200, { available: true, host: 'vm.example.invalid', port: 7540, username: 'r101', sshCommand: 'ssh -o HostKeyAlias=allday-r101 -p 7540 r101@vm.example.invalid', jupyterTunnelCommand: 'ssh -N -L 8888:127.0.0.1:8888 -o HostKeyAlias=allday-r101 -p 7540 r101@vm.example.invalid' });
  else if (accessScenario && url.pathname === '/api/v1/rentals/101/credential') send(200, { password: 'fixture-only-password' });
  else if (url.pathname === '/api/v1/rentals/101/events') send(200, [
    { id: 2, jobId: 51, beforeStatus: 'RESERVED', afterStatus: 'PROVISIONING', step: 'CLONE_WAIT', reasonCode: null, createdAt: started },
    { id: 1, jobId: 50, beforeStatus: 'PROVISIONING', afterStatus: 'PROVISIONING', step: 'SSH_CHECK', reasonCode: 'SSH_NOT_READY', createdAt: started },
  ]);
  else send(404, { message: 'UI 시험에서 제공하지 않는 경로입니다.' });
});
server.listen(18089, '127.0.0.1', () => console.log('UI-only fixture: http://127.0.0.1:18089'));
