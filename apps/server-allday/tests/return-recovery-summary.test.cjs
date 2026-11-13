const test=require('node:test');const assert=require('node:assert/strict');
const {currentWorkSummary}=require('../src/rental-tracking.cjs');
test('pending return behind unknown work is shown as recovery waiting',()=>{
 const value=currentWorkSummary({status:'RETURNING',desiredRevision:1,jobs:[{id:2,type:'RETURN',status:'PENDING',reasonCode:'SERVER_OPERATION_PENDING',desiredRevision:1}]});
 assert.equal(value.blocked,true);assert.match(value.text,/반납 복구/);assert.equal(value.running,false);
});
test('failed return never claims success and old start failures do not mask running return',()=>{
 assert.equal(currentWorkSummary({status:'RETURNING',desiredRevision:1,jobs:[{id:2,type:'RETURN',status:'FAILED',desiredRevision:1}]}).error,true);
 const running=currentWorkSummary({status:'RETURNING',desiredRevision:1,jobs:[{id:1,type:'START',status:'FAILED',desiredRevision:0},{id:2,type:'RETURN',status:'RUNNING',desiredRevision:1}]});
 assert.equal(running.running,true);assert.equal(running.error,undefined);
 assert.equal(currentWorkSummary({status:'RETURNED',jobs:[{type:'RETURN',status:'FAILED'}]}).text,'반납이 완료되었습니다.');
});
