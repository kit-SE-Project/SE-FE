const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const babel = require('@babel/core');
const contract = require('./contracts/category-api.json');

async function createClient() {
  const source = fs.readFileSync(path.join(__dirname, '../src/api.js'), 'utf8');
  const { createApi } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const api = createApi('https://category-contract.invalid');
  global.fetch = async url => new Response(JSON.stringify(url.endsWith('/formLogin')
    ? { accessToken: 'category-test-access', refreshToken: 'category-test-refresh' }
    : { memberId: 1, role: 'ADMIN', authorities: ['ROLE_ADMIN'], rentalEligible: true }));
  await api.login('category-test-user', 'category-test-password');
  return api;
}

test('category calls match the backend controller: admin list, JSON bodies, versions, keys and empty 204', async () => {
  const previous = global.fetch;
  try {
    const api = await createClient();
    const calls = [];
    global.fetch = async (url, options) => {
      const operation = contract.operations[calls.length];
      calls.push({ url: new URL(url), options });
      return new Response(operation.status === 204 ? null : JSON.stringify(operation.method === 'GET' ? [contract.category] : contract.category), { status: operation.status });
    };
    assert.deepEqual(await api.adminCategories(), [contract.category]);
    await api.createCategory(contract.operations[1].body, 'create-category');
    await api.editCategory(42, contract.operations[2].body, 'edit-category');
    assert.equal(await api.deleteCategory(42, 1, 'delete-category'), null);
    for (let index = 0; index < calls.length; index++) {
      const { url, options } = calls[index]; const operation = contract.operations[index];
      assert.equal(url.pathname, operation.path); assert.equal(options.method, operation.method);
      assert.equal(options.headers.Authorization, 'Bearer category-test-access');
      assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store');
      if (operation.body) {
        assert.deepEqual(JSON.parse(options.body), operation.body);
        assert.equal(options.headers['Content-Type'], 'application/json');
        assert.ok(options.headers['Idempotency-Key']);
      } else assert.equal(options.body, undefined);
    }
    api.dispose();
  } finally { global.fetch = previous; }
});

test('backend category errors retain HTTP status, code, message and request ID', async () => {
  const previous = global.fetch;
  try {
    const api = await createClient();
    for (const [code, status] of Object.entries(contract.errorStatuses)) {
      global.fetch = async () => new Response(JSON.stringify({ status, code, message: '카테고리 요청 거절', requestId: 'category-error-request' }), { status });
      await assert.rejects(api.deleteCategory(42, 1, 'category-error'), error => error.status === status && error.code === code && error.requestId === 'category-error-request' && error.message === '카테고리 요청 거절');
    }
    api.dispose();
  } finally { global.fetch = previous; }
});

