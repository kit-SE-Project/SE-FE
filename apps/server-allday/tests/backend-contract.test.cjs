const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const contract = require('./contracts/public-api.json');
const { normalizeRental, normalizeServer, makeSlots } = require('../src/domain.cjs');
const { serverPayload, serverEditPayload } = require('../src/server-management.cjs');

const operations = [
  ['me', [], '/api/v1/me', 'get'],
  ['categories', [], '/api/v1/categories', 'get'],
  ['servers', [], '/api/v1/servers', 'get'],
  ['rentals', [], '/api/v1/rentals', 'get'],
  ['rentals', [true], '/api/v1/admin/rentals', 'get'],
  ['systemEvents', [100], '/api/v1/admin/events', 'get'],
  ['detail', [101], '/api/v1/rentals/{id}', 'get'],
  ['rentalEvents', [101], '/api/v1/rentals/{id}/events', 'get'],
  ['connection', [101], '/api/v1/rentals/{id}/connection', 'get'],
  ['credential', [101], '/api/v1/rentals/{id}/credential', 'get'],
  ['availability', [1, '2026-10-15T00:00:00+09:00', '2026-12-14T23:59:59+09:00'], '/api/v1/servers/{id}/availability', 'get'],
  ['preview', [{ serverId: 1, purpose: '명세 검증', slots: makeSlots('2026-10-15', '2026-10-16', 'MORNING') }], '/api/v1/rental-previews', 'post'],
  ['reserve', [{ serverId: 1, purpose: '명세 검증', slots: makeSlots('2026-10-15', '2026-10-16', 'AFTERNOON') }, 'contract-reserve'], '/api/v1/rentals', 'post'],
  ['finish', [{ id: 101, version: 4 }, '취소', 'contract-cancel', 'cancel'], '/api/v1/rentals/{id}/cancel', 'post'],
  ['finish', [{ id: 101, version: 4 }, '반납', 'contract-return'], '/api/v1/rentals/{id}/return', 'post'],
  ['finish', [{ id: 101, version: 4 }, '관리자 회수', 'contract-force', 'force-return'], '/api/v1/admin/rentals/{id}/force-return', 'post'],
  ['maintenance', [{ id: 1, version: 2 }, 'MAINTENANCE', '장비 점검'], '/api/v1/admin/servers/{id}/status', 'patch'],
  ['createServer', [serverPayload({ displayName: '서버 7', cpuModel: 'Xeon', memoryGb: '128', gpuModel: '-', categoryId: 1, nodeName: 'pve-07' }), 'contract-create'], '/api/v1/admin/servers', 'post'],
  ['editServer', [{id:101,version:3},serverEditPayload({displayName:'변경된 서버',cpuModel:'Xeon',memoryGb:'128',gpuModel:'없음',categoryId:1,nodeName:'preserved-node',reason:'정보 정정'})], '/api/v1/admin/servers/{id}', 'patch'],
  ['deleteServer', [{id:101,version:3},'운영 종료','contract-delete'], '/api/v1/admin/servers/{id}', 'delete'],
  ['resetCredential', [{id:101,version:4},'암호 초기화','contract-reset'], '/api/v1/rentals/{id}/credential-resets', 'post'],
];

function schemaOf(schema) {
  return schema.$ref ? contract.components.schemas[schema.$ref.split('/').pop()] : schema;
}

// Check only request fields/types/constraints used by this frontend, not a full OpenAPI validator.
function assertInput(input, schema) {
  schema = schemaOf(schema);
  for (const key of schema.required || []) assert.ok(Object.hasOwn(input, key), `missing ${key}`);
  for (const [key, value] of Object.entries(input)) {
    const field = schemaOf(schema.properties[key] || {});
    assert.ok(schema.properties[key], `undeclared field ${key}`);
    if (field.type === 'integer') { assert.ok(Number.isSafeInteger(value), key); if (field.minimum !== undefined) assert.ok(value >= field.minimum, key); }
    if (field.type === 'string') {
      assert.equal(typeof value, 'string', key);
      if (field.minLength) assert.ok(value.length >= field.minLength, key);
      if (field.maxLength) assert.ok(value.length <= field.maxLength, key);
      if (field.pattern) assert.match(value, new RegExp(field.pattern), key);
      if (field.format === 'date-time') assert.ok(Number.isFinite(Date.parse(value)), key);
    }
    if (field.enum) assert.ok(field.enum.includes(value), key);
    if (field.type === 'array') {
      assert.ok(Array.isArray(value), key);
      if (field.minItems) assert.ok(value.length >= field.minItems, key);
      if (field.maxItems) assert.ok(value.length <= field.maxItems, key);
      for (const item of value) assertInput(item, field.items);
    }
  }
  if (schema === contract.components.schemas.Reservation) assert.notEqual(Object.hasOwn(input, 'slots'), Object.hasOwn(input, 'rule'));
}

