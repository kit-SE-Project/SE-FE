import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button, Dialog, Notice, Panel, inputClass } from './ui';
import { requestKey } from '../api';

const titles = {
  create: '카테고리 추가',
  edit: '카테고리 수정',
  delete: '카테고리 삭제 확인',
};

export default function CategoryManager({ api, categories, onChanged, onClose }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [refreshNeeded, setRefreshNeeded] = useState(false);
  const [nameError, setNameError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const inFlight = useRef(false);
  const attempt = useRef(null);
  const refreshMessage = useRef('');
  const mounted = useRef(true);
  const apiScope = useRef(api);
  apiScope.current = api;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, [api]);
  const active = () => mounted.current && apiScope.current === api;
  const errorMessage = error => `${error.message || '요청을 처리하지 못했습니다.'}${error.requestId ? ' (요청 ID: ' + error.requestId + ')' : ''}`;

  function denyAccess(error) {
    attempt.current = null;
    setForm(null);
    setRefreshNeeded(false);
    setAccessDenied(true);
    setFeedback(errorMessage(error));
  }

  async function reload(message) {
    refreshMessage.current = message;
    try {
      const result = await onChanged();
      if (result?.error) throw result.error;
      if (!active()) return;
      setRefreshNeeded(false);
      setFeedback(message);
    } catch (error) {
      if (!active()) return;
      if (error.status === 403) { denyAccess(error); return; }
      setRefreshNeeded(true);
      setFeedback(`${message} 목록을 다시 불러오지 못했습니다. ${errorMessage(error)}`);
    }
  }

  async function retryReload() {
    if (inFlight.current || accessDenied || !active()) return;
    inFlight.current = true;
    setBusy(true);
    try { await reload(refreshMessage.current); }
    finally { inFlight.current = false; if (active()) setBusy(false); }
  }

  function openForm(action, category) {
    if (inFlight.current || refreshNeeded || accessDenied) return;
    attempt.current = null;
    setFeedback('');
    setNameError('');
    setForm({ action, category, name: category?.name ?? '', description: category?.description ?? '' });
  }

  function changeField(field, value) {
    if (inFlight.current) return;
    setFeedback('');
    if (field === 'name') setNameError('');
    setForm(current => ({ ...current, [field]: value }));
  }

  async function submit() {
    if (inFlight.current || refreshNeeded || accessDenied || !form || !active()) return;
    const { action, category, name, description } = form;
    if (action !== 'delete' && !name.trim()) {
      setNameError('카테고리 이름을 입력하세요.');
      return;
    }
    const fields = { name: name.trim(), description: description.trim() || null };
    if (action !== 'delete' && fields.name.length > 100) {
      setNameError('카테고리 이름은 100자 이내로 입력하세요.');
      return;
    }
    if (action !== 'delete' && (fields.description?.length || 0) > 2000) {
      setFeedback('카테고리 설명은 2,000자 이내로 입력하세요.');
      return;
    }
    const versionValid = Number.isSafeInteger(category?.version) && category.version >= 0;
    if (action !== 'create' && (!Number.isSafeInteger(category?.id) || category.id <= 0 || !versionValid)) {
      setFeedback('카테고리 ID와 버전을 확인하지 못했습니다. 창을 닫고 목록을 다시 조회하세요.');
      return;
    }
    const body = action === 'create' ? fields : action === 'edit' ? { ...fields, expectedVersion: category.version } : { expectedVersion: category.version };
    const signature = JSON.stringify({ action, id: category?.id, body });
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: requestKey(), body };
    const { key, body: payload } = attempt.current;
    inFlight.current = true;
    setBusy(true);
    setFeedback('');
    setNameError('');
    try {
      if (action === 'create') await api.createCategory(payload, key);
      if (action === 'edit') await api.editCategory(category.id, payload, key);
      if (action === 'delete') await api.deleteCategory(category.id, payload.expectedVersion, key);
      if (!active()) return;
      setForm(null);
      attempt.current = null;
      const completed = { create: '카테고리를 추가했습니다.', edit: '카테고리를 수정했습니다.', delete: '카테고리를 삭제했습니다.' }[action];
      setFeedback(completed);
      await reload(completed);
    } catch (error) {
      if (!active()) return;
      if (error.status === 403) { denyAccess(error); return; }
      if (error.code === 'CATEGORY_NAME_EXISTS') {
        setNameError(error.message);
        setFeedback(error.requestId ? '요청 ID: ' + error.requestId : '');
        return;
      }
      if (error.code === 'IDEMPOTENCY_KEY_REUSED') attempt.current = null;
      setFeedback(errorMessage(error));
      if (error.code === 'VERSION_CONFLICT' || error.status === 404) {
        setForm(null);
        attempt.current = null;
        await reload(`${errorMessage(error)} 최신 목록에서 대상을 다시 선택하세요.`);
      }
    } finally {
      inFlight.current = false;
      if (active()) setBusy(false);
    }
  }

  const deleting = form?.action === 'delete';
  return <Dialog
    title={form ? titles[form.action] : '카테고리 관리'}
    description={form ? undefined : '서버 대여 화면에 표시되는 카테고리 목록입니다.'}
    onClose={() => { if (!inFlight.current) onClose(); }}
  >
    {accessDenied ? <Notice error>{feedback}</Notice> : form ? <View className="gap-4">
      {deleting ? <View className="rounded-lg border border-line bg-canvas p-4">
        <Text className="text-base font-semibold text-ink">{form.name}</Text>
        <Text className="mt-2 text-sm leading-6 text-muted">이 카테고리를 삭제하시겠습니까?</Text>
      </View> : <>
        <View>
          <Text className="mb-2 text-sm font-medium text-ink">카테고리 이름 <Text className="text-red-600">*</Text></Text>
          <TextInput accessibilityLabel="카테고리 이름" accessibilityHint={nameError || undefined} aria-invalid={!!nameError} className={`${inputClass} ${nameError ? 'border-red-400' : ''}`} value={form.name} editable={!busy} maxLength={100} onChangeText={value => changeField('name', value)} />
          {nameError ? <Text accessibilityRole="alert" className="mt-2 text-xs text-red-700">{nameError}</Text> : null}
        </View>
        <View>
          <Text className="mb-2 text-sm font-medium text-ink">설명 (선택)</Text>
          <TextInput accessibilityLabel="카테고리 설명" className={`${inputClass} min-h-[88px]`} value={form.description} editable={!busy} maxLength={2000} multiline onChangeText={value => changeField('description', value)} />
        </View>
      </>}
      {feedback && <Notice>{feedback}</Notice>}
      <View className="flex-row flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={busy} onPress={() => { setForm(null); setFeedback(''); }}>취소</Button>
        <Button variant={deleting ? 'danger' : 'primary'} disabled={busy} onPress={submit}>{busy ? '처리 중' : deleting ? '삭제 확인' : '저장'}</Button>
      </View>
    </View> : <View className="gap-4">
      {feedback && <Notice>{feedback}</Notice>}
      {refreshNeeded && <Button variant="secondary" icon="refresh" disabled={busy} onPress={retryReload}>{busy ? '목록 확인 중…' : '목록 다시 불러오기'}</Button>}
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className="text-sm text-muted">전체 {categories.length}개</Text>
        <Button icon="plus" disabled={busy || refreshNeeded} onPress={() => openForm('create')}>카테고리 추가</Button>
      </View>
      <Panel>
        {categories.map((category, index) => <View key={category.id} className={`flex-row flex-wrap items-center gap-3 p-4 ${index ? 'border-t border-line' : ''}`}>
          <View className="min-w-[140px] flex-1 gap-1">
            <Text className="text-sm font-semibold text-ink">{category.name}</Text>
            {category.description ? <Text numberOfLines={2} className="text-sm leading-5 text-muted">{category.description}</Text> : null}
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Button variant="secondary" icon="pencil" disabled={busy || refreshNeeded} onPress={() => openForm('edit', category)}>수정</Button>
            <Button variant="secondary" icon="trash" disabled={busy || refreshNeeded} onPress={() => openForm('delete', category)}>삭제</Button>
          </View>
        </View>)}
        {!categories.length && <Text className="p-6 text-center text-sm text-muted">등록된 카테고리가 없습니다.</Text>}
      </Panel>
    </View>}
  </Dialog>;
}
