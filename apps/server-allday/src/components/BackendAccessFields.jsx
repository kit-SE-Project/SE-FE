import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Icon, inputClass } from './ui';

export default function BackendAccessFields({ value, onChange, busy, onSubmit, showAddress = false }) {
  const passwordInput = useRef(null);
  const [visible,setVisible] = useState(false);const [expanded,setExpanded] = useState(showAddress);
  return <View>
    <Text className="mb-2 text-sm font-medium text-ink">아이디</Text>
    <TextInput accessibilityLabel="아이디" value={value.username || ''} editable={!busy} autoCapitalize="none" autoCorrect={false} autoComplete="username" maxLength={254} placeholder="아이디를 입력하세요" placeholderTextColor="#94a3b8" returnKeyType="next" onSubmitEditing={()=>passwordInput.current?.focus()} onChangeText={username => onChange({ ...value, username })} className={inputClass} />
    <Text className="mt-5 mb-2 text-sm font-medium text-ink">비밀번호</Text>
    <View className="flex-row items-center rounded-lg border border-line bg-white">
      <TextInput ref={passwordInput} accessibilityLabel="비밀번호" value={value.password || ''} editable={!busy} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="off" maxLength={256} placeholder="비밀번호를 입력하세요" placeholderTextColor="#94a3b8" returnKeyType="go" onSubmitEditing={onSubmit} onChangeText={password => onChange({ ...value, password })} className="min-h-[44px] flex-1 px-3 py-3 text-sm text-ink" />
      <Pressable accessibilityRole="button" accessibilityLabel={visible?'비밀번호 숨기기':'비밀번호 보기'} disabled={busy} onPress={()=>setVisible(v=>!v)} className="min-h-[44px] min-w-[44px] items-center justify-center"><Icon name={visible?'eyeOff':'eye'} size={19} color="#64748b" /></Pressable>
    </View>
    {!showAddress && <Pressable accessibilityRole="button" accessibilityState={{expanded}} disabled={busy} onPress={()=>setExpanded(v=>!v)} className="mt-3 self-start py-2"><Text className="text-xs text-muted">연결 설정 {expanded?'⌃':'⌄'}</Text></Pressable>}
    {expanded && <View className="mt-3"><Text className="mb-2 text-sm font-medium text-ink">API 주소</Text><TextInput accessibilityLabel="API 주소" value={value.url} editable={!busy} autoCapitalize="none" autoCorrect={false} onChangeText={url => onChange({ ...value, url })} className={inputClass} /></View>}
  </View>;
}
