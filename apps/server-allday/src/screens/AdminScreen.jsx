import React, { useEffect, useReducer, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, useWindowDimensions, Platform } from 'react-native';
import { Heading, Panel, Badge, Button, Icon, Dialog, Notice, inputClass } from '../components/ui';
import { requestKey } from '../api';
import ServerEditor from '../components/ServerEditor';
import CategoryManager from '../components/CategoryManager';
import AdminSystemLogs from '../components/AdminSystemLogs';
import AdminImmediateRental from '../components/AdminImmediateRental';
import RentalProgress from '../components/RentalProgress';
const { CLOSED, rentalTimeLabel } = require('../domain.cjs');
const { EMPTY_SELECTION, serverSelection, rentalMemberLabel, canForceReturn, serverOpenRentals, forceReturnTarget } = require('../admin-view.cjs');

function Cell({ children, flex = 1, heading = false }) { return <View style={{ flex }} className="pr-3">{typeof children === 'string' ? <Text className={heading ? 'text-xs text-muted' : 'text-sm text-muted'}>{children}</Text> : children}</View>; }

export default function AdminScreen({ servers, rentals, categories, api, onCategoriesChanged, onMaintenance, onForce, onSaveServer, onDeleteServer, onDetail, onRefresh }) {
  const { width } = useWindowDimensions();
  const mobile = width < 750;
  const [selection, dispatchSelection] = useReducer(serverSelection, EMPTY_SELECTION);
  const selectedId = selection.serverId;
  const [expanded, setExpanded] = useState(null);
  const [editor, setEditor] = useState(null);
  const [managingCategories, setManagingCategories] = useState(false);
  const [forceSelection, setForceSelection] = useState(null);
  const [forceError, setForceError] = useState('');
  const [immediateServerId, setImmediateServerId] = useState(null);
  const [returningId,setReturningId]=useState(null);
  const [deleting,setDeleting] = useState(null);const [deleteReason,setDeleteReason] = useState('');const [deleteError,setDeleteError] = useState('');const [deletingBusy,setDeletingBusy] = useState(false);
  const deletingLock=useRef(false);const deleteAttempt=useRef(null);

  const selected = servers.find(s => s.id === selectedId);
  const forceServer = servers.find(s => s.id === forceSelection?.serverId);
  const forceRentals = forceSelection ? serverOpenRentals(rentals, forceSelection.serverId) : [];
  const forceTarget = forceSelection ? forceReturnTarget(rentals, forceSelection.serverId, forceSelection.rentalId) : null;
  useEffect(() => {
    if (selectedId !== null && !servers.some(s => s.id === selectedId)) dispatchSelection({ type: 'reset' });
    if (expanded !== null && !servers.some(s => s.id === expanded)) setExpanded(null);
  }, [servers, selectedId, expanded]);
  const resetSelection = () => dispatchSelection({ type: 'reset' });
  const closeEditor = () => { setEditor(null); resetSelection(); };
  const closeDelete = () => { if (!deletingLock.current) { setDeleting(null); resetSelection(); } };
  const select = s => {
    if (!selection.mode) return;
    dispatchSelection({ type: 'select', serverId: s.id });
    if (selection.mode === 'edit') setEditor({ server: s, key: requestKey() });
    else { setDeleting(s); setDeleteReason(''); setDeleteError(''); deleteAttempt.current = null; }
  };
  const save = async (draft, original, key) => {
    await onSaveServer(draft, original, key);
    closeEditor();
  };
  const remove = async () => {
    if(deletingLock.current)return;
    if(!deleteReason.trim()||deleteReason.trim().length>500){setDeleteError('삭제 사유를 1~500자로 입력하세요.');return;}
    const signature=JSON.stringify({id:deleting.id,version:deleting.version,reason:deleteReason.trim()});
    if(deleteAttempt.current?.signature!==signature)deleteAttempt.current={signature,key:requestKey()};
    deletingLock.current=true;setDeletingBusy(true);setDeleteError('');
    try{await onDeleteServer(deleting,deleteReason.trim(),deleteAttempt.current.key);setDeleting(null);resetSelection();setExpanded(null);}
    catch(error){setDeleteError(error.message);}
    finally{deletingLock.current=false;setDeletingBusy(false);}
  };
  const openForceSelection = server => { setForceSelection({ serverId: server.id, rentalId: null }); setForceError(''); };
  const confirmForceSelection = () => {
    const target = forceReturnTarget(rentals, forceSelection?.serverId, forceSelection?.rentalId);
    if (!target) { setForceError('선택한 대여가 종료되었거나 회수할 수 없습니다. 목록을 다시 확인하세요.'); return; }
    setForceSelection(null); onForce(target);
  };
  const actions = (s, active) => <View className="flex-row flex-wrap justify-end gap-2">
    <Button icon="bolt" onPress={() => setImmediateServerId(s.id)}>즉시 대여</Button>
    {active.some(canForceReturn) && <Button variant="secondary" icon="refresh" onPress={() => openForceSelection(s)}>강제 회수</Button>}
    {active.some(r=>r.status==='RETURNING') && <Button variant="secondary" onPress={()=>setReturningId(active.find(r=>r.status==='RETURNING').id)}>반납 상태</Button>}
    <Button variant="ghost" icon="tool" onPress={() => onMaintenance(s)}>{s.status === 'MAINTENANCE' ? '점검 해제' : '점검'}</Button>
  </View>;
  const selectButton = s => selection.mode ? <Pressable accessibilityRole="radio" accessibilityLabel={`${s.name} ${selection.mode === 'edit' ? '수정' : '삭제'} 대상으로 선택`} accessibilityState={{ checked: selectedId === s.id }} onPress={() => select(s)} className="min-h-[44px] flex-row items-center gap-2">
    <View className={`h-5 w-5 items-center justify-center rounded-full border ${selectedId === s.id ? 'border-brand bg-brand' : 'border-slate-300 bg-white'}`}>{selectedId === s.id && <Icon name="tick" size={13} color="#fff" />}</View>
    <Text style={Platform.OS === 'web' ? { overflowWrap: 'anywhere' } : undefined} className={`flex-1 text-sm ${selectedId === s.id ? 'font-semibold text-brand' : 'text-ink'}`}>{s.name}</Text>
  </Pressable> : <Text style={Platform.OS === 'web' ? { overflowWrap: 'anywhere' } : undefined} className="text-sm text-ink">{s.name}</Text>;
  const expandButton = s => <Pressable accessibilityRole="button" accessibilityLabel={`${s.name} 대여 이력`} accessibilityState={{ expanded: expanded === s.id }} onPress={() => setExpanded(expanded === s.id ? null : s.id)} className="min-h-[40px] min-w-[32px] items-center justify-center"><Icon name={expanded === s.id ? 'up' : 'chevron'} size={16} color="#94a3b8" /></Pressable>;
  const historyPanel = s => {
    const history = rentals.filter(r => r.serverId === s.id);
    return <View className="border-t border-line bg-canvas p-4"><Panel>
      {!mobile && <View className="flex-row bg-canvas p-3">{['대여자', '용도', '대여 기간', '시간대', '상태'].map(label => <Cell heading key={label}>{label}</Cell>)}</View>}
      {history.length ? history.map(r => mobile ? <View key={r.id} className="gap-2 border-t border-line p-3"><View className="flex-row justify-between gap-3"><Text className="flex-1 text-sm text-ink">{r.purpose}</Text><Badge status={r.status} /></View><Text className="text-xs text-muted">{rentalMemberLabel(r)} · {r.from} ~ {r.to}</Text><Text className="text-xs text-muted">{rentalTimeLabel(r)}</Text></View> : <View key={r.id} className="flex-row items-center border-t border-line p-3"><Cell>{rentalMemberLabel(r)}</Cell><Cell>{r.purpose}</Cell><Cell>{`${r.from} ~ ${r.to}`}</Cell><Cell>{rentalTimeLabel(r)}</Cell><Cell><Badge status={r.status} /></Cell></View>) : <Text className="p-6 text-center text-sm text-muted">대여 이력이 없습니다.</Text>}
    </Panel></View>;
  };
  const rows = servers.map(s => {
    const active = serverOpenRentals(rentals, s.id);
    const category = categories.find(c => c.id === s.categoryId)?.name || s.category || '-';
    const spec = `${s.cpu} · ${s.ram} · ${s.gpu}`;
    return <View key={s.id}>
      {mobile ? <View className={`gap-3 border-t border-line p-4 ${selectedId === s.id ? 'border-l-4 border-l-brand bg-blue-50' : ''}`}>
        <View className="flex-row items-center gap-3"><View className="flex-1">{selectButton(s)}</View><Badge status={active.length ? 'RENTED' : s.status} />{expandButton(s)}</View>
        <Text className="text-xs font-medium text-muted">{category}</Text><Text className="text-sm leading-6 text-muted">{spec}</Text>{actions(s, active)}
      </View> : <View className={`flex-row items-center border-t border-line p-4 ${selectedId === s.id ? 'bg-blue-50' : ''}`}>
        <Cell flex={2.2}><View className="flex-row items-center gap-1">{expandButton(s)}<View className="flex-1">{selectButton(s)}</View></View></Cell><Cell flex={1.1}>{category}</Cell><Cell flex={3.3}>{spec}</Cell><Cell flex={1}><Badge status={active.length ? 'RENTED' : s.status} /></Cell><Cell flex={2}>{actions(s, active)}</Cell>
      </View>}
      {expanded === s.id && historyPanel(s)}
    </View>;
  });
  return <View>
    <Text accessibilityRole="header" className="mb-8 text-[30px] font-bold text-ink">관리자 대시보드</Text>
    <View className="mb-4 flex-row flex-wrap items-center justify-between gap-3">
      <Heading>서버 현황</Heading>
      <View className="flex-row flex-wrap gap-2">
        <Button variant="secondary" icon="tool" onPress={() => setManagingCategories(true)}>카테고리 관리</Button>
        <Button icon="plus" onPress={() => { resetSelection(); setEditor({ server: null, key: requestKey() }); }}>서버 추가</Button>
      </View>
    </View>
    <View className={`mb-4 gap-3 ${mobile ? '' : 'flex-row items-center justify-between'}`}>
      <Text accessibilityLiveRegion="polite" className="flex-1 text-sm text-muted">{selection.mode ? selected ? `선택한 서버: ${selected.name}` : `${selection.mode === 'edit' ? '수정' : '삭제'}할 서버 선택` : `전체 ${servers.length}대`}</Text>
      <View className="flex-row flex-wrap gap-2"><Button variant={selection.mode === 'edit' ? 'primary' : 'secondary'} icon="pencil" disabled={!servers.length} onPress={()=>dispatchSelection({type:'begin',mode:'edit'})}>수정</Button><Button variant={selection.mode === 'delete' ? 'danger' : 'secondary'} icon="trash" disabled={!servers.length} onPress={()=>dispatchSelection({type:'begin',mode:'delete'})}>삭제</Button>{selection.mode && <Button variant="ghost" icon="close" onPress={resetSelection}>선택 취소</Button>}</View>
    </View>
    <Panel>{mobile ? rows : <ScrollView horizontal><View style={{ minWidth: 1118 }}><View className="flex-row bg-canvas p-4">{[['서버', 2.2], ['카테고리', 1.1], ['사양', 3.3], ['상태', 1], ['관리', 2]].map(([label, flex]) => <Cell key={label} flex={flex} heading>{label}</Cell>)}</View>{rows}</View></ScrollView>}{!servers.length && <Text className="p-8 text-center text-sm text-muted">등록된 서버가 없습니다. 서버 추가 버튼으로 등록하세요.</Text>}</Panel>
    <Heading className="mt-8 mb-4">대여 기록</Heading><Panel><ScrollView horizontal><View style={{ minWidth: mobile ? 850 : 1120 }}><View className="flex-row bg-canvas p-4">{['서버', '사용 기간', 'GPU', '진행 단계', '용도'].map(label => <Cell heading key={label}>{label}</Cell>)}</View>{rentals.map(r => <View key={r.id} className="flex-row items-center border-t border-line p-4"><Cell>{r.serverName}</Cell><Cell>{`${r.from} ~ ${r.to}`}</Cell><Cell>{r.gpuSnapshot || servers.find(s => s.id === r.serverId)?.gpu || '-'}</Cell><Cell><Badge status={r.status} /></Cell><Cell>{r.purpose}</Cell></View>)}{!rentals.length && <Text className="p-6 text-sm text-muted">대여 기록이 없습니다.</Text>}</View></ScrollView></Panel>
    <AdminSystemLogs api={api} />
    {managingCategories && <CategoryManager api={api} categories={categories} onChanged={onCategoriesChanged} onClose={() => setManagingCategories(false)} />}
    {returningId!==null && <Dialog title="반납 복구 상태" description={`대여 #${returningId}`} onClose={()=>setReturningId(null)}>
      <Notice>장비 연결과 이전 작업 상태를 확인하며 정리를 진행합니다. 실제 정리 검증을 통과해야 반납 완료가 됩니다. 장비가 꺼져 있으면 연결 복구가 필요합니다.</Notice>
      <View className="mt-4"><RentalProgress rental={rentals.find(r=>r.id===returningId)||{id:returningId,status:'RETURNING'}} api={api} onDetail={onDetail}/></View>
      <View className="mt-5 items-end"><Button variant="secondary" onPress={()=>setReturningId(null)}>닫기</Button></View>
    </Dialog>}
    {immediateServerId !== null && <AdminImmediateRental server={servers.find(s => s.id === immediateServerId) || { id: immediateServerId, name: '선택한 서버', status: 'UNKNOWN' }} rentals={rentals} api={api} onClose={() => setImmediateServerId(null)} onDetail={onDetail} onRefresh={onRefresh} />}
    {editor && <ServerEditor key={editor.key} server={editor.server} hasActiveRental={!!editor.server && rentals.some(r=>r.serverId===editor.server.id&&!CLOSED.includes(r.status))} servers={servers} categories={categories} onClose={closeEditor} onSave={save} />}
    {forceSelection && <Dialog title="강제 회수할 대여 선택" description={forceServer?.name || '선택한 서버'} onClose={()=>setForceSelection(null)}>
      <View accessibilityRole="radiogroup" accessibilityLabel="강제 회수 대상 대여" className="border-b border-line">
        {forceRentals.map(r=><Pressable key={r.id} accessibilityRole="radio" accessibilityLabel={`${rentalMemberLabel(r)}, 대여 ${r.id}, ${r.from}부터 ${r.to}, ${rentalTimeLabel(r)}`} accessibilityState={{checked:forceSelection.rentalId===r.id,disabled:!canForceReturn(r)}} disabled={!canForceReturn(r)} onPress={()=>{setForceSelection(current=>({...current,rentalId:r.id}));setForceError('');}} className={`flex-row items-start gap-3 border-t border-line py-4 ${!canForceReturn(r)?'opacity-50':''}`}>
          <View className={`mt-1 h-5 w-5 items-center justify-center rounded-full border ${forceSelection.rentalId===r.id?'border-brand bg-brand':'border-slate-300 bg-white'}`}>{forceSelection.rentalId===r.id&&<Icon name="tick" size={13} color="#fff"/>}</View>
          <View className="flex-1 gap-2"><View className="flex-row flex-wrap items-center justify-between gap-2"><Text className="text-sm font-semibold text-ink">{rentalMemberLabel(r)}</Text><Badge status={r.status}/></View><Text className="text-xs text-muted">대여 #{r.id}</Text><Text className="text-sm text-muted">{r.from} ~ {r.to}</Text><Text className="text-sm text-muted">{rentalTimeLabel(r)}</Text><Text className="text-sm leading-6 text-muted">{r.purpose}</Text></View>
        </Pressable>)}
      </View>
      {!forceRentals.length&&<Text className="py-6 text-center text-sm text-muted">회수할 대여가 없습니다.</Text>}
      {forceError&&<View className="mt-4"><Notice error>{forceError}</Notice></View>}
      <View className="mt-6 flex-row justify-end gap-2"><Button variant="secondary" onPress={()=>setForceSelection(null)}>취소</Button><Button icon="right" disabled={!forceServer||!forceTarget} onPress={confirmForceSelection}>다음</Button></View>
    </Dialog>}
    {deleting && <Dialog title="서버 삭제 확인" description="선택한 서버를 대여 목록에서 제외하시겠습니까?" onClose={closeDelete}>
      <View className="rounded-lg border border-line bg-canvas p-4"><Text className="text-base font-semibold text-ink">{deleting.name}</Text><Text className="mt-2 text-sm text-muted">{categories.find(c=>c.id===deleting.categoryId)?.name} · {deleting.cpu} · {deleting.ram} · {deleting.gpu}</Text></View>
      <Text className="mt-4 text-sm leading-6 text-muted">삭제 후에는 새 대여를 신청할 수 없으며, 과거 대여 기록은 보존됩니다. 진행 중인 대여나 사용 중인 자원이 있는 서버는 삭제할 수 없습니다.</Text>
      <Text className="mt-5 mb-2 text-sm font-medium text-ink">삭제 사유 (필수)</Text><TextInput accessibilityLabel="삭제 사유" editable={!deletingBusy} value={deleteReason} onChangeText={setDeleteReason} maxLength={500} multiline className={inputClass} />
      {deleteError?<View className="mt-4"><Notice error>{deleteError}</Notice><Text className="mt-2 text-xs text-muted">서버 정보가 변경된 경우 창을 닫고 다시 선택하세요.</Text></View>:null}
      <View className="mt-6 flex-row justify-end gap-2"><Button variant="secondary" disabled={deletingBusy} onPress={closeDelete}>취소</Button><Button variant="danger" disabled={deletingBusy} onPress={remove}>{deletingBusy?'삭제 중…':'삭제 확인'}</Button></View>
    </Dialog>}
  </View>;
}
