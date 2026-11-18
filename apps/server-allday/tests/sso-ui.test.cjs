const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const babel = require('@babel/core');
const { code } = babel.transformSync(fs.readFileSync(path.join(__dirname, '../App.jsx'), 'utf8'), {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
});
const initialActor = { memberId: 83, role: 'USER', authorities: ['ROLE_KUMOH'], rentalEligible: true };

// Actual App JSX, controlled hooks/API/timing. Browser and live cookie tests are separate.
function app(options = {}) {
  const cells = []; let cursor = 0; let effects; let tree; let poll; let dirty; let restores = 0; let cookieActive = true;
  const redirects = [];
  const api = {
    dispose: () => {},
    me: async () => { if (options.unavailable) throw Object.assign(new Error('인증 서비스 오류'), { status: 503 }); return options.currentActor || initialActor; },
    servers: async () => [], categories: async () => [], rentals: async () => [], adminCategories: async () => [],
    logout: async () => { if (!options.logoutKeepsCookie) cookieActive = false; throw new Error('로그아웃 응답 손실'); },
  };
  const state = initial => {
    const i = cursor++; if (!cells[i]) cells[i] = { value: typeof initial === 'function' ? initial() : initial };
    return [cells[i].value, value => { const next = typeof value === 'function' ? value(cells[i].value) : value; if (!Object.is(next, cells[i].value)) dirty = true; cells[i].value = next; }];
  };
  const hooks = { __esModule: true, default: React, useState: state, useRef: value => state(() => ({ current: value }))[0],
    useCallback: (fn, deps) => { const i = cursor++; if (!cells[i] || deps.some((v, j) => !Object.is(v, cells[i].deps[j]))) cells[i] = { fn, deps }; return cells[i].fn; },
    useEffect: (fn, deps) => { const i = cursor++; if (!cells[i] || deps.some((v, j) => !Object.is(v, cells[i].deps[j]))) { cells[i]?.cleanup?.(); cells[i] = { deps }; effects.push(() => { cells[i].cleanup = fn(); }); } },
  };
  const localRequire = name => {
    if (name === './global.css') return {};
    if (name === 'react') return hooks;
    if (name === 'react-native') return { Platform: { OS: 'web' }, useWindowDimensions: () => ({ width: 1280 }), ...Object.fromEntries(['View', 'Text', 'Pressable', 'ScrollView', 'TextInput', 'ActivityIndicator'].map(x => [x, x])) };
    if (name === 'react-native-safe-area-context') return { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' };
    if (name === './src/components/ui') return Object.fromEntries(['Button', 'Dialog', 'Heading', 'Icon', 'Notice', 'inputClass'].map(x => [x, x]));
    if (name === './src/api') return { ApiError: Error, actorFromProfile: v => v, clearStoredBackendSession: () => {}, requestKey: () => 'test-key', restoreBackendSession: async () => null,
      restoreSsoSession: async () => {
        if (options.restoreUnavailable) throw Object.assign(new Error('대여 서버 연결 실패'), { status: 503 });
        if (options.signedOut || !cookieActive) return null;
        return { actor: restores++ ? (options.currentActor || initialActor) : initialActor, client: api, servers: [], url: 'https://board.example' };
      },
    };
    if (name === './src/polling.cjs') return { mergeRentalUpdate: (_a, b) => b, mergeVersionedUpdate: (_a, b) => b,
      createVisiblePoller: ({ task }) => { poll = task; return { refresh: () => task().catch(() => {}), stop: () => {} }; } };
    if (name.endsWith('.cjs')) return { normalizeServer: v => v, normalizeRental: v => v };
    return { __esModule: true, default: name };
  };
  const module = { exports: {} }; new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  const storage = new Map(); const location = { origin: 'https://board.example', href: options.href || 'https://board.example/allday/', replace: value => redirects.push(value), assign: value => redirects.push(value) };
  global.window = { location, sessionStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) }, history: { state: null, replaceState: (_a, _b, url) => { location.href = String(url); } } };
  function render() { cursor = 0; effects = []; dirty = false; tree = module.exports.default(); for (const effect of effects) effect(); }
  async function settle() { for (let i = 0; i < 20; i++) { render(); await new Promise(resolve => setImmediate(resolve)); if (!dirty) return; } throw new Error('Unstable render'); }
  function nodes(node) { if (Array.isArray(node)) return node.flatMap(nodes); if (!React.isValidElement(node)) return []; return [node, ...nodes(node.props.children)]; }
  const text = node => Array.isArray(node) ? node.map(text).join('') : React.isValidElement(node) ? text(node.props.children) : typeof node === 'string' ? node : '';
  const component = type => nodes(tree).find(node => node.type === type);
  return { settle, header: () => component('./src/components/AppHeader'), component, text: () => text(tree), redirects,
    button: label => nodes(tree).find(node => node.type === 'Button' && text(node) === label),
    poll: async () => { await poll().catch(() => {}); await settle(); },
    close: () => { for (const cell of cells) cell?.cleanup?.(); delete global.window; },
  };
}
async function run(options, check, enabled = true) {
  const previous = process.env.EXPO_PUBLIC_SEBOARD_SSO_ENABLED;
  process.env.EXPO_PUBLIC_SEBOARD_SSO_ENABLED = String(enabled);
  const view = app(options);
  try { await view.settle(); await check(view); }
  finally { view.close(); if (previous === undefined) delete process.env.EXPO_PUBLIC_SEBOARD_SSO_ENABLED; else process.env.EXPO_PUBLIC_SEBOARD_SSO_ENABLED = previous; }
}

