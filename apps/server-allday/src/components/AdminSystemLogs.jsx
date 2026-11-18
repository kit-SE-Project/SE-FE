import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Heading, Panel, Button, Notice } from './ui';
const { normalizeSystemLogs, systemLogTime, systemLogStatus } = require('../system-logs.cjs');

export function SystemLogRows({ rows, mobile }) {
  const stateChange = row => `${systemLogStatus(row.beforeStatus)} → ${systemLogStatus(row.afterStatus)}`;
  return <>{rows.map(row => mobile ? <View key={row.id} className="gap-2 border-t border-line p-4">
    <View className="flex-row flex-wrap justify-between gap-2"><Text className="text-sm font-semibold text-ink">대여 #{row.rentalId}</Text><Text className="text-xs text-muted">{systemLogTime(row.createdAt)}</Text></View>
    <Text className="text-sm text-muted">{stateChange(row)}</Text>
    <Text selectable className="text-sm font-semibold text-ink">{row.reasonCode || '사유 코드 없음'}</Text>
    {row.reasonText ? <Text selectable className="text-sm leading-6 text-muted">{row.reasonText}</Text> : null}
    <Text className="text-xs text-muted">{row.source || '-'} · {row.step || '단계 정보 없음'}</Text>
    {row.requestId ? <Text selectable className="text-xs text-muted">요청 ID · {row.requestId}</Text> : null}
  </View> : <View key={row.id} className="flex-row items-start gap-3 border-t border-line p-4">
    <View style={{ width: 164 }}><Text className="text-xs leading-5 text-muted">{systemLogTime(row.createdAt)}</Text><Text className="mt-1 text-xs text-muted">{row.source || '-'}</Text></View>
    <Text style={{ width: 82 }} className="text-sm text-ink">#{row.rentalId}</Text>
    <Text style={{ width: 168 }} className="text-sm leading-6 text-muted">{stateChange(row)}</Text>
    <View className="flex-1 gap-1"><Text selectable className="text-sm font-semibold text-ink">{row.reasonCode || '사유 코드 없음'}</Text>{row.reasonText ? <Text selectable className="text-sm leading-6 text-muted">{row.reasonText}</Text> : null}<Text className="text-xs text-muted">단계 · {row.step || '-'}</Text>{row.requestId ? <Text selectable className="text-xs text-muted">요청 ID · {row.requestId}</Text> : null}</View>
  </View>)}</>;
}

export default function AdminSystemLogs({ api }) {
  const { width } = useWindowDimensions();
  const mobile = width < 750;
  const [open, setOpen] = useState(false);
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState({ api: null, rows: [], loading: false, error: '' });
  useEffect(() => {
    if (!open || !api) return;
    let active = true;
    setResult({ api, rows: [], loading: true, error: '' });
    Promise.resolve().then(() => api.systemEvents(100)).then(value => {
      const rows = normalizeSystemLogs(value);
      if (active) setResult({ api, rows, loading: false, error: '' });
    }).catch(error => {
      if (active) setResult({ api, rows: [], loading: false, error: `${error.message}${error.requestId ? ` (요청 ID: ${error.requestId})` : ''}` });
    });
    return () => { active = false; };
  }, [api, open, reload]);
  const current = result.api === api ? result : { rows: [], loading: false, error: '' };
  return <View className="mt-8">
    <View className="mb-4 flex-row flex-wrap items-center justify-between gap-3"><Heading>시스템 로그</Heading><Button variant="secondary" onPress={() => setOpen(value => !value)}>{open ? '로그 닫기' : '시스템 로그 보기'}</Button></View>
    {open && <Panel>
      <View className="flex-row flex-wrap items-center justify-between gap-3"><View className="flex-1 p-4"><Text className="text-sm leading-6 text-muted">서버에 저장된 최근 100건의 대여 상태 변경과 처리 사유입니다. 발생 시각은 한국 시간입니다.</Text></View><Button className="mr-4" variant="secondary" icon="refresh" disabled={current.loading} onPress={() => setReload(value => value + 1)}>새로고침</Button></View>
      {current.loading ? <View className="flex-row items-center justify-center gap-2 p-6"><ActivityIndicator color="#2563eb" /><Text className="text-sm text-muted">시스템 로그를 불러오고 있습니다.</Text></View> : current.error ? <View className="p-4"><Notice error>{current.error}</Notice></View> : !current.rows.length ? <Text className="border-t border-line p-6 text-center text-sm text-muted">저장된 시스템 로그가 없습니다.</Text> : mobile ? <SystemLogRows rows={current.rows} mobile /> : <ScrollView horizontal><View style={{ minWidth: 1080 }}><View className="flex-row gap-3 border-t border-line bg-canvas p-4"><Text style={{ width: 164 }} className="text-xs text-muted">발생 시각 / 출처</Text><Text style={{ width: 82 }} className="text-xs text-muted">대여 번호</Text><Text style={{ width: 168 }} className="text-xs text-muted">상태 변경</Text><Text className="flex-1 text-xs text-muted">상태 사유 / 처리 정보</Text></View><SystemLogRows rows={current.rows} /></View></ScrollView>}
    </Panel>}
  </View>;
}
