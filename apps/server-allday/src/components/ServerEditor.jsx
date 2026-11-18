import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Button, Dialog, Notice, inputClass } from './ui';
import { requestKey } from '../api';
const { serverDraft, validateServer } = require('../server-management.cjs');

export default function ServerEditor({ server, hasActiveRental, servers, categories, onClose, onSave }) {
  const [draft, setDraft] = useState(() => serverDraft(server));
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const attempt = useRef(null);
  const field = (name, value) => { setDraft(d => ({ ...d, [name]: value })); setErrors(e => ({ ...e, [name]: null })); setFailure(''); };
  const save = async () => {
    if (lock.current) return;
    const nextErrors = validateServer(draft, categories, servers, server?.id, !server);
    setErrors(nextErrors); setFailure('');
    if (Object.keys(nextErrors).length) return;
    lock.current = true; setBusy(true);
    const signature = JSON.stringify(draft);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: requestKey() };
    try { await onSave(draft, server, attempt.current.key); }
    catch (error) { setFailure(error.message); }
    finally { lock.current = false; setBusy(false); }
  };
  const input = (name, label, placeholder, options = {}) => <View className="mb-4">
    <Text className="mb-2 text-sm font-medium text-ink">{label} <Text className="text-red-600">*</Text></Text>
    <TextInput accessibilityLabel={label} accessibilityState={{ disabled: busy || (hasActiveRental && ['cpuModel','memoryGb','gpuModel'].includes(name)) }} editable={!busy && !(hasActiveRental && ['cpuModel','memoryGb','gpuModel'].includes(name))} value={draft[name]} onChangeText={value => field(name, value)} placeholder={placeholder} placeholderTextColor="#94a3b8" className={`${inputClass} ${errors[name] ? 'border-red-400' : ''}`} {...options} />
    {errors[name] && <Text accessibilityRole="alert" className="mt-2 text-xs text-red-700">{errors[name]}</Text>}
  </View>;
  return <Dialog title={server?'서버 정보 수정':'서버 추가'} description={server?`${server.name}의 표시 정보를 수정합니다.`:'서버명, 사양, 카테고리를 입력해 서버를 등록하세요.'} onClose={() => !lock.current && onClose()}>
    {hasActiveRental && <View className="mb-4"><Notice>진행 중인 대여가 있어 서버명만 변경할 수 있습니다. 사양과 카테고리는 반납 완료 후 변경하세요.</Notice></View>}
    {input('displayName', '서버명', '예: SE-Server-07', { maxLength: 100 })}
    <Text className="mb-4 text-base font-semibold text-ink">서버 사양</Text>
    {input('cpuModel', 'CPU 사양', '예: AMD EPYC 7402 · 24c', { maxLength: 200 })}
    {input('memoryGb', '메모리 (GB)', '예: 128', { keyboardType: 'number-pad', maxLength: 10 })}
    {input('gpuModel', 'GPU 사양', '예: RTX 4090 x1 또는 없음', { maxLength: 200 })}
    <Text className="-mt-2 mb-5 text-xs text-muted">GPU가 없는 서버는 없음을 입력하세요.</Text>
    <Text className="mb-2 text-sm font-medium text-ink">카테고리 <Text className="text-red-600">*</Text></Text>
    <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">{categories.map(c => <Pressable key={c.id} accessibilityRole="radio" aria-checked={draft.categoryId === c.id} accessibilityState={{ checked: draft.categoryId === c.id, disabled: busy || hasActiveRental }} disabled={busy || hasActiveRental} onPress={() => field('categoryId', c.id)} className={`min-h-[44px] justify-center rounded-lg border px-4 py-3 ${draft.categoryId === c.id ? 'border-brand bg-blue-50' : 'border-line bg-white'}`}><Text className={`text-sm ${draft.categoryId === c.id ? 'font-semibold text-brand' : 'text-muted'}`}>{c.name}</Text></Pressable>)}</View>
    {!categories.length && <Text className="mt-2 text-xs text-red-700">등록할 카테고리가 없습니다. 카테고리 데이터를 확인하세요.</Text>}
    {errors.categoryId && <Text accessibilityRole="alert" className="mt-2 text-xs text-red-700">{errors.categoryId}</Text>}
    {!server && <View className="mt-5">{input('nodeName', '관리 노드명', 'Proxmox에 등록된 노드명', { maxLength: 100, autoCapitalize: 'none', autoCorrect: false })}<Text className="text-xs leading-5 text-muted">실제 서버 등록에 필요한 노드명입니다. 운영 환경의 Proxmox 노드명을 입력하세요.</Text></View>}
    {server && <View className="mt-5">{input('reason','변경 사유','서버 정보를 변경하는 사유를 입력하세요',{maxLength:500,multiline:true})}</View>}
    {failure ? <View className="mt-5"><Notice error>{failure}</Notice><Text className="mt-2 text-xs leading-5 text-muted">서버 정보가 변경된 경우 창을 닫고 목록에서 다시 선택하세요.</Text></View> : null}
    <View className="mt-6 flex-row justify-end gap-2"><Button variant="secondary" disabled={busy} onPress={onClose}>취소</Button><Button disabled={busy} onPress={save}>{busy ? '저장 중…' : '저장'}</Button></View>
  </Dialog>;
}
