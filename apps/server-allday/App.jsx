import './global.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import RentScreen from './src/screens/RentScreen';
import MyRentalsScreen from './src/screens/MyRentalsScreen';
import AdminScreen from './src/screens/AdminScreen';
import LoginScreen from './src/screens/LoginScreen';
import ReservationDialog from './src/components/ReservationDialog';
import BackendAccessFields from './src/components/BackendAccessFields';
import RentalProgress from './src/components/RentalProgress';
import AppHeader from './src/components/AppHeader';
import { Button, Dialog, Heading, Icon, Notice, inputClass } from './src/components/ui';
import { ApiError, actorFromProfile, openBackendSession, restoreBackendSession, restoreSsoSession, clearStoredBackendSession, requestKey } from './src/api';
const { normalizeServer, normalizeRental, rentalTimeLabel } = require('./src/domain.cjs');
const { validateServer, serverPayload, serverEditPayload } = require('./src/server-management.cjs');
const { createVisiblePoller, mergeRentalUpdate, mergeVersionedUpdate } = require('./src/polling.cjs');
const { rentalMemberLabel, forceReturnTarget } = require('./src/admin-view.cjs');
const { reservationPreviewFailure } = require('./src/reservation-preview.cjs');

const tabs = [['rent','서버 대여'],['mine','내 대여 현황'],['admin','관리자']];
const ssoEnabled = Platform.OS === 'web' && process.env.EXPO_PUBLIC_SEBOARD_SSO_ENABLED === 'true';
const apiUrl = ssoEnabled && typeof window !== 'undefined' ? window.location.origin : process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:18082';
const ssoSessionMarker = 'server-allday.sso-active';

function ssoWasActive() {
  try { return window.sessionStorage.getItem(ssoSessionMarker) === '1'; }
  catch { return false; }
}
function markSsoSession(active) {
  try {
    if (active) window.sessionStorage.setItem(ssoSessionMarker, '1');
    else window.sessionStorage.removeItem(ssoSessionMarker);
  } catch { /* The session itself is in the server cookie. */ }
}
function beginSso() {
  markSsoSession(false);
  window.location.replace('/api/v1/sso/start');
}
function takeSsoNotice() {
  const url = new URL(window.location.href);
  const status = url.searchParams.get('sso');
  if (!status) return '';
  url.searchParams.delete('sso');
  window.history.replaceState(window.history.state, '', url);
  return status === 'expired'
    ? '인증 요청이 만료되었습니다. SE 게시판 로그인을 다시 시작하세요.'
    : 'SE 게시판 인증을 확인할 수 없습니다. 잠시 뒤 다시 시도하세요.';
}
function message(error) {return `${error.message}${error.requestId ? ` (요청 ID: ${error.requestId})` : ''}`;}

