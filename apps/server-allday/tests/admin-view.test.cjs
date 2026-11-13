const test = require('node:test');
const assert = require('node:assert/strict');
const { EMPTY_SELECTION, serverSelection, rentalMemberLabel, canForceReturn, serverOpenRentals, forceReturnTarget } = require('../src/admin-view.cjs');
const contract = require('./contracts/public-api.json');

test('server selection is unavailable until edit or delete is chosen', () => {
  assert.equal(serverSelection(EMPTY_SELECTION, { type: 'select', serverId: 1 }), EMPTY_SELECTION);
  assert.equal(serverSelection(EMPTY_SELECTION, { type: 'begin', mode: 'unknown' }), EMPTY_SELECTION);
  const editing = serverSelection(EMPTY_SELECTION, { type: 'begin', mode: 'edit' });
  assert.deepEqual(editing, { mode: 'edit', serverId: null });
  assert.deepEqual(serverSelection(editing, { type: 'select', serverId: 2 }), { mode: 'edit', serverId: 2 });
  assert.equal(serverSelection(editing, { type: 'select', serverId: undefined }), editing);
  assert.deepEqual(EMPTY_SELECTION, { mode: null, serverId: null });
});

test('switching actions clears the prior target and clicking the active action cancels selection', () => {
  const editing = { mode: 'edit', serverId: 2 };
  const deleting = serverSelection(editing, { type: 'begin', mode: 'delete' });
  assert.deepEqual(deleting, { mode: 'delete', serverId: null });
  assert.deepEqual(serverSelection(deleting, { type: 'select', serverId: 3 }), { mode: 'delete', serverId: 3 });
  assert.equal(serverSelection(deleting, { type: 'begin', mode: 'delete' }), EMPTY_SELECTION);
  assert.deepEqual(editing, { mode: 'edit', serverId: 2 });
});

test('closing a dialog or completing an action clears both target and action mode', () => {
  for (const mode of ['edit', 'delete']) {
    const reset = serverSelection({ mode, serverId: 7 }, { type: 'reset' });
    assert.equal(reset, EMPTY_SELECTION);
    assert.equal(serverSelection(reset, { type: 'select', serverId: 8 }), EMPTY_SELECTION);
  }
});

test('renter identity uses each rental memberId, not a made-up name, VM login, or current admin identity', () => {
  assert.equal(rentalMemberLabel({ memberId: 10000 }), '회원 ID 10000');
  assert.equal(rentalMemberLabel({ memberId: 1001, username: 'r1042' }), '회원 ID 1001');
  assert.equal(rentalMemberLabel({ memberId: 2002 }), '회원 ID 2002');
  for (const memberId of [null, undefined, '10000', NaN]) assert.equal(rentalMemberLabel({ memberId }), '대여자 정보 없음');
});

test('admin list schema supplies memberId, not a name; delivered common list examples display that ID', () => {
  const schema = contract.paths['/api/v1/admin/rentals'].get.responses['200'].content['application/json'].schema;
  assert.equal(schema.items.$ref, '#/components/schemas/RentalListItem');
  assert.equal(contract.components.schemas.RentalListItem.properties.memberId.type, 'integer');
  assert.equal(Object.hasOwn(contract.components.schemas.RentalListItem.properties, 'memberName'), false);
  const examples = contract.examples.filter(value => value.response.status === 200 && value.request.path === '/api/v1/rentals');
  assert.ok(examples.length > 0);
  for (const example of examples) for (const rental of example.response.body) {
    assert.ok(Number.isSafeInteger(rental.memberId));
    assert.equal(rentalMemberLabel(rental), `회원 ID ${rental.memberId}`);
    assert.equal(Object.hasOwn(rental, 'memberName'), false);
  }
});

test('force return lists all open rentals for one server instead of silently choosing the first user', () => {
  const rows = [
    { id: 101, serverId: 1, memberId: 1001, status: 'RETURNING', version: 2 },
    { id: 102, serverId: 1, memberId: 2002, status: 'ACTIVE', version: 7 },
    { id: 103, serverId: 1, memberId: 2002, status: 'RESERVED', version: 1 },
    { id: 104, serverId: 2, memberId: 3003, status: 'ACTIVE', version: 2 },
    { id: 105, serverId: 1, memberId: 4004, status: 'RETURNED', version: 3 },
    { id: 106, serverId: 1, memberId: 4004, status: 'CANCELLED', version: 3 },
  ];
  const open = serverOpenRentals(rows, 1);
  assert.deepEqual(open.map(r => r.id), [101, 102, 103]);
  assert.equal(open.some(canForceReturn), true);
  assert.equal(forceReturnTarget(rows, 1, null), null);
  assert.equal(forceReturnTarget(rows, 1, 102), rows[1]);
  assert.equal(forceReturnTarget(rows, 1, 103), rows[2]);
  assert.equal(forceReturnTarget(rows, 1, 104), null);
  assert.equal(forceReturnTarget(rows, 1, 101), null);
  assert.equal(forceReturnTarget(rows, 1, 105), null);
  assert.equal(forceReturnTarget(rows, 1, 999), null);
  assert.equal(rows[1].status, 'ACTIVE');
});

test('force return fails closed for completed, already returning, or unknown states and rechecks updated data', () => {
  for (const status of ['RESERVED', 'PROVISIONING', 'READY', 'ACTIVE', 'RETAINED']) assert.equal(canForceReturn({ status }), true);
  for (const status of ['RETURNING', 'RETURNED', 'CANCELLED', 'UNKNOWN', undefined]) assert.equal(canForceReturn({ status }), false);
  const selected = { id: 102, serverId: 1, memberId: 2002, status: 'ACTIVE', version: 7 };
  assert.equal(forceReturnTarget([selected], 1, 102), selected);
  assert.equal(forceReturnTarget([{ ...selected, status: 'RETURNING', version: 8 }], 1, 102), null);
  assert.equal(forceReturnTarget([], 1, 102), null);
});

test('the force return API uses the explicitly chosen rental ID and version, not its server ID or another contract', async () => {
  const fs = require('node:fs/promises'); const path = require('node:path');
  const source = await fs.readFile(path.join(__dirname, '../src/api.js'), 'utf8');
  const { createApi } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const oldFetch = global.fetch; const writes = [];
  const response = body => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  try {
    global.fetch = async (url, options) => {
      if (url.endsWith('/formLogin')) return response({ accessToken: 'test-force-access', refreshToken: 'test-force-refresh' });
      if (url.endsWith('/me')) return response({ memberId: 9001, role: 'ADMIN', rentalEligible: true });
      writes.push({ url, options }); return response({ id: 103, status: 'RETURNING' });
    };
    const api = createApi('http://contract.invalid'); await api.login('test-admin', 'local-test');
    const rows = [
      { id: 102, serverId: 1, memberId: 2002, status: 'ACTIVE', version: 7 },
      { id: 103, serverId: 1, memberId: 2002, status: 'RESERVED', version: 3 },
    ];
    const target = forceReturnTarget(rows, 1, 103);
    await api.finish(target, '선택한 대여 회수', 'chosen-103', 'force-return');
    assert.equal(writes.length, 1);
    assert.equal(new URL(writes[0].url).pathname, '/api/v1/admin/rentals/103/force-return');
    assert.deepEqual(JSON.parse(writes[0].options.body), { expectedVersion: 3, reason: '선택한 대여 회수' });
    assert.equal(writes[0].options.headers['Idempotency-Key'], 'chosen-103');
    assert.equal(rows[0].status, 'ACTIVE');
  } finally { global.fetch = oldFetch; }
});
