import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Button, Icon, Notice } from './ui';
const { connectionPolicy, connectionScope, sshHostKeyRemovalCommand, createConnectionWatcher } = require('../rental-access.cjs');

export default function RentalConnection(props) {
  const [expanded, setExpanded] = useState(false);

  return <View className="gap-3">
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      aria-expanded={expanded}
      onPress={() => setExpanded(value => !value)}
      className="flex-row items-center justify-between gap-3 pb-2 active:opacity-70"
    >
      <Text className="text-xs font-semibold text-muted">접속 정보 보기</Text>
      <Icon name={expanded ? 'up' : 'chevron'} size={18} color="#94a3b8" />
    </Pressable>
    {expanded && <ConnectionDetails {...props} />}
  </View>;
}

function ConnectionDetails({ rental, server, api, onToast }) {
  const policy = connectionPolicy(rental, server);
  const scope = connectionScope(rental, server);
  const watcher = useRef(null);
  const [showSshHelp, setShowSshHelp] = useState(false);
  const [state, setState] = useState({ scope: null, connection: null, password: null, loadingPassword: false, error: '' });
  useEffect(() => {
    setState({ scope, connection: null, password: null, loadingPassword: false, error: '' });
    if (!policy.allowed || !api) return;
    const update = patch => setState(current => current.scope === scope ? { ...current, ...patch } : current);
    const current = createConnectionWatcher({ api, rentalId: rental.id,
      onConnection: connection => update({ connection }), onPassword: password => update({ password }),
      onLoadingPassword: loadingPassword => update({ loadingPassword }), onError: error => update({ error: error?.message || '' }),
    });
    watcher.current = current; current.refresh();
    return () => { current.stop(); if (watcher.current === current) watcher.current = null; };
  }, [api, scope, policy.allowed, rental.id]);
  const matches = state.scope === scope;
  const connection = matches ? state.connection : null;
  const password = matches ? state.password : null;
  const removeHostKeyCommand = sshHostKeyRemovalCommand(connection);
  const copy = async value => {
    if (!policy.allowed || !connection?.available) return;
    try { await Clipboard.setStringAsync(String(value)); onToast('클립보드에 복사했습니다.'); }
    catch { onToast('복사하지 못했습니다. 텍스트를 직접 선택해 주세요.'); }
  };
  const placeholder = text => <View testID="connection-unavailable" className="rounded-lg bg-canvas p-5"><Text className="text-center text-sm leading-6 text-muted">{text}</Text></View>;
  if (!policy.allowed) return placeholder(policy.reason);
  if (!api) return <Notice error>로그인이 필요합니다.</Notice>;
  if (matches && state.error) return <Notice error>{state.error}</Notice>;
  if (!connection?.available) return placeholder(connection ? `현재 접속할 수 없습니다.\n${connection.reason}` : '접속 가능 여부를 다시 확인하고 있습니다.');
  return <View className="gap-2">
    <View className="rounded-lg bg-blue-50 p-3"><Text className="text-xs leading-5 text-slate-600">아래 SSH 명령으로 대여 VM에 접속합니다. 접속 호스트의 지정 포트에서 현재 대여 VM으로 자동 연결됩니다.{rental.vm?.vmid && rental.vm?.ip ? `\n대상 VM ${rental.vm.vmid} · 내부 IP ${rental.vm.ip}` : ''}{'\n'}비밀번호를 묻는 메시지가 나오면 아래 VM 비밀번호를 입력하세요. 웹 로그인 비밀번호와는 별개입니다.</Text></View>
    {connection.hostKeyFingerprint && <View className="rounded-lg bg-canvas p-3"><Text className="mb-1 text-xs text-muted">SSH 호스트키 지문</Text><Text selectable className="text-[13px] text-ink" style={{fontFamily:'monospace'}}>{connection.hostKeyFingerprint}</Text><Text className="mt-2 text-xs leading-5 text-muted">처음 접속할 때 터미널의 지문이 위 값과 같은지 확인한 뒤 yes를 입력하세요. 아래 명령은 대여별로 호스트키를 구분합니다. 같은 대여의 다음 이용 시간에도 같은 명령을 사용하세요.</Text></View>}
    {[['globe','접속 호스트',connection.host],['hash','포트',connection.port],['user','아이디',connection.username],['terminal','SSH 명령',connection.sshCommand],...(connection.jupyterTunnelCommand ? [['terminal','Jupyter 터널',connection.jupyterTunnelCommand]] : [])].map(([icon,label,value])=><View key={label} className="flex-row items-center gap-3 rounded-lg bg-canvas p-3"><Icon name={icon} size={18} color="#94a3b8" /><View className="flex-1"><Text className="mb-1 text-xs text-muted">{label}</Text><Text selectable className="text-[13px] text-ink" style={{fontFamily:'monospace'}}>{value}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`${label} 복사`} onPress={()=>copy(value)} className="p-2"><Icon name="copy" size={17} color="#94a3b8" /></Pressable></View>)}
    <View className="flex-row items-center gap-3 rounded-lg bg-canvas p-3"><Icon name="key" size={18} color="#94a3b8" /><View className="flex-1"><Text className="mb-1 text-xs text-muted">VM 비밀번호</Text><Text selectable={password!==null} className="text-sm text-ink" style={{fontFamily:'monospace'}}>{password ?? '••••••••••••'}</Text></View>{password!==null && <Pressable accessibilityRole="button" accessibilityLabel="VM 비밀번호 복사" onPress={()=>copy(password)} className="p-2"><Icon name="copy" size={17} color="#94a3b8" /></Pressable>}<Button variant="ghost" disabled={state.loadingPassword} onPress={()=>password!==null ? watcher.current?.hidePassword() : watcher.current?.revealPassword()}>{state.loadingPassword?'확인 중…':password!==null?'숨기기':'보기'}</Button></View>
    <Text className="text-xs leading-5 text-muted">Windows CMD에서는 VM 비밀번호의 복사 버튼을 누른 뒤 비밀번호 입력 위치에서 Ctrl+V 또는 마우스 오른쪽 버튼으로 붙여넣고 Enter를 누르세요. 입력한 글자나 별표가 보이지 않아도 정상입니다.</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: showSshHelp }} onPress={()=>setShowSshHelp(value=>!value)} className="py-2"><Text className="text-xs text-blue-600">{showSshHelp ? '접속 오류 도움말 닫기' : '접속 오류 도움말'}</Text></Pressable>
    {showSshHelp && <View className="gap-2 rounded-lg bg-canvas p-3">
      <Text className="text-xs leading-5 text-muted">Permission denied: 현재 대여의 VM 비밀번호를 다시 복사해 붙여넣으세요. 앞뒤 공백과 한/영·Caps Lock 상태도 확인하세요.</Text>
      <Text className="text-xs leading-5 text-muted">REMOTE HOST IDENTIFICATION HAS CHANGED: 같은 대여의 VM 키가 바뀌었거나 예전 명령으로 접속했을 수 있습니다. 먼저 위 SSH 명령을 다시 복사하세요. 그래도 경고가 나오면 관리자에게 VM 교체 여부와 지문 확인을 요청하세요. 확인을 마친 경우에만 아래 명령으로 해당 접속 기록을 정리하세요.</Text>
      {removeHostKeyCommand && <View className="flex-row items-center gap-2"><Text selectable className="flex-1 text-[13px] text-ink" style={{fontFamily:'monospace'}}>{removeHostKeyCommand}</Text><Pressable accessibilityRole="button" accessibilityLabel="이전 SSH 호스트키 정리 명령 복사" onPress={()=>copy(removeHostKeyCommand)} className="p-2"><Icon name="copy" size={17} color="#94a3b8" /></Pressable></View>}
    </View>}
    <Text className="mt-2 text-xs leading-5 text-amber-600">접속 정보는 본인 대여에만 노출됩니다. 타인에게 공유하지 마세요.</Text>
  </View>;
}