// Run callbacks from the actual JSX using deterministic hooks; this is a behavior test, not browser/layout QA.
const { code: componentCode } = babel.transformSync(fs.readFileSync(path.join(__dirname, '../src/components/CategoryManager.jsx'), 'utf8'), {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
});
function manager(api, options = {}) {
  const cells = []; let cursor = 0; let effects = []; let tree; let props;
  const state = initial => {
    const slot = cursor++;
    if (!cells[slot]) cells[slot] = { value: typeof initial === 'function' ? initial() : initial };
    return [cells[slot].value, value => { cells[slot].value = typeof value === 'function' ? value(cells[slot].value) : value; }];
  };
  const hooks = { __esModule: true, default: React, useState: state,
    useRef: initial => state(() => ({ current: initial }))[0],
    useEffect: (effect, dependencies) => {
      const slot = cursor++;
      if (!cells[slot] || dependencies.some((value, index) => !Object.is(value, cells[slot].dependencies[index]))) {
        cells[slot]?.cleanup?.(); cells[slot] = { dependencies };
        effects.push(() => { cells[slot].cleanup = effect(); });
      }
    },
  };
  let keys = 0;
  const localRequire = name => {
    if (name === 'react') return hooks;
    if (name === 'react-native') return { Text: 'Text', TextInput: 'TextInput', View: 'View' };
    if (name === './ui') return { Button: 'Button', Dialog: 'Dialog', Notice: 'Notice', Panel: 'Panel', inputClass: 'input' };
    if (name === '../api') return { requestKey: () => `category-key-${++keys}` };
    throw new Error(`Unexpected module: ${name}`);
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', componentCode)(localRequire, module, module.exports);
  props = { api, categories: [contract.category], onChanged: async () => {}, onClose: () => {}, ...options };
  function render(update = {}) { props = { ...props, ...update }; cursor = 0; effects = []; tree = module.exports.default(props); for (const effect of effects) effect(); return tree; }
  function elements(node) {
    if (Array.isArray(node)) return node.flatMap(value => elements(value));
    if (!React.isValidElement(node)) return [];
    return [node, ...elements(node.props.children)];
  }
  const text = node => Array.isArray(node) ? node.map(text).join('') : React.isValidElement(node) ? text(node.props.children) : typeof node === 'string' || typeof node === 'number' ? String(node) : '';
  const button = label => { const value = elements(tree).find(element => element.type === 'Button' && text(element) === label); assert.ok(value, `Missing button: ${label}`); return value; };
  const input = label => { const value = elements(tree).find(element => element.type === 'TextInput' && element.props.accessibilityLabel === label); assert.ok(value, `Missing input: ${label}`); return value; };
  render();
  return { render, button, input, hasButton: label => elements(tree).some(element => element.type === 'Button' && text(element) === label),
    press: label => { const target = button(label); assert.equal(!!target.props.disabled, false, `Disabled: ${label}`); return target.props.onPress(); },
    field: (label, value) => input(label).props.onChangeText(value),
    text: () => text(tree), title: () => tree.props.title,
    unmount: () => { for (const cell of cells) cell?.cleanup?.(); },
  };
}

test('category form validates limits and sends trimmed fields/null descriptions, then displays API success', async () => {
  const writes = []; let reloads = 0;
  const view = manager({ createCategory: async (...args) => writes.push(args) }, { onChanged: async () => { reloads++; } });
  view.press('카테고리 추가'); view.render();
  await view.press('저장'); view.render(); assert.match(view.text(), /이름을 입력/); assert.equal(writes.length, 0);
  view.field('카테고리 이름', 'x'.repeat(101)); view.render();
  await view.press('저장'); view.render(); assert.match(view.text(), /100자/); assert.equal(writes.length, 0);
  view.field('카테고리 이름', '  새 GPU 서버  '); view.field('카테고리 설명', 'x'.repeat(2001)); view.render();
  await view.press('저장'); view.render(); assert.equal(writes.length, 0);
  view.field('카테고리 설명', '   '); view.render();
  await view.press('저장'); view.render();
  assert.deepEqual(writes, [[{ name: '새 GPU 서버', description: null }, 'category-key-1']]);
  assert.equal(reloads, 1); assert.equal(view.title(), '카테고리 관리'); assert.match(view.text(), /추가했습니다/);
});

test('an ambiguous network failure retries the identical body and key, and prevents simultaneous submits', async () => {
  const writes = []; let release;
  const view = manager({ createCategory: async (...args) => { writes.push(args); if (writes.length === 1) throw new Error('연결 실패'); await new Promise(resolve => { release = resolve; }); } });
  view.press('카테고리 추가'); view.render(); view.field('카테고리 이름', '테스트'); view.render();
  await view.press('저장'); view.render(); assert.match(view.text(), /연결 실패/);
  const submit = view.button('저장').props.onPress;
  const pending = submit(); await submit(); view.render();
  assert.equal(writes.length, 2); assert.deepEqual(writes[0], writes[1]);
  assert.equal(view.button('처리 중').props.disabled, true);
  release(); await pending; view.render(); assert.match(view.text(), /추가했습니다/);
});

test('version conflicts reload before reselection and a fresh edit sends the new version and key', async () => {
  const writes = []; let reloads = 0;
  const view = manager({ editCategory: async (...args) => { writes.push(args); if (writes.length === 1) throw { code: 'VERSION_CONFLICT', status: 409, message: '카테고리가 변경되었습니다.', requestId: 'version-request' }; } }, { onChanged: async () => { reloads++; } });
  view.press('수정'); view.render(); await view.press('저장'); view.render({ categories: [{ ...contract.category, version: 3 }] });
  assert.equal(reloads, 1); assert.equal(view.title(), '카테고리 관리'); assert.match(view.text(), /다시 선택/); assert.match(view.text(), /version-request/);
  view.press('수정'); view.render(); await view.press('저장'); view.render();
  assert.equal(writes[0][1].expectedVersion, 0); assert.equal(writes[1][1].expectedVersion, 3); assert.notEqual(writes[0][2], writes[1][2]);
  assert.match(view.text(), /수정했습니다/);
});

test('confirmed deletes send the version; CATEGORY_IN_USE keeps the dialog and cancellation does not write', async () => {
  const writes = []; let rejectInUse = true;
  const view = manager({ deleteCategory: async (...args) => { writes.push(args); if (rejectInUse) throw { code: 'CATEGORY_IN_USE', status: 409, message: '연결된 서버를 다른 카테고리로 옮긴 뒤 삭제하세요.', requestId: 'in-use-request' }; } });
  view.press('삭제'); view.render(); view.press('취소'); view.render(); assert.equal(writes.length, 0);
  view.press('삭제'); view.render(); await view.press('삭제 확인'); view.render();
  assert.equal(view.title(), '카테고리 삭제 확인'); assert.match(view.text(), /다른 카테고리/); assert.match(view.text(), /in-use-request/);
  assert.deepEqual(writes[0].slice(0, 2), [42, 0]);
  rejectInUse = false; await view.press('삭제 확인'); view.render(); assert.deepEqual(writes[0], writes[1]); assert.match(view.text(), /삭제했습니다/);
});

test('committed save plus failed list refresh only retries the read, never a second mutation', async () => {
  let saves = 0; let reloads = 0;
  const view = manager({ createCategory: async () => { saves++; } }, { onChanged: async () => { if (++reloads === 1) return { error: new Error('조회 실패') }; } });
  view.press('카테고리 추가'); view.render(); view.field('카테고리 이름', '새 분류'); view.render();
  await view.press('저장'); view.render();
  assert.equal(view.title(), '카테고리 관리'); assert.match(view.text(), /추가했습니다.*다시 불러오지 못했습니다/);
  assert.equal(view.button('카테고리 추가').props.disabled, true); assert.equal(view.button('수정').props.disabled, true);
  await view.press('목록 다시 불러오기'); view.render();
  assert.equal(saves, 1); assert.equal(reloads, 2); assert.equal(view.button('카테고리 추가').props.disabled, false); assert.match(view.text(), /추가했습니다/);
});

test('missing versions never produce mutations and stale results after unmount/account switch do not refresh', async () => {
  let calls = 0; let reloads = 0; let release;
  const view = manager({ editCategory: async () => { calls++; } }, { categories: [{ ...contract.category, version: undefined }] });
  view.press('수정'); view.render(); await view.press('저장'); view.render(); assert.equal(calls, 0); assert.match(view.text(), /버전을 확인하지 못했습니다/);
  for (const abandon of ['unmount', 'account']) {
    const other = manager({ createCategory: async () => { await new Promise(resolve => { release = resolve; }); } }, { onChanged: async () => { reloads++; } });
    other.press('카테고리 추가'); other.render(); other.field('카테고리 이름', '이전 계정 요청'); other.render();
    const pending = other.press('저장');
    if (abandon === 'unmount') other.unmount(); else other.render({ api: {} });
    release(); await pending;
  }
  assert.equal(reloads, 0);
});

test('duplicate names show the server message on the name input and clear when the name changes', async () => {
  let calls = 0;
  const view = manager({ createCategory: async () => { calls++; throw { code: 'CATEGORY_NAME_EXISTS', status: 409, message: '이미 사용 중인 카테고리 이름입니다.', requestId: 'duplicate-request' }; } });
  view.press('카테고리 추가'); view.render(); view.field('카테고리 이름', 'GPU 서버'); view.render();
  await view.press('저장'); view.render();
  assert.equal(calls, 1); assert.equal(view.input('카테고리 이름').props['aria-invalid'], true);
  assert.equal(view.input('카테고리 이름').props.accessibilityHint, '이미 사용 중인 카테고리 이름입니다.');
  assert.match(view.text(), /이미 사용 중인 카테고리 이름입니다/); assert.match(view.text(), /duplicate-request/);
  view.field('카테고리 이름', '다른 이름'); view.render();
  assert.equal(view.input('카테고리 이름').props['aria-invalid'], false); assert.doesNotMatch(view.text(), /이미 사용 중/);
});

test('PATCH preserves an unchanged description and explicitly sends null when it is cleared', async () => {
  const writes = [];
  const view = manager({ editCategory: async (...args) => writes.push(args) }, { categories: [{ ...contract.category, description: '기존 설명' }] });
  view.press('수정'); view.render(); view.field('카테고리 이름', '새 이름'); view.render();
  await view.press('저장'); view.render();
  assert.deepEqual(writes[0][1], { name: '새 이름', description: '기존 설명', expectedVersion: 0 });
  view.render({ categories: [{ ...contract.category, name: '새 이름', description: '기존 설명', version: 1 }] });
  view.press('수정'); view.render(); view.field('카테고리 설명', ''); view.render(); await view.press('저장'); view.render();
  assert.deepEqual(writes[1][1], { name: '새 이름', description: null, expectedVersion: 1 });
});

test('a definitive idempotency-key rejection uses a fresh key on the next explicit retry', async () => {
  const writes = [];
  const view = manager({ createCategory: async (...args) => { writes.push(args); if (writes.length === 1) throw { code: 'IDEMPOTENCY_KEY_REUSED', status: 422, message: '다른 본문에 사용한 키입니다.' }; } });
  view.press('카테고리 추가'); view.render(); view.field('카테고리 이름', '새 분류'); view.render();
  await view.press('저장'); view.render(); assert.match(view.text(), /다른 본문에 사용한 키/); assert.equal(writes.length, 1);
  await view.press('저장'); view.render();
  assert.deepEqual(writes[0][0], writes[1][0]); assert.notEqual(writes[0][1], writes[1][1]); assert.match(view.text(), /추가했습니다/);
});

test('403 blocks category controls both on mutation and on a following list refresh', async () => {
  for (const deniedAt of ['mutation', 'refresh']) {
    let writes = 0; let reads = 0;
    const forbidden = { status: 403, code: 'FORBIDDEN', message: '관리자만 사용할 수 있습니다.', requestId: 'denied-request' };
    const view = manager({ createCategory: async () => { writes++; if (deniedAt === 'mutation') throw forbidden; } }, {
      onChanged: async () => { reads++; throw forbidden; },
    });
    view.press('카테고리 추가'); view.render(); view.field('카테고리 이름', '분류'); view.render();
    await view.press('저장'); view.render();
    assert.match(view.text(), /관리자만 사용할 수 있습니다/); assert.match(view.text(), /denied-request/);
    for (const label of ['저장', '수정', '삭제', '카테고리 추가', '목록 다시 불러오기']) assert.equal(view.hasButton(label), false);
    assert.equal(writes, 1); assert.equal(reads, deniedAt === 'mutation' ? 0 : 1);
    assert.equal(view.title(), '카테고리 관리');
  }
});
