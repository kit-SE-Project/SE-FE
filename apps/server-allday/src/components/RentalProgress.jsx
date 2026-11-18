import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Badge, Button, Timeline } from './ui';
const { createRentalTracker, currentWorkSummary } = require('../rental-tracking.cjs');

const errorText = error => error ? `${error.message || '조회하지 못했습니다.'}${error.requestId ? ` (요청 ID: ${error.requestId})` : ''}` : '';

export default function RentalProgress({ rental, api, onDetail }) {
  const detailListener = useRef(onDetail);
  detailListener.current = onDetail;
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setDetail(null); setError('');
  }, [api, rental.id]);
  useEffect(() => {
    setLoading(true);
    if (!api) { setError('로그인이 필요합니다.'); setLoading(false); return; }
    const tracker = createRentalTracker({ api, rentalId: rental.id, includeEvents: false, adaptive: true,
      onDetail: value => { setDetail(value); detailListener.current?.(value); setLoading(false); },
      onError: value => { setError(errorText(value)); if (value) setLoading(false); },
    });
    tracker.refresh();
    return () => tracker.stop();
  }, [api, rental.id, rental.status, rental.desiredRevision, retry]);
  const current = detail && !(Number.isSafeInteger(rental.version) && rental.version > detail.version) ? detail : rental;
  const summary = currentWorkSummary(current);
  return <View testID="rental-progress" className="gap-4">
    <View className="flex-row flex-wrap items-center justify-between gap-3">
      <View className="flex-row items-center gap-2"><Text className="text-sm font-semibold text-ink">대여 상태</Text><Badge status={current.status} /></View>
      {loading && <ActivityIndicator accessibilityLabel="대여 상태 확인 중" size="small" color="#2563eb" />}
    </View>
    {error ? <View accessibilityRole="alert" className="gap-2 border-l-2 border-red-500 pl-3"><Text className="text-sm leading-6 text-red-700">상태 갱신 실패 · {error}</Text><Button variant="secondary" icon="refresh" onPress={() => setRetry(value => value + 1)}>다시 조회</Button></View> : null}
    <Timeline rental={current} />
    <View testID="rental-current-summary" className="flex-row items-start gap-2 border-t border-line pt-3">
      {summary.running && <ActivityIndicator size="small" color="#2563eb" />}
      <Text accessibilityLiveRegion="polite" className={`flex-1 text-sm leading-6 ${summary.error?'text-red-700':summary.blocked?'text-amber-700':'text-muted'}`}>{summary.text}</Text>
    </View>
  </View>;
}
