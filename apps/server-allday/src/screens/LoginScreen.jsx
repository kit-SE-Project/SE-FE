import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { Button, Notice } from '../components/ui';
import BackendAccessFields from '../components/BackendAccessFields';
import BrandLogo from '../components/BrandLogo';
import { validateLogin } from '../api';

export default function LoginScreen({ onLogin, onSso, apiUrl, initialNotice = '' }) {
  const { height } = useWindowDimensions();
  const [access, setAccess] = useState({ url: apiUrl, username: '', password: '' });
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const submit = async () => {
    if (lock.current) return;
    setFailure('');
    const error = validateLogin(access.username,access.password);
    if (error) { setFailure(error); return; }
    lock.current = true; setBusy(true);
    try { await onLogin(access); setAccess(v => ({ ...v, password: '' })); }
    catch (error) { setFailure(`${error.message}${error.requestId ? ` (요청 ID: ${error.requestId})` : ''}`); }
    finally { lock.current = false; setBusy(false); }
  };
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingVertical: height < 700 ? 28 : 48 }}>
    <View className="mx-auto w-full max-w-[420px]">
      <View className="mb-7 items-center gap-3"><BrandLogo size={56} /><Text className="text-sm text-muted">Software Engineering</Text></View>
      <View className="rounded-2xl border border-line bg-white p-6 sm:p-8">
        <Text accessibilityRole="header" className="text-[28px] font-bold text-ink">로그인</Text>
        <Text className="mt-2 mb-7 text-sm leading-6 text-muted">{onSso ? 'SE 게시판 계정으로 서버 대여 서비스를 이용하세요.' : '아이디와 비밀번호로 서버 대여 서비스를 이용하세요.'}</Text>
        {initialNotice ? <View className="mb-4"><Notice>{initialNotice}</Notice></View> : null}
        {onSso ? <Button onPress={onSso}>SE 게시판으로 로그인</Button> : <>
        <BackendAccessFields value={access} onChange={value => { setAccess(value); setFailure(''); }} busy={busy} onSubmit={submit} />
        {failure ? <View className="mt-4"><Notice error>{failure}</Notice></View> : null}
        <Button className="mt-6" disabled={busy} onPress={submit}>{busy ? '연결 확인 중…' : '로그인'}</Button>
        </>}
      </View>
      <Text className="mt-7 text-center text-xs text-slate-400">Software Engineering · Server Allday</Text>
    </View>
  </ScrollView>;
}