test('21 service operations match OpenAPI 0.5.0 including system logs, rental events and server management', async () => {
  const source = await fs.readFile(path.join(__dirname, '../src/api.js'), 'utf8');
  const { createApi } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const original = global.fetch;
  try {
    const client = createApi('http://contract.invalid/');
    global.fetch = async url => new Response(JSON.stringify(url.endsWith('/formLogin') ? {accessToken:'test-only-token',refreshToken:'test-refresh'} : {}),{status:200});
    await client.login('test-user','test-password');
    for (const [name, args, route, method] of operations) {
      const operation = contract.paths[route][method];
      assert.ok(operation, `${method} ${route}`);
      let captured;
      global.fetch = async (url, options) => { captured = { url: new URL(url), options }; return new Response(name==='deleteServer'?null:'{}',{status:name==='deleteServer'?204:200}); };
      await client[name](...args);
      assert.equal(captured.url.pathname, route.replace('{id}', name === 'availability' || name === 'maintenance' ? '1' : '101'));
      assert.equal(captured.options.method.toLowerCase(), method);
      assert.equal(captured.options.headers.Authorization, 'Bearer test-only-token');
      for (const param of operation.parameters || []) {
        if (param.in === 'header' && param.required) assert.ok(captured.options.headers[param.name], param.name);
        if (param.in === 'query' && param.required) assert.ok(captured.url.searchParams.has(param.name), param.name);
      }
      if (name === 'rentals') { assert.equal(captured.url.searchParams.get('limit'), '100'); assert.equal(captured.url.searchParams.get('offset'), '0'); }
      if (name === 'availability') { assert.equal(captured.url.searchParams.get('from'), args[1]); assert.equal(captured.url.searchParams.get('to'), args[2]); }
      if (operation.requestBody) {
        assert.equal(captured.options.headers['Content-Type'], 'application/json');
        assertInput(JSON.parse(captured.options.body), operation.requestBody.content['application/json'].schema);
      }
      if (name === 'finish' || name === 'maintenance') assert.equal(JSON.parse(captured.options.body).expectedVersion, args[0].version);
      if(name==='editServer') {assert.equal(captured.options.headers['Idempotency-Key'],undefined);assert.equal(Object.hasOwn(JSON.parse(captured.options.body),'nodeName'),false);}
      if (captured.options.headers['Idempotency-Key']) assert.match(captured.options.headers['Idempotency-Key'], /^[A-Za-z0-9._:-]{1,128}$/);
    }
  } finally { global.fetch = original; }
});

test('0.5.0 HTTP evidence preserves server snapshots after rename and logical deletion', () => {
  const examples=contract.examples.filter(e=>e.response.status===200 && /^\/api\/v1\/rentals\/\d+$/.test(e.request.path));
  assert.ok(examples.length>0);
  for (const example of examples) {
    const raw = example.response.body;
    const normalized = normalizeRental(raw, [{ id: raw.serverId, name: '현재 변경된 서버명',gpu:'현재 GPU' }]);
    assert.equal(normalized.status, raw.status);
    assert.equal(normalized.version, raw.version);
    assert.equal(normalized.memberId, raw.memberId);
    assert.ok(normalized.from && normalized.to && normalized.band);
    assert.equal(normalized.serverName, raw.serverSnapshot.displayName);
    assert.equal(normalized.gpuSnapshot,raw.serverSnapshot.gpuModel);
  }
  const server = normalizeServer({ id: 1, displayName: '명세 서버', cpuModel: 'Xeon', memoryGb: 128, gpuModel: '-', status: 'AVAILABLE', reservationAllowed: false, version: 2 });
  assert.equal(server.name, '명세 서버');
  assert.equal(server.ram, '128GB');
  assert.equal(server.reservationAllowed, false);
});

test('24-hour rentals use raw slots allowed by the schema, not an undeclared LONG_TERM enum field', () => {
  const input = { serverId: 1, purpose: '연속 사용', slots: makeSlots('2026-10-15', '2026-10-16', 'LONG_TERM') };
  assertInput(input, contract.components.schemas.Reservation);
  assert.equal(input.slots.length, 1);
  assert.equal(input.slots[0].endAt, '2026-10-17T00:00:00+09:00');
  assert.equal(Object.hasOwn(input, 'band'), false);
  assert.equal(Object.hasOwn(input, 'memberId'), false);
});