export default function App() {
  const {width}=useWindowDimensions();
  const [tab,setTab]=useState('rent');const [category,setCategory]=useState(null);
  const [servers,setServers]=useState([]);const [categories,setCategories]=useState([]);const [rentals,setRentals]=useState([]);const [adminRentals,setAdminRentals]=useState([]);
  const [adminCategories,setAdminCategories]=useState([]);
  const [config,setConfig]=useState({url:apiUrl});const [actor,setActor]=useState(null);const [api,setApi]=useState(null);
  const [settings,setSettings]=useState(false);const [draft,setDraft]=useState({...config,username:'',password:''});const [connecting,setConnecting]=useState(false);const [connectError,setConnectError]=useState('');const [loginNotice,setLoginNotice]=useState('');
  const [selectedServer,setSelectedServer]=useState(null);const [progressId,setProgressId]=useState(null);const [confirm,setConfirm]=useState(null);const [reason,setReason]=useState('');const [actionError,setActionError]=useState('');const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');const [toast,setToast]=useState('');const [loading,setLoading]=useState(false);const [loaded,setLoaded]=useState(false);
  const [restoring,setRestoring]=useState(true);const [restoreError,setRestoreError]=useState('');const [restoreAttempt,setRestoreAttempt]=useState(0);
  const restoreRequest=useRef(null);
  const signingOut=useRef(false);
  const ssoReturnNotice=useRef(null);
  const logoutRecheckNotice=useRef('');
  const listRequest=useRef(null);
  const toastTimer=useRef();const actionLock=useRef(false);const modeGeneration=useRef(0);const alive=useRef(true);const previewedKeys=useRef(new Set());const scroll=useRef(null);
  const notify=useCallback(text=>{setToast(text);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),3500);},[]);
  const navigate = next => {setTab(next);setError('');};
  useEffect(()=>{scroll.current?.scrollTo({y:0,animated:false});},[tab]);
  const clearLocalSession=useCallback(()=>{
    if (ssoEnabled) markSsoSession(false);
    else clearStoredBackendSession();
    modeGeneration.current++;previewedKeys.current.clear();clearTimeout(toastTimer.current);
    setApi(null);setActor(null);setServers([]);setCategories([]);setAdminCategories([]);setRentals([]);setAdminRentals([]);setSelectedServer(null);setProgressId(null);setConfirm(null);setLoading(false);setLoaded(false);setCategory(null);setConnectError('');setToast('');setTab('rent');setSettings(false);setError('');setLoginNotice('');
    setDraft({url:apiUrl,username:'',password:''});
  },[]);
  const activateSession=useCallback(session=>{
    const url=session.url;
    if (ssoEnabled) markSsoSession(true);
    modeGeneration.current++;previewedKeys.current.clear();
    setActor(session.actor);setApi(session.client);setConfig({url});setDraft({url,username:'',password:''});setSettings(false);setTab('rent');setCategory(null);setProgressId(null);setSelectedServer(null);setConfirm(null);setError('');setConnectError('');setLoginNotice('');
    setServers(session.servers.map(normalizeServer));setCategories([]);setAdminCategories([]);setRentals([]);setAdminRentals([]);setLoaded(false);setLoading(true);
    setRestoring(false);setRestoreError('');
    if(session.storageWarning)notify(session.storageWarning);
  },[notify]);
  const login=async({url,username,password})=>{
    const session=await openBackendSession({url,username,password});activateSession(session);return session;
  };
  const expireSso=useCallback(()=>{
    if (signingOut.current) return;
    clearLocalSession();
    beginSso();
  },[clearLocalSession]);
  useEffect(()=>{
    let live=true;const generation=modeGeneration.current;
    if(ssoEnabled&&ssoReturnNotice.current===null)ssoReturnNotice.current=takeSsoNotice();
    setRestoring(true);setRestoreError('');
    if(!restoreRequest.current) {
      restoreRequest.current=ssoEnabled ? restoreSsoSession({onSessionExpired:expireSso}) : restoreBackendSession();
    }
    restoreRequest.current.then(session=>{
      if(!live||generation!==modeGeneration.current)return;
      if(session) {
        activateSession(session);
        const notice=logoutRecheckNotice.current||ssoReturnNotice.current;
        if(notice)notify(notice);
        logoutRecheckNotice.current='';ssoReturnNotice.current='';
      } else if(ssoEnabled) {
        const wasActive=ssoWasActive();
        clearLocalSession();
        if(ssoReturnNotice.current) {
          setLoginNotice(ssoReturnNotice.current);
        } else if(logoutRecheckNotice.current) {
          setLoginNotice('로그아웃했습니다.');
        } else if (wasActive) {
          beginSso();
          return;
        }
        logoutRecheckNotice.current='';ssoReturnNotice.current='';
        setRestoring(false);
      } else setRestoring(false);
    }).catch(e=>{
      if(!live||generation!==modeGeneration.current)return;
      if([401,403].includes(e.status)||['INVALID_RESPONSE','INVALID_IDENTITY','INVALID_SESSION'].includes(e.code)){
        setLoginNotice('로그인이 만료되었거나 사용할 수 없습니다. 다시 로그인하세요.');setRestoring(false);
      }else setRestoreError(message(e));
    });
    return()=>{live=false;};
  },[activateSession,clearLocalSession,expireSso,notify,restoreAttempt]);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;clearTimeout(toastTimer.current);};},[]);
  const refresh=useCallback((silent=false)=>{
    if(!api)return;
    if(listRequest.current?.api===api&&listRequest.current?.tab===tab)return listRequest.current.promise;
    const generation=modeGeneration.current;if(!silent)setLoading(true);
    const entry={api,tab,promise:null};
    entry.promise=(async()=>{
    try {
      const currentActor=ssoEnabled ? actorFromProfile(await api.me()) : actor;
      if(!alive.current||generation!==modeGeneration.current)return;
      if(ssoEnabled) {
        if(currentActor.memberId!==actor.memberId) {
          api.dispose();clearLocalSession();restoreRequest.current=null;
          setRestoring(true);setRestoreAttempt(value=>value+1);
          return;
        }
        if(currentActor.role!==actor.role || currentActor.rentalEligible!==actor.rentalEligible ||
            currentActor.authorities.length!==actor.authorities.length ||
            currentActor.authorities.some(role=>!actor.authorities.includes(role))) setActor(currentActor);
        if(currentActor.role!=='ADMIN'&&tab==='admin')setTab('rent');
      }
      const adminView=currentActor?.role==='ADMIN'&&tab==='admin';
      const [rawServers,rawCategories,rawRentals,all,managedCategories]=await Promise.all([
        api.servers(),api.categories(),api.rentals(),
        adminView ? api.rentals(true) : null,
        adminView ? api.adminCategories() : null,
      ]);
      const serverList=rawServers.map(normalizeServer);
      if(!alive.current||generation!==modeGeneration.current)return;
      setServers(current=>serverList.map(s=>mergeVersionedUpdate(current.find(value=>value.id===s.id),s)));setCategories(rawCategories);
      setRentals(current=>rawRentals.map(r=>normalizeRental(mergeRentalUpdate(current.find(value=>value.id===r.id),r),serverList)));
      if(managedCategories)setAdminCategories(managedCategories);
      setCategory(current=>rawCategories.some(item=>item.id===current)?current:null);
      if(all)setAdminRentals(current=>all.map(r=>normalizeRental(mergeRentalUpdate(current.find(value=>value.id===r.id),r),serverList)));
      setLoaded(true);setError('');
    }catch(e){
      if(alive.current&&generation===modeGeneration.current){
        setError(message(e));
        if(e.status===401&&!ssoEnabled){
          api.dispose();clearLocalSession();setLoginNotice('로그인이 만료되었습니다. 아이디와 비밀번호로 다시 로그인하세요.');
        }
      }
      return {error:e};
    }finally{if(alive.current&&generation===modeGeneration.current)setLoading(false);}
    })().finally(()=>{if(listRequest.current===entry)listRequest.current=null;});
    listRequest.current=entry;return entry.promise;
  },[api,actor,tab,clearLocalSession]);
  useEffect(()=>{
    if(!api)return;
    const poller=createVisiblePoller({task:async()=>{const result=await refresh(true);if(result?.error)throw result.error;},delay:15000});
    poller.refresh();return()=>poller.stop();
  },[api,refresh]);
  const acceptRentalDetail=useCallback(value=>{
    setRentals(current=>current.map(r=>r.id===value.id?normalizeRental(mergeRentalUpdate(r,value),servers):r));
    setAdminRentals(current=>current.map(r=>r.id===value.id?normalizeRental(mergeRentalUpdate(r,value),servers):r));
  },[servers]);
  const connect=async()=>{
    setConnectError('');setConnecting(true);
    try {
      const previous=api;const session=await login(draft);
      if(previous)await previous.logout().catch(()=>{});
      notify(session.storageWarning||'백엔드에 연결했습니다.');
    }catch(e){setConnectError(message(e));}finally{setConnecting(false);}
  };
  const signOut=async()=>{
    const client=api;
    if(ssoEnabled) {
      if (signingOut.current) return;
      signingOut.current=true;
      try { await client?.logout(); clearLocalSession(); }
      catch(e) {
        client?.dispose();
        logoutRecheckNotice.current=`로그아웃을 확인하지 못했습니다. 다시 시도하세요. ${message(e)}`;
        markSsoSession(false);
        restoreRequest.current=null;
        setRestoring(true);
        setRestoreAttempt(value=>value+1);
      } finally { signingOut.current=false; }
      return;
    }
    clearLocalSession();
    try{await client?.logout();}catch(e){setLoginNotice(`이 기기에서는 로그아웃했습니다. 서버 세션 종료는 확인하지 못했습니다. ${message(e)}`);}
  };
  const submitReservation=async({body,key,server})=>{
      if(!api)throw new ApiError('로그인이 필요합니다.','UNAUTHENTICATED',null,401);
      if(!actor.rentalEligible)throw new ApiError('현재 계정은 대여 자격이 없습니다. 관리자에게 문의하세요.','RENTAL_NOT_ELIGIBLE',null,403);
      if(!servers.some(s=>s.id===body.serverId&&s.status==='AVAILABLE'&&s.reservationAllowed))throw new ApiError('점검 중이거나 현재 예약할 수 없는 서버입니다.','SERVER_UNAVAILABLE',null,409);
      const generation=modeGeneration.current;
      if(!previewedKeys.current.has(key)) {
        const preview=await api.preview(body);
        const failure=reservationPreviewFailure(preview,body.serverId,body.slots);
        if(failure)throw new ApiError(failure.message,failure.code,null,failure.status);
        previewedKeys.current.add(key);
      }
      const response=await api.reserve(body,key);const r=normalizeRental({...response,...await api.detail(response.id)},servers);
      if(generation!==modeGeneration.current)throw new ApiError('로그인 상태가 변경되었습니다. 새로 연결한 계정의 대여 내역을 확인하세요.','SESSION_CHANGED',null,401);
      setRentals(current=>[r,...current.filter(x=>x.id!==r.id)]);setSelectedServer(null);setCategory(null);setProgressId(r.id);notify('예약이 접수되었습니다. 실제 준비 상태를 확인합니다.');return;
  };
  const askAction=(type,item)=>{setConfirm({type,item,key:requestKey()});setReason('');setActionError('');};
  const refreshCategories=async()=>{
    const generation=modeGeneration.current;
    await listRequest.current?.promise;
    if(!alive.current||generation!==modeGeneration.current)throw new ApiError('로그인 상태가 변경되었습니다.','SESSION_CHANGED');
    const result=await refresh(true);
    if(result?.error)throw result.error;
    return result;
  };
  const saveServer=async(draft,original,key)=>{
    if(actor?.role!=='ADMIN')throw new Error('관리자만 서버 정보를 변경할 수 있습니다.');
    if(!api)throw new Error('로그인이 필요합니다.');
    const errors=validateServer(draft,adminCategories,servers,original?.id,!original);
    if(Object.keys(errors).length)throw new Error(Object.values(errors)[0]);
    const generation=modeGeneration.current;
    try{
      const payload=original?serverEditPayload(draft):serverPayload(draft);const result=original?await api.editServer(original,payload):await api.createServer(payload,key);
      if(!alive.current||generation!==modeGeneration.current)throw new Error('연결 모드가 변경되었습니다. 현재 목록에서 등록 결과를 확인하세요.');
      const server=normalizeServer({...payload,...result,category:adminCategories.find(c=>c.id===payload.categoryId)?.name,...(!original?{reservationAllowed:false}:{})});
      setServers(current=>[...current.filter(s=>s.id!==server.id),server]);
      notify(original?'서버 정보를 수정했습니다.':'서버를 등록했습니다. 실제 상태를 확인합니다.');await refresh(true);return server;
    }catch(e){if(generation===modeGeneration.current)await refresh(true);throw new Error(message(e));}
  };
  const deleteServer=async(server,reason,key)=>{
    if(actor?.role!=='ADMIN'||!api)throw new Error('관리자만 서버를 삭제할 수 있습니다.');
    if(!reason.trim()||reason.trim().length>500)throw new Error('삭제 사유를 1~500자로 입력하세요.');
    const generation=modeGeneration.current;
    try{
      await api.deleteServer(server,reason.trim(),key);
      if(generation!==modeGeneration.current)throw new Error('로그인 상태가 변경되었습니다.');
      setServers(current=>current.filter(s=>s.id!==server.id));notify(`${server.name} 서버를 삭제했습니다.`);await refresh(true);
    }catch(e){if(generation===modeGeneration.current)await refresh(true);throw new Error(message(e));}
  };
  const perform=async()=>{
    if(actionLock.current)return;
    if(['maintenance','force'].includes(confirm.type)&&!reason.trim()){setActionError('변경 사유를 입력하세요.');return;}
    actionLock.current=true;setBusy(true);setActionError('');const generation=modeGeneration.current;
    try{
      const {type,item,key}=confirm;
      if(type==='maintenance'){
        const status=item.status==='MAINTENANCE'?'AVAILABLE':'MAINTENANCE';
        const result=await api.maintenance(item,status,reason.trim());
        if(generation!==modeGeneration.current)return;
        setServers(current=>current.map(s=>s.id===item.id?normalizeServer({...s,...result,status,reservationAllowed:false}):s));notify(status==='MAINTENANCE'?'점검 상태로 변경했습니다.':'점검을 해제했습니다.');await refresh(true);
      }else{
        if(type==='force'){
          const target=forceReturnTarget(adminRentals,item.serverId,item.id);
          if(!target)throw new Error('선택한 대여가 종료되었거나 회수할 수 없습니다. 창을 닫고 대상을 다시 선택하세요.');
          if(target.version!==item.version)throw new Error('선택한 대여의 정보가 변경되었습니다. 창을 닫고 대상을 다시 확인하세요.');
        }
        const action=type==='force'?'force-return':item.status==='RESERVED'?'cancel':'return';
        const result=await api.finish(item,reason.trim()||'사용자 반납 요청',key,action);
        if(generation!==modeGeneration.current)return;
        setRentals(current=>current.map(r=>r.id===item.id?{...r,...result}:r));setAdminRentals(current=>current.map(r=>r.id===item.id?{...r,...result}:r));
        await refresh(true);notify(result.status==='CANCELLED'?'예약을 취소했습니다.':'반납 요청을 접수했습니다.');
      }
      setConfirm(null);
    }catch(e){if(generation===modeGeneration.current){setActionError(message(e));if(api)await refresh(true);}}finally{actionLock.current=false;setBusy(false);}
  };
  const progress=rentals.find(r=>r.id===progressId);const isAdmin=actor?.role==='ADMIN';
  const ownRentals=rentals;
  if(restoring)return <SafeAreaProvider><SafeAreaView className="flex-1 items-center justify-center bg-canvas px-6"><View className="w-full max-w-[420px] gap-4">
    {restoreError?<>
      <Heading>{ssoEnabled?'서버 대여를 불러오지 못했습니다':'로그인 상태를 확인하지 못했습니다'}</Heading>
      <Notice error>{restoreError}</Notice>
      <Button icon="refresh" onPress={()=>{restoreRequest.current=null;setRestoreAttempt(value=>value+1);}}>다시 확인</Button>
      {ssoEnabled&&<Button variant="secondary" onPress={()=>window.location.assign('/')}>SE 게시판으로 돌아가기</Button>}
      <Button variant="secondary" onPress={()=>{clearLocalSession();setRestoreError('');setRestoring(false);}}>다시 로그인</Button>
    </>:<View className="items-center gap-3"><ActivityIndicator color="#2563eb" size="large" /><Text className="text-sm text-muted">로그인 상태를 확인하고 있습니다.</Text></View>}
  </View></SafeAreaView></SafeAreaProvider>;
  if(!actor)return <SafeAreaProvider><SafeAreaView className="flex-1 bg-canvas"><LoginScreen apiUrl={config.url} initialNotice={loginNotice} onLogin={login} onSso={ssoEnabled ? beginSso : null} /></SafeAreaView></SafeAreaProvider>;
  return <SafeAreaProvider><SafeAreaView className="flex-1 bg-canvas" edges={['top','left','right']}>
    <AppHeader actor={actor} api={api} onRent={()=>{setCategory(null);navigate('rent');}} onBoardHome={ssoEnabled?()=>window.location.assign('/'):undefined} onSignOut={signOut} />
    <View className="border-b border-line bg-white"><View className="mx-auto w-full max-w-[1120px] flex-row flex-wrap items-center justify-between gap-x-2 px-3 xl:px-0"><View className="flex-row">{tabs.filter(([id])=>id!=='admin'||isAdmin).map(([id,label])=><Pressable key={id} accessibilityRole="tab" accessibilityState={{selected:tab===id}} onPress={()=>navigate(id)} className={`border-b-2 px-4 py-4 ${tab===id?'border-brand':'border-transparent'}`}><Text className={`text-sm ${tab===id?'text-brand':'text-muted'}`}>{label}</Text></Pressable>)}</View>{!ssoEnabled && <View className="flex-row items-center gap-2"><Pressable accessibilityRole="button" accessibilityLabel="연결 설정" onPress={()=>{setDraft({...config,username:'',password:''});setConnectError('');setSettings(true);}} className="rounded-lg border border-line px-3 py-1.5"><Text className="text-[11px] text-muted">백엔드 연결{width>600?' · 설정':''}</Text></Pressable></View>}</View></View>
    <ScrollView ref={scroll} className="flex-1" keyboardShouldPersistTaps="handled"><View className="mx-auto w-full max-w-[1120px] px-5 pt-8 pb-16 xl:px-0">
      {error ? <View className="mb-5 gap-2"><Notice error>{error}</Notice><Button variant="secondary" onPress={()=>refresh()}>다시 시도</Button></View> : null}
      {loading && <View className="mb-4 flex-row items-center gap-2"><ActivityIndicator color="#2563eb" size="small" /><Text className="text-sm text-muted">서버 데이터를 불러오고 있습니다.</Text></View>}
      {loaded && tab==='rent' && <RentScreen servers={servers} rentals={ownRentals} categories={categories} selectedCategory={selectedServer ? null : category} setCategory={setCategory} onRent={setSelectedServer} rentalEligible={actor.rentalEligible} />}
      {loaded && tab==='mine' && <><Text accessibilityRole="header" className="mb-6 text-[30px] font-bold text-ink">내 대여 현황</Text><MyRentalsScreen rentals={ownRentals} servers={servers} api={api} onFinish={r=>askAction('return',r)} onToast={notify} onDetail={acceptRentalDetail} trackingEnabled={!progressId} /></>}
      {loaded && tab==='admin' && isAdmin && <AdminScreen key={actor.memberId} api={api} servers={servers} rentals={adminRentals} categories={adminCategories} onCategoriesChanged={refreshCategories} onMaintenance={s=>askAction('maintenance',s)} onForce={r=>askAction('force',r)} onSaveServer={saveServer} onDeleteServer={deleteServer} onDetail={acceptRentalDetail} onRefresh={()=>refresh(true)} />}
      <View className="mt-12 border-t border-line pt-5"><Text className="text-xs text-slate-400">Software Engineering · Server Allday</Text></View>
    </View></ScrollView>
    {toast ? <View pointerEvents="none" accessibilityRole="alert" className="absolute bottom-7 left-5 right-5 items-center"><View className="rounded-lg bg-ink px-5 py-3"><Text className="text-sm text-white">{toast}</Text></View></View> : null}
    {selectedServer && <ReservationDialog server={servers.find(s=>s.id===selectedServer.id)||{...selectedServer,status:'UNKNOWN',reservationAllowed:false}} api={api} onClose={()=>setSelectedServer(null)} onSubmit={submitReservation} />}
    {progress && <Dialog wide title={progress.status==='ACTIVE'?'이용 중':progress.status==='READY'?'준비 완료':'대여 진행 중'} description="백엔드의 계약 상태를 표시합니다. 실제 접속 가능 여부는 접속 정보 API 결과를 따릅니다." onClose={()=>setProgressId(null)}><View className="mb-5 rounded-lg bg-canvas p-4"><Text className="text-base font-semibold text-ink">{progress.serverName}</Text><Text className="mt-2 text-xs text-muted">{progress.from} ~ {progress.to} · {rentalTimeLabel(progress)}</Text></View><RentalProgress rental={progress} api={api} onDetail={acceptRentalDetail} /><View className="mt-6 flex-row justify-end gap-2"><Button variant="secondary" onPress={()=>setProgressId(null)}>닫기</Button><Button onPress={()=>{setProgressId(null);navigate('mine');}}>내 대여 현황 확인</Button></View></Dialog>}
    {settings && <Dialog title="연결 설정" description="백엔드 주소와 로그인 정보를 입력하세요." onClose={()=>{if(!connecting){setSettings(false);setDraft(d=>({...d,password:''}));}}}>
      <BackendAccessFields value={draft} onChange={setDraft} busy={connecting} showAddress onSubmit={connect} />
      {connectError?<View className="mt-4"><Notice error>{connectError}</Notice></View>:null}
      <View className="mt-6 flex-row justify-end"><Button disabled={connecting} onPress={connect}>{connecting?'연결 확인 중…':'연결 확인'}</Button></View>
    </Dialog>}
    {confirm && <Dialog title={confirm.type==='maintenance'?(confirm.item.status==='MAINTENANCE'?'점검 해제':'서버 점검'):confirm.type==='force'?'선택한 대여 강제 회수':confirm.item.status==='RESERVED'?'예약 취소':'서버 반납'} description={confirm.type==='maintenance'?`${confirm.item.name}의 점검 상태를 변경합니다.`:`${confirm.item.serverName}의 ${confirm.item.from} ~ ${confirm.item.to} 대여를 종료합니다.`} onClose={()=>!busy&&setConfirm(null)}>
      {confirm.type==='force'&&<View className="mb-4 gap-2 rounded-lg border border-line bg-canvas p-4"><Text className="text-base font-semibold text-ink">{rentalMemberLabel(confirm.item)} · 대여 #{confirm.item.id}</Text><Text className="text-sm text-muted">{confirm.item.serverName}</Text><Text className="text-sm text-muted">{confirm.item.from} ~ {confirm.item.to}</Text><Text className="text-sm text-muted">{rentalTimeLabel(confirm.item)}</Text><Text className="text-sm leading-6 text-muted">{confirm.item.purpose}</Text></View>}
      {confirm.type!=='maintenance' && <Notice>{confirm.type==='force'?'선택한 대여가 종료되며, 생성된 VM과 저장된 데이터는 삭제됩니다.':'반납 시 VM과 저장된 데이터가 초기화됩니다. 필요한 파일을 먼저 백업하세요.'}</Notice>}
      {confirm.type==='maintenance'&&<Notice>{confirm.item.status==='MAINTENANCE'?'점검 해제 후 현재 이용 시간에 해당하는 대여만 접속 가능 여부를 다시 확인합니다.':'점검 중에는 신규 예약과 접속 정보 제공을 중단합니다. 기존 대여 기록과 저장된 데이터는 유지됩니다.'}</Notice>}
      <Text className="mt-4 mb-2 text-sm text-ink">{['force','maintenance'].includes(confirm.type)?'변경 사유 (필수)':'반납 사유 (선택)'}</Text><TextInput accessibilityLabel="변경 사유" value={reason} maxLength={500} onChangeText={setReason} multiline className={inputClass} />
      {actionError?<View className="mt-4"><Notice error>{actionError}</Notice></View>:null}
      <View className="mt-6 flex-row justify-end gap-2"><Button variant="secondary" disabled={busy} onPress={()=>setConfirm(null)}>취소</Button><Button variant={confirm.type==='force'?'danger':'primary'} disabled={busy} onPress={perform}>{busy?'처리 중…':confirm.type==='force'?'강제 회수 확인':'확인'}</Button></View>
    </Dialog>}
  </SafeAreaView></SafeAreaProvider>;
}

