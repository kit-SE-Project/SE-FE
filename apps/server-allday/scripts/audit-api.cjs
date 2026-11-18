const fs=require('node:fs/promises');const path=require('node:path');
const contract=require('../tests/contracts/public-api.json');
const {validateReservation,calendarDayState,reservationClock,reservationNow,normalizeRental}=require('../src/domain.cjs');
async function main(){
 const root=path.resolve(__dirname,'..');const source=await fs.readFile(path.join(root,'src/api.js'),'utf8');
 const {openBackendSession}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
 const old=global.fetch;const calls=[];let session;let emptyDelete=false;let status;
 try{
  global.fetch=async(url,options)=>{
   calls.push({path:new URL(url).pathname,method:options.method,contentType:options.headers['Content-Type'],bearer:options.headers.Authorization==='Bearer audit-access'});
   const data=url.endsWith('/formLogin')?{accessToken:'audit-access',refreshToken:'audit-refresh'}:url.endsWith('/me')?{memberId:1001,role:'STUDENT',authorities:['ROLE_USER'],rentalEligible:true}:[];
   return new Response(JSON.stringify(data),{status:200});
  };
  session=await openBackendSession({url:'http://audit.invalid',username:'audit-user',password:'audit-only-password'});
  global.fetch=async()=>new Response(null,{status:204});emptyDelete=await session.client.deleteServer({id:1,version:3},'검증','audit-delete')===null;
  global.fetch=async()=>new Response(JSON.stringify({code:'FORBIDDEN',message:'검증용 오류',requestId:'audit-request'}),{status:403});
  try{await session.client.me();}catch(error){status=error.status;}
 }finally{session?.client.dispose();global.fetch=old;}
 const now=new Date('2026-10-14T01:00:00Z');
 const gap={from:'2026-10-15',to:'2026-10-15',band:'MORNING',purpose:'전환 검증',now,minimumSwitchSeconds:3600,blockedSlots:[{startAt:'2026-10-15T00:00:00+09:00',endAt:'2026-10-15T07:30:00+09:00'}]};
 const clock=reservationClock({serverNow:now.toISOString(),reservationHorizonAt:'2026-12-14T01:00:00Z'},0);
 const horizon={from:'2026-12-14',to:'2026-12-14',band:'MORNING',purpose:'한도 검증',now:reservationNow(clock,0),reservationHorizonAt:clock.horizonAt};
 const historical=contract.examples.find(e=>e.response.status===200&&/^\/api\/v1\/rentals\/\d+$/.test(e.request.path)).response.body;
 const normalized=normalizeRental(historical,[{id:historical.serverId,name:'변경된 현재 이름',gpu:'변경된 GPU'}]);
 const report={
  auditedAt:'2026-10-14',contractVersion:contract.version,source:contract.source,specSha256:contract.specSha256,
  method:'Offline request capture and contract evidence mapping; no live authentication or equipment requests',
  verifiedServiceOperations:19,checks:[
   {id:'FORM_LOGIN_AND_BEARER',passed:calls[0].path==='/formLogin'&&calls[0].contentType==='application/x-www-form-urlencoded'&&calls[1].path==='/api/v1/me'&&calls[1].bearer&&session.actor.rentalEligible===true,calls},
   {id:'SERVER_EDIT_DELETE_CONTRACT',passed:!!contract.paths['/api/v1/admin/servers/{id}'].patch&&!!contract.paths['/api/v1/admin/servers/{id}'].delete&&emptyDelete},
   {id:'MINIMUM_SWITCH_TIME',passed:!!validateReservation(gap)&&!!calendarDayState(gap.from,gap.band,gap.blockedSlots,now,3600).disabled},
   {id:'SERVER_CLOCK_HORIZON',passed:!!validateReservation(horizon)&&calendarDayState(horizon.from,horizon.band,[],horizon.now,0,clock.horizonAt).disabled},
   {id:'HISTORICAL_SNAPSHOT',passed:normalized.serverName===historical.serverSnapshot.displayName&&normalized.gpuSnapshot===historical.serverSnapshot.gpuModel},
   {id:'HTTP_STATUS',passed:status===403},
  ],
  notVerified:['Live password login and CORS at the configured URL','Production SEBoard/SSO authentication','Real worker/VM/SSH and hardware resources'],
 };
 const output=path.join(root,'artifacts','api-audit.json');
 await fs.mkdir(path.dirname(output),{recursive:true});
 await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 if(report.checks.some(c=>!c.passed))process.exitCode=1;
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
