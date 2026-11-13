const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const contract = require('./contracts/public-api.json');
async function apiModule() {
  const source = await fs.readFile(path.join(__dirname, '../src/api.js'), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

test('header nicknames belong to the verified member; absent or mismatched profiles never invent a name', async () => {
  const { nicknameForMember } = await apiModule();
  assert.equal(nicknameForMember({ memberId: 1001, nickname: ' 시험 사용자 ' }, 1001), '시험 사용자');
  for (const profile of [null, {}, { memberId: 2002, nickname: '다른 사용자' }, { memberId: 1001, nickname: null }]) {
    assert.equal(nicknameForMember(profile, 1001), '');
  }
  assert.equal(nicknameForMember({ memberId: -1, nickname: '잘못된 신원' }, -1), '');
});

test('header profile uses the existing authenticated GET /mypage contract, not a new identity API', async () => {
  const { createApi } = await apiModule();
  assert.ok(contract.paths['/mypage'].get);
  const original = global.fetch;
  const calls = [];
  const profile = { memberId: 1001, nickname: '시험 사용자' };
  try {
    global.fetch = async (url, options) => {
      calls.push({ url, options });
      const body = url.endsWith('/formLogin') ? { accessToken: 'header-test-access', refreshToken: 'header-test-refresh' } : profile;
      return new Response(JSON.stringify(body), { status: 200 });
    };
    const api = createApi('http://contract.invalid');
    await api.login('fixture-only', 'fixture-password');
    assert.deepEqual(await api.profile(), profile);
    const call = calls.find(value => value.url.endsWith('/mypage'));
    assert.equal(call.options.method, 'GET');
    assert.equal(call.options.headers.Authorization, 'Bearer header-test-access');
    assert.equal(call.options.body, undefined);
    api.dispose();
  } finally { global.fetch = original; }
});
