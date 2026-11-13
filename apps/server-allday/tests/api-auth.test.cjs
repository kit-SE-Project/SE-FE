const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const path=require('node:path');
async function apiModule(){const source=await fs.readFile(path.join(__dirname,'../src/api.js'),'utf8');return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);}
const actor={memberId:1001,role:'STUDENT',authorities:['ROLE_USER'],rentalEligible:true};
const pair={accessToken:'test-access-1',refreshToken:'test-refresh-1'};
const reply=(status,data)=>new Response(status===204?null:JSON.stringify(data),{status,headers:{'X-Request-Id':'test-request','Content-Type':'application/json'}});
const bootstrap=async url=>reply(200,url.endsWith('/formLogin')?pair:actor);

test('login sends form credentials, validates /api/v1/me and loads API servers; no manual token input',async()=>{
 const {openBackendSession}=await apiModule();const old=global.fetch;const calls=[];
 try{
  global.fetch=async(url,options)=>{calls.push({url,options});return reply(200,url.endsWith('/formLogin')?pair:url.endsWith('/me')?actor:[]);};
  const session=await openBackendSession({url:'http://contract.invalid/',username:' user@example.test ',password:' secret! '});
  assert.deepEqual(calls.map(c=>new URL(c.url).pathname),['/formLogin','/api/v1/me','/api/v1/servers']);
  const first=calls[0].options;assert.equal(first.headers['Content-Type'],'application/x-www-form-urlencoded');assert.equal(first.headers.Authorization,undefined);
  const form=new URLSearchParams(first.body);assert.equal(form.get('username'),'user@example.test');assert.equal(form.get('password'),' secret! ');assert.equal(form.get('largeLogin'),'false');
  assert.ok(calls.slice(1).every(c=>c.options.headers.Authorization==='Bearer test-access-1' && !c.options.body));
  assert.ok(calls.every(c=>c.options.credentials==='omit'));assert.equal(session.actor.role,'USER');assert.equal(session.actor.rentalEligible,true);assert.equal(session.actor.password,undefined);
 }finally{global.fetch=old;}
});
test('input, login failures, rate limits and malformed identity fail without a local account fallback',async()=>{
 const {openBackendSession,actorFromProfile,validateLogin}=await apiModule();const old=global.fetch;let calls=0;
 try{
  global.fetch=async()=>{calls++;return reply(401,{code:'LOGIN_FAILED',message:'아이디 또는 비밀번호를 확인하세요.'});};
  await assert.rejects(openBackendSession({url:'http://contract.invalid',username:'',password:''}),/아이디/);assert.equal(calls,0);
  await assert.rejects(openBackendSession({url:'http://contract.invalid',username:'student',password:'incorrect'}),e=>e.status===401&&e.code==='LOGIN_FAILED');assert.equal(calls,1);
  global.fetch=async()=>reply(429,{code:'LOGIN_PREVENT_USER',message:'잠시 후 다시 로그인하세요.'});
  await assert.rejects(openBackendSession({url:'http://contract.invalid',username:'student',password:'incorrect'}),e=>e.status===429&&e.code==='LOGIN_PREVENT_USER');
  assert.ok(validateLogin('x'.repeat(255),'password'));assert.ok(validateLogin('user','x'.repeat(257)));
  assert.throws(()=>actorFromProfile({...actor,role:'WORKER'}),/권한/);assert.throws(()=>actorFromProfile({...actor,memberId:null}),/신원/);
  assert.throws(()=>actorFromProfile({...actor,rentalEligible:undefined}),/권한/);
  assert.equal(actorFromProfile({...actor,rentalEligible:false}).rentalEligible,false);assert.equal(actorFromProfile({...actor,role:'ADMIN'}).role,'ADMIN');
 }finally{global.fetch=old;}
});
test('concurrent 401s share one rotating refresh; mutation retry preserves body and idempotency key',async()=>{
 const {createApi}=await apiModule();const old=global.fetch;let release;let ready;const started=new Promise(r=>{ready=r;});let refreshes=0;const writes=[];
 try{
  global.fetch=bootstrap;const client=createApi('http://contract.invalid');await client.login('user','password');
  global.fetch=async(url,options)=>{
   if(url.endsWith('/refresh')){refreshes++;assert.deepEqual(JSON.parse(options.body),{refreshToken:'test-refresh-1'});assert.equal(options.headers.Authorization,undefined);ready();return new Promise(r=>{release=()=>r(reply(200,{accessToken:'test-access-2',refreshToken:'test-refresh-2'}));});}
   if(options.method==='POST')writes.push(options);
   return options.headers.Authorization==='Bearer test-access-1'?reply(401,{code:'INVALID_OR_EXPIRED_TOKEN'}):reply(200,{});
  };
  const body={serverId:1,purpose:'시험',slots:[]};const work=Promise.all([client.reserve(body,'same-reservation-key'),client.servers()]);await started;release();await work;
  assert.equal(refreshes,1);assert.equal(writes.length,2);assert.equal(writes[0].body,writes[1].body);assert.ok(writes.every(w=>w.headers['Idempotency-Key']==='same-reservation-key'));
  assert.equal(writes[1].headers.Authorization,'Bearer test-access-2');
 }finally{global.fetch=old;}
});
test('a delayed old-token 401 retries with the rotated token without refreshing twice',async()=>{
 const {createApi}=await apiModule();const old=global.fetch;let late;let ready;const started=new Promise(r=>{ready=r;});let refreshes=0;
 try{
  global.fetch=bootstrap;const client=createApi('http://contract.invalid');await client.login('user','password');
  global.fetch=async(url,options)=>{
   if(url.endsWith('/refresh')){refreshes++;return reply(200,{accessToken:'test-access-2',refreshToken:'test-refresh-2'});}
   if(url.endsWith('/categories')&&options.headers.Authorization==='Bearer test-access-1'){ready();return new Promise(r=>{late=()=>r(reply(401,{code:'INVALID_OR_EXPIRED_TOKEN'}));});}
   return options.headers.Authorization==='Bearer test-access-1'?reply(401,{}):reply(200,[]);
  };
  const pending=client.categories();await started;await client.servers();late();await pending;assert.equal(refreshes,1);
 }finally{global.fetch=old;}
});
test('failed refresh clears the session and never loops or falls back',async()=>{
 const {createApi}=await apiModule();const old=global.fetch;let requests=0;
 try{
  global.fetch=bootstrap;const client=createApi('http://contract.invalid');await client.login('user','password');
  global.fetch=async url=>{requests++;return reply(401,{code:url.endsWith('/refresh')?'REFRESH_REUSED':'INVALID_OR_EXPIRED_TOKEN'});};
  await assert.rejects(client.servers(),e=>e.code==='REFRESH_REUSED');assert.equal(requests,2);
  await assert.rejects(client.me(),e=>e.status===401);assert.equal(requests,2);
 }finally{global.fetch=old;}
});
test('logout posts the current pair, clears local access on network failure, and rejects delayed responses',async()=>{
 const {createApi}=await apiModule();const old=global.fetch;let started;let bodyReady;const reading=new Promise(r=>{started=r;});let logout;
 try{
  global.fetch=bootstrap;const client=createApi('http://contract.invalid');await client.login('user','password');
  global.fetch=async(url,options)=>{
   if(url.endsWith('/logoutProc')){logout=options;return reply(200,{loggedOut:true,isOAuth:false});}
   return {status:200,ok:true,json:()=>{started();return new Promise(r=>{bodyReady=r;});}};
  };
  const pending=client.me();await reading;await client.logout();bodyReady(actor);await assert.rejects(pending,e=>e.code==='SESSION_CHANGED');
  assert.equal(logout.headers.Authorization,'Bearer test-access-1');assert.deepEqual(JSON.parse(logout.body),{refreshToken:'test-refresh-1'});
  global.fetch=bootstrap;await client.login('user','password');global.fetch=async()=>{throw new TypeError('offline');};
  await assert.rejects(client.logout(),e=>e.code==='NETWORK_ERROR');await assert.rejects(client.me(),e=>e.status===401);
 }finally{global.fetch=old;}
});
test('HTTP errors and non-JSON proxy failures preserve status/request IDs; 204 never parses a body',async()=>{
 const {createApi}=await apiModule();const old=global.fetch;
 try{
  global.fetch=bootstrap;const client=createApi('http://contract.invalid');await client.login('user','password');
  for(const status of [403,409,422,503]){global.fetch=async()=>reply(status,{code:'TEST_ERROR',message:'서버 안내',requestId:`request-${status}`});await assert.rejects(client.servers(),e=>e.status===status&&e.requestId===`request-${status}`);}
  global.fetch=async()=>new Response('<html>proxy failure</html>',{status:503,headers:{'X-Request-Id':'proxy-request'}});await assert.rejects(client.me(),e=>e.status===503&&e.requestId==='proxy-request'&&!e.message.includes('<html>'));
  global.fetch=async()=>({status:204,ok:true,json:()=>{throw new Error('must not parse 204');}});assert.equal(await client.deleteServer({id:1,version:3},'운영 종료','delete-key'),null);
 }finally{global.fetch=old;}
});
test('malformed token pair and unreachable backend cannot create a session; ngrok requests add bypass header',async()=>{
 const {openBackendSession,createApi}=await apiModule();const old=global.fetch;
 try{
  global.fetch=async()=>reply(200,{accessToken:'only-one-token'});await assert.rejects(openBackendSession({url:'http://contract.invalid',username:'user',password:'password'}),e=>e.code==='INVALID_RESPONSE');
  global.fetch=async()=>{throw new TypeError('offline');};await assert.rejects(openBackendSession({url:'http://contract.invalid',username:'user',password:'password'}),e=>e.code==='NETWORK_ERROR');
  const calls=[];global.fetch=async(url,options)=>{calls.push(options);return bootstrap(url);};
  const client=createApi('https://integration-test.ngrok-free.dev');await client.login('user','password');assert.ok(calls.every(c=>c.headers['ngrok-skip-browser-warning']==='true'));
 }finally{global.fetch=old;}
});

test('category management uses the administrator routes and sends category versions', async () => {
 const {createApi}=await apiModule();const old=global.fetch;const calls=[];
 try {
  global.fetch=bootstrap;const client=createApi('http://contract.invalid');await client.login('admin','password');
  global.fetch=async(url, options)=>{
   calls.push([options.method,new URL(url).pathname,options.headers['Idempotency-Key'],options.body && JSON.parse(options.body)]);
   return options.method==='DELETE'?reply(204):reply(200,[]);
  };
  await client.adminCategories();
  await client.createCategory({name:'GPU'}, 'create-category');
  await client.editCategory(23, {name:'CPU',description:null,expectedVersion:0}, 'edit-category');
  assert.equal(await client.deleteCategory(23, 1, 'delete-category'), null);
  assert.deepEqual(calls,[
   ['GET','/api/v1/admin/categories',undefined,undefined],
   ['POST','/api/v1/admin/categories','create-category',{name:'GPU'}],
   ['PATCH','/api/v1/admin/categories/23','edit-category',{name:'CPU',description:null,expectedVersion:0}],
   ['DELETE','/api/v1/admin/categories/23','delete-category',{expectedVersion:1}],
  ]);
 } finally { global.fetch=old; }
});