test('a failed logout response followed by signed-out confirmation clears the old user and shows login', () => run({}, async view => {
  await view.header().props.onSignOut(); await view.settle();
  assert.equal(view.header(), undefined); assert.match(view.component('./src/screens/LoginScreen').props.initialNotice, /로그아웃했습니다/);
  assert.deepEqual(view.redirects, []);
}));
test('a failed logout retaining a valid cookie restores the user and reports the failure', () => run({ logoutKeepsCookie: true }, async view => {
  await view.header().props.onSignOut(); await view.settle();
  assert.equal(view.header().props.actor.memberId, 83); assert.match(view.text(), /로그아웃을 확인하지 못했습니다/);
}));
test('member changes with identical permissions replace the account rather than merging user data', () => run({ currentActor: { ...initialActor, memberId: 99 } }, async view => {
  assert.equal(view.header().props.actor.memberId, 99); assert.deepEqual(view.redirects, []);
}));
test('callback failures are consumed and displayed even with an existing session', () => run({ href: 'https://board.example/allday/?sso=unavailable' }, async view => {
  assert.ok(view.header()); assert.doesNotMatch(window.location.href, /sso=/); assert.match(view.text(), /SE 게시판 인증을 확인할 수 없습니다/);
}));
test('fresh visits show SSO login and start it with a full navigation', () => run({ signedOut: true, href: 'https://board.example/allday/?sso=expired' }, async view => {
  const login = view.component('./src/screens/LoginScreen'); assert.match(login.props.initialNotice, /만료/);
  login.props.onSso(); assert.deepEqual(view.redirects, ['/api/v1/sso/start']);
}));
test('503 retains the user and reports the authentication error', () => run({ unavailable: true }, async view => {
  await view.poll(); assert.equal(view.header().props.actor.memberId, 83); assert.deepEqual(view.redirects, []); assert.match(view.text(), /인증 서비스 오류/);
}));
test('local password mode stays available when SSO is disabled', () => run({}, async view => {
  assert.equal(view.component('./src/screens/LoginScreen').props.onSso, null); assert.equal(view.header(), undefined);
}, false));
test('initial rental outage exposes a full-page return to the board without logging out', () => run({ restoreUnavailable: true }, async view => {
  assert.match(view.text(), /서버 대여를 불러오지 못했습니다/);
  const back = view.button('SE 게시판으로 돌아가기'); assert.ok(back);
  back.props.onPress(); assert.deepEqual(view.redirects, ['/']);
  assert.equal(view.header(), undefined);
}));
