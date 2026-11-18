const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const babel = require('@babel/core');
const { normalizeSystemLogs, systemLogTime, systemLogStatus } = require('../src/system-logs.cjs');

const event = { id: 31, rentalId: 101, createdAt: '2026-10-28T00:30:00Z', source: 'WORKER', requestId: 'log-request-31', beforeStatus: 'RETURNING', afterStatus: 'RETURNED', step: 'VERIFIED', reasonCode: 'RETURN_VERIFIED', reasonText: '반납 자원 정리 확인' };

test('system logs retain persisted reasons and correlation fields without copying unrelated credential fields', () => {
  const [row] = normalizeSystemLogs([{ ...event, password: 'must-not-copy', accessToken: 'must-not-copy', credential: { password: 'must-not-copy' } }]);
  assert.deepEqual(row, event);
  assert.equal(systemLogTime(row.createdAt), '2026-10-28 09:30:00');
  assert.equal(systemLogTime('invalid'), '-');
  assert.equal(systemLogStatus('RETURNED'), '반납 완료');
  assert.equal(systemLogStatus(null), '-');
});

test('system log responses are validated, deduplicated and sorted by occurrence time', () => {
  const rows = normalizeSystemLogs([event, { ...event, id: 30, createdAt: '2026-10-28T00:29:00Z' }, event]);
  assert.deepEqual(rows.map(row => row.id), [31, 30]);
  assert.deepEqual(normalizeSystemLogs([]), []);
  for (const value of [null, {}, [{ ...event, rentalId: null }], [{ ...event, createdAt: 'invalid' }], [{ ...event, reasonCode: {} }]]) assert.throws(() => normalizeSystemLogs(value), /시스템 로그 응답/);
  assert.equal(normalizeSystemLogs([{ ...event, reasonCode: null, reasonText: null }])[0].reasonCode, '');
});

test('system logs use the existing authenticated admin API, honor its limit and preserve access-denied errors', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/api.js'), 'utf8');
  const { createApi } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const original = global.fetch;
  try {
    global.fetch = async url => new Response(JSON.stringify(url.endsWith('/formLogin') ? { accessToken: 'log-test-access', refreshToken: 'log-test-refresh' } : {}), { status: 200 });
    const api = createApi('http://contract.invalid'); await api.login('log-test-user', 'log-test-password');
    let calls = 0;
    global.fetch = async (url, options) => {
      calls++;
      assert.equal(new URL(url).pathname, '/api/v1/admin/events');
      assert.equal(new URL(url).searchParams.get('limit'), '100');
      assert.equal(options.method, 'GET');
      assert.equal(options.headers.Authorization, 'Bearer log-test-access');
      assert.equal(options.cache, 'no-store');
      return new Response(JSON.stringify([event]), { status: 200 });
    };
    assert.deepEqual(await api.systemEvents(), [event]);
    for (const limit of [0, 201, 1.5, '100']) await assert.rejects(api.systemEvents(limit), error => error.code === 'INVALID_LIMIT');
    assert.equal(calls, 1);
    global.fetch = async () => new Response(JSON.stringify({ code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.' }), { status: 403 });
    await assert.rejects(api.systemEvents(), error => error.status === 403 && error.code === 'FORBIDDEN');
    api.dispose();
  } finally { global.fetch = original; }
});

const compiled = new Map();
function loadJsx(file) {
  if (compiled.has(file)) return compiled.get(file);
  const filename = path.join(__dirname, '..', file);
  const realRequire = createRequire(filename);
  const host = ({ children }) => React.createElement('div', null, children);
  const ui = { Heading: host, Panel: host, Button: host, Notice: host, Icon: () => null, Badge: ({ status }) => React.createElement('span', null, systemLogStatus(status)), Timeline: () => React.createElement('span', null, '진행 단계') };
  const localRequire = name => {
    if (name === 'react-native') return { View: host, Text: host, Pressable: host, ScrollView: host, ActivityIndicator: () => null, useWindowDimensions: () => ({ width: 1120, height: 900 }) };
    if (name === './ui' || name === '../components/ui') return ui;
    if (name === '../components/RentalProgress') return loadJsx('src/components/RentalProgress.jsx');
    if (name === '../components/RentalConnection') return { __esModule: true, default: () => React.createElement('span', null, '접속 정보') };
    return realRequire(name);
  };
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  compiled.set(file, module.exports);
  return module.exports;
}

test('user rental details and progress never render reason codes, reason text or last-checked timestamps', () => {
  const rental = { id: 101, serverId: 57, serverName: '대여 서버', status: 'ACTIVE', from: '2026-11-01', to: '2026-11-05', band: 'AFTERNOON', purpose: '프로젝트', reasonCode: 'INTERNAL_ONLY_REASON', reasonText: 'INTERNAL_ONLY_NOTE', jobs: [] };
  const MyRentalsScreen = loadJsx('src/screens/MyRentalsScreen.jsx').default;
  const RentalProgress = loadJsx('src/components/RentalProgress.jsx').default;
  const user = renderToStaticMarkup(React.createElement(MyRentalsScreen, { rentals: [rental], servers: [], api: {} }));
  const progress = renderToStaticMarkup(React.createElement(RentalProgress, { rental: { ...rental, status: 'RETURNED', reasonCode: 'RETURN_VERIFIED' }, api: {} }));
  for (const content of [user, progress]) for (const hidden of ['상태 사유', '마지막 확인', '마지막으로 확인한', 'INTERNAL_ONLY_REASON', 'INTERNAL_ONLY_NOTE', 'RETURN_VERIFIED']) assert.equal(content.includes(hidden), false, hidden);
  assert.ok(user.includes('프로젝트')); assert.ok(user.includes('대여가 진행 중입니다.')); assert.ok(progress.includes('반납이 완료되었습니다.'));
});

test('administrator system-log rows show the persisted reason in both desktop and mobile layouts', () => {
  const { SystemLogRows } = loadJsx('src/components/AdminSystemLogs.jsx');
  for (const mobile of [false, true]) {
    const output = renderToStaticMarkup(React.createElement(SystemLogRows, { rows: normalizeSystemLogs([event]), mobile }));
    for (const value of ['RETURN_VERIFIED', '반납 자원 정리 확인', 'log-request-31', '2026-10-28 09:30:00', '#101']) assert.ok(output.includes(value), value);
  }
});

test('the rental screen renders authoritative contract hours after an immediate start', () => {
  const MyRentalsScreen = loadJsx('src/screens/MyRentalsScreen.jsx').default;
  const rental = { id: 101, serverId: 57, serverName: '대여 서버', status: 'ACTIVE', band: 'AFTERNOON',
    contractStart: '2026-11-03T07:27:01Z', contractEnd: '2026-11-03T08:46:15Z', purpose: '접속 검증', jobs: [] };
  const output = renderToStaticMarkup(React.createElement(MyRentalsScreen, { rentals: [rental], servers: [], api: {} }));
  assert.ok(output.includes('16:27 ~ 17:46 (KST)'));
  assert.equal(output.includes('16:00 - 23:00'), false);
});
