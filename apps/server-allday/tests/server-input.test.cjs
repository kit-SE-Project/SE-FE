const test = require('node:test');
const assert = require('node:assert/strict');
const { validateServer, serverPayload, serverEditPayload } = require('../src/server-management.cjs');
const draft = () => ({displayName:' SE-New ',cpuModel:' AMD EPYC 9004 ',memoryGb:'256',gpuModel:' RTX 4090 ',categoryId:2,nodeName:' pve-07 '});
const categories = [{id:2,name:'장비 분류'}];

test('API server input rejects missing fields, invalid memory, node and categories', () => {
  const errors = validateServer({...draft(),displayName:'',cpuModel:'',memoryGb:'0',gpuModel:'',categoryId:null,nodeName:''},categories,[],null,true);
  assert.deepEqual(Object.keys(errors).sort(),['displayName','cpuModel','memoryGb','gpuModel','categoryId','nodeName'].sort());
  for(const memoryGb of ['1.5','-2','abc','2147483648']) assert.ok(validateServer({...draft(),memoryGb},categories,[],null,true).memoryGb);
  assert.ok(validateServer({...draft(),nodeName:'노드 1'},categories,[],null,true).nodeName);
  assert.ok(validateServer({...draft(),categoryId:999},categories,[],null,true).categoryId);
});

test('valid server input emits backend registration fields without generating local records', () => {
  assert.deepEqual(validateServer(draft(),categories,[],null,true),{});
  assert.deepEqual(serverPayload(draft()),{displayName:'SE-New',cpuModel:'AMD EPYC 9004',memoryGb:256,gpuModel:'RTX 4090',categoryId:2,nodeName:'pve-07'});
});

test('0.5.0 permits duplicate display names and edits omit nodeName while requiring reason',()=>{
  const servers=[{id:1,name:'SE-New'}];
  assert.deepEqual(validateServer(draft(),categories,servers,null,true),{});
  assert.ok(validateServer(draft(),categories,servers,1,false).reason);
  const edit={...draft(),reason:' 정보 수정 '};
  assert.deepEqual(validateServer(edit,categories,servers,1,false),{});
  const payload=serverEditPayload(edit);assert.equal(payload.reason,'정보 수정');assert.equal(Object.hasOwn(payload,'nodeName'),false);
});
