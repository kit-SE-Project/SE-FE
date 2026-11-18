import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Badge, Button, Dialog, Icon, Notice, Timeline, inputClass } from './ui';
import { requestKey } from '../api';
const { canRentNow, runImmediateRental } = require('../immediate-rental.cjs');
const { normalizeRental, rentalTimeLabel } = require('../domain.cjs');
const { rentalMemberLabel } = require('../admin-view.cjs');

const STAGE_TEXT = {
  checking: '최신 예약 상태를 확인하고 있습니다.',
  preparing: 'VM을 준비하고 있습니다. 준비 후 자동 시작이 끝날 때까지 이 창을 유지하세요.',
  starting: '서버 이용을 시작하고 있습니다. 실제 실행 완료를 기다립니다.',
  active: '즉시 대여가 완료되었습니다. 대여자가 접속 정보를 확인할 수 있습니다.',
};
const errorText = error => `${error.message}${error.requestId ? ` (요청 ID: ${error.requestId})` : ''}`;

export default function AdminImmediateRental({ server, rentals, api, onClose, onDetail, onRefresh }) {
  const [selectedId, setSelectedId] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const controller = useRef(null);
  const attempt = useRef(null);
  const candidates = rentals.filter(rental => rental.serverId === server.id && canRentNow(rental));
  const target = candidates.find(rental => rental.id === selectedId);
  const current = detail ? normalizeRental(detail, [server]) : target;
  const done = stage === 'active';
  const available = server.status === 'AVAILABLE';
  useEffect(() => () => controller.current?.abort(), [api]);
  const close = () => { if (!lock.current) onClose(); };
  const select = rental => {
    setSelectedId(rental.id); setDetail(null); setStage(null); setError(''); attempt.current = null;
  };
  const start = async () => {
    if (lock.current) return;
    if (!target || !available) { setError('예약과 서버 상태를 다시 확인하세요.'); return; }
    if (!reason.trim() || reason.trim().length > 500) { setError('즉시 대여 사유를 1~500자로 입력하세요.'); return; }
    const signature = JSON.stringify({ id: target.id, memberId: target.memberId, serverId: target.serverId, reason: reason.trim() });
    if (attempt.current?.signature !== signature) attempt.current = { signature };
    const run = new AbortController(); controller.current = run;
    lock.current = true; setBusy(true); setError('');
    try {
      await runImmediateRental({ api, rental: target, reason, attempt: attempt.current, requestKey, signal: run.signal,
        onStage: setStage, onDetail: value => { setDetail(value); onDetail?.(value); },
      });
      if (!run.signal.aborted) onRefresh?.();
    } catch (failure) {
      if (!run.signal.aborted) { setError(errorText(failure)); onRefresh?.(); }
    } finally {
      lock.current = false;
      if (!run.signal.aborted) setBusy(false);
    }
  };
  return <Dialog title="관리자 즉시 대여" description={`${server.name}의 예약을 선택하면 VM 준비부터 이용 시작까지 진행합니다.`} onClose={close}>
    {!busy && !done && <>
      <View accessibilityRole="radiogroup" accessibilityLabel="즉시 대여할 예약" className="border-b border-line">
        {candidates.map(rental => <Pressable key={rental.id} accessibilityRole="radio" accessibilityLabel={`${rentalMemberLabel(rental)}, 대여 ${rental.id}, ${rental.from}부터 ${rental.to}, ${rentalTimeLabel(rental)}`} accessibilityState={{ checked: selectedId === rental.id }} onPress={() => select(rental)} className="flex-row items-start gap-3 border-t border-line py-4">
          <View className={`mt-1 h-5 w-5 items-center justify-center rounded-full border ${selectedId === rental.id ? 'border-brand bg-brand' : 'border-slate-300 bg-white'}`}>{selectedId === rental.id && <Icon name="tick" size={13} color="#fff" />}</View>
          <View className="flex-1 gap-2"><View className="flex-row flex-wrap items-center justify-between gap-2"><Text className="text-sm font-semibold text-ink">{rentalMemberLabel(rental)} · 대여 #{rental.id}</Text><Badge status={rental.status} /></View><Text className="text-sm text-muted">{rental.from} ~ {rental.to}</Text><Text className="text-sm text-muted">{rentalTimeLabel(rental)}</Text><Text className="text-sm leading-6 text-muted">{rental.purpose}</Text></View>
        </Pressable>)}
      </View>
      {!candidates.length && <Text className="py-6 text-sm leading-6 text-muted">즉시 대여할 예약이 없습니다. 서버 대여에서 예약을 먼저 등록하세요.</Text>}
      <View className="mt-4"><Notice>{available ? '선택한 예약의 첫 이용 시작을 현재 시각으로 앞당깁니다. 기존 종료 시각은 유지되며, 다른 예약과 겹치면 실행할 수 없습니다. VM 생성과 부팅에는 시간이 걸립니다.' : '현재 서버에서 즉시 대여를 실행할 수 없습니다. 서버 상태를 먼저 확인하세요.'}</Notice></View>
      <Text className="mt-4 mb-2 text-sm font-medium text-ink">즉시 대여 사유 (필수)</Text>
      <TextInput accessibilityLabel="즉시 대여 사유" value={reason} onChangeText={setReason} maxLength={500} multiline className={inputClass} />
    </>}
    {current && stage && <View className="mt-4 gap-4 rounded-lg border border-line bg-canvas p-4">
      <View className="flex-row flex-wrap items-center justify-between gap-2"><Text className="text-sm font-semibold text-ink">{rentalMemberLabel(current)} · 대여 #{current.id}</Text><Badge status={current.status} /></View>
      <Text className="text-sm text-muted">{current.from} ~ {current.to}</Text>
      <Text className="text-sm text-muted">{rentalTimeLabel(current)}</Text>
      <Timeline rental={current} />
      <View accessibilityLiveRegion="polite" className="flex-row items-start gap-2">{busy && <ActivityIndicator accessibilityLabel="즉시 대여 진행 중" size="small" color="#2563eb" />}<Text className="flex-1 text-sm leading-6 text-ink">{error ? '진행을 멈췄습니다. 아래 내용을 확인하세요.' : STAGE_TEXT[stage]}</Text></View>
    </View>}
    {error ? <View className="mt-4"><Notice error>{error}</Notice></View> : null}
    <View className="mt-6 flex-row flex-wrap justify-end gap-2"><Button variant="secondary" disabled={busy} onPress={close}>{done ? '완료' : '닫기'}</Button>{!done && <Button icon="bolt" disabled={busy || !target || !available || !reason.trim()} onPress={start}>{busy ? '즉시 대여 진행 중…' : error ? '상태 확인 후 다시 시도' : '즉시 대여 실행'}</Button>}</View>
  </Dialog>;
}
