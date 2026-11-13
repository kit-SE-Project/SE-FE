import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { Button, Dialog, Icon, Notice, Panel, inputClass } from './ui';
import { requestKey } from '../api';
const { seoulDay, monthCells, makeSlots, reservationClock, reservationNow, validateReservation, calendarDayState } = require('../domain.cjs');

function DateTimeInput({ label, type, value, onChange, min, max, disabled }) {
  return <View className="min-w-0 flex-1">
    <Text className="mb-2 text-sm text-muted">{label}</Text>
    {Platform.OS === 'web' ? <input aria-label={label} type={type} value={value} onChange={event => onChange(event.target.value)} min={min} max={max} step={type === 'time' ? 60 : undefined} disabled={disabled} style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', minHeight: 44, border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', backgroundColor: '#fff', color: '#0f172a', fontSize: 14 }} />
      : <TextInput accessibilityLabel={label} placeholder={type === 'date' ? 'YYYY-MM-DD' : 'HH:mm'} value={value} onChangeText={onChange} maxLength={type === 'date' ? 10 : 5} autoCapitalize="none" editable={!disabled} className={inputClass} />}
  </View>;
}

export default function ReservationDialog({ server, api, onClose, onSubmit }) {
  const { width } = useWindowDimensions();
  const serverBlocked = server.status !== 'AVAILABLE' || !server.reservationAllowed;
  const [clock,setClock] = useState(()=>reservationClock());
  const today = seoulDay(reservationNow(clock)); const horizon = seoulDay(new Date(clock.horizonAt));
  const [month, setMonth] = useState(new Date(`${today.slice(0, 7)}-01T12:00:00`));
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [band, setBand] = useState('MORNING'); const [purpose, setPurpose] = useState('');
  const [startTime, setStartTime] = useState(''); const [endTime, setEndTime] = useState('');
  const [blocked, setBlocked] = useState([]); const [loading, setLoading] = useState(true);
  const [minimumSwitchSeconds, setMinimumSwitchSeconds] = useState(0);
  const [availabilityError, setAvailabilityError] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submission = useRef(null); const submitting = useRef(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!api) { setAvailabilityError('로그인이 필요합니다.');setLoading(false);return; }
    let active = true; setLoading(true); setAvailabilityError('');
    api.availability(server.id, `${today}T00:00:00+09:00`, `${horizon}T23:59:59+09:00`).then(data => { if (active) {
      if (!Number.isSafeInteger(data.minimumSwitchSeconds) || data.minimumSwitchSeconds < 0) throw new Error('서버 전환 준비 시간 정보를 확인하지 못했습니다. 다시 조회하세요.');
      const nextClock=reservationClock(data);
      setClock(nextClock);setMinimumSwitchSeconds(data.minimumSwitchSeconds);setBlocked(data.blockedSlots || []);
      if (!data.reservationAllowed) setAvailabilityError('현재 이 서버는 예약할 수 없습니다.');
    } }).catch(e => { if (active) setAvailabilityError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [api, server.id, reload, today, horizon]);
  useEffect(()=>setMonth(current=>{
    const value=`${current.getFullYear()}-${String(current.getMonth()+1).padStart(2,'0')}`;
    return value<today.slice(0,7)||value>horizon.slice(0,7)?new Date(`${today.slice(0,7)}-01T12:00:00`):current;
  }),[today,horizon]);
  const select = day => { setError(''); if (!from || to || day < from) { setFrom(day); setTo(''); } else setTo(day); };
  const fillTestTimes = () => {
    const start = new Date(Math.ceil(reservationNow(clock).getTime() / 60000) * 60000 + 5 * 60000);
    const end = new Date(start.getTime() + 30 * 60000);
    const time = date => new Date(date.getTime() + 9 * 3600000).toISOString().slice(11, 16);
    setFrom(seoulDay(start)); setTo(seoulDay(end));
    setStartTime(time(start)); setEndTime(time(end)); setError('');
  };
  const updateTestTime = setter => value => { setter(value); setError(''); };
  const selectionError = from && to ? validateReservation({ from, to, band, startTime, endTime, purpose: '예약 시간 확인', blockedSlots: blocked, minimumSwitchSeconds, now:reservationNow(clock),reservationHorizonAt:clock.horizonAt }) : '';
  const submit = async () => {
    if (submitting.current) return;
    if (serverBlocked) { setError('점검 중이거나 현재 예약할 수 없는 서버입니다.'); return; }
    const message = validateReservation({ from, to, band, startTime, endTime, purpose, blockedSlots: blocked, minimumSwitchSeconds, now:reservationNow(clock),reservationHorizonAt:clock.horizonAt });
    if (message) { setError(message); return; }
    submitting.current = true; setBusy(true); setError('');
    const body = { serverId: server.id, purpose: purpose.trim(), slots: makeSlots(from, to, band, { startTime, endTime }) };
    // Reuse the key for an unchanged payload after a lost response.
    const serialized = JSON.stringify(body);
    if (submission.current?.serialized !== serialized) submission.current = { serialized, key: requestKey() };
    try { await onSubmit({ body, key: submission.current.key, from, to, band, server }); }
    catch (e) { setError(`${e.message}${e.requestId ? ` (요청 ID: ${e.requestId})` : ''}`); if (['SLOT_CONFLICT','INSUFFICIENT_SWITCH_TIME','SERVER_UNAVAILABLE','PREVIEW_SLOT_MISMATCH'].includes(e.code)) setReload(n => n + 1); }
    finally { submitting.current = false; setBusy(false); }
  };
  const previousDisabled = month.getFullYear() === Number(today.slice(0,4)) && month.getMonth() === Number(today.slice(5,7))-1;
  const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const nextDisabled = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}` > horizon.slice(0,7);
  const calendarNow = reservationNow(clock);
  return <Dialog title={`${server.name} 대여 신청`} description="대여 기간과 시간대, 용도를 입력한 뒤 확인을 누르면 대여가 진행됩니다." onClose={busy ? () => {} : onClose}>
    <Text className="mb-6 text-xs text-muted">{server.cpu} · {server.ram} · {server.gpu}</Text>
    {serverBlocked&&<View className="mb-4"><Notice>점검 중이거나 현재 예약할 수 없는 서버입니다.</Notice></View>}
    <Text className="mb-3 text-sm font-medium text-ink">대여 기간 (2개월 캘린더)</Text>
    <Panel className="p-3">
      <View className="mb-2 flex-row justify-between"><Button variant="ghost" disabled={previousDisabled} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1,1))}>← 이전 달</Button><Button variant="ghost" disabled={nextDisabled} onPress={() => setMonth(nextMonth)}>다음 달 →</Button></View>
      <View className={`gap-5 ${width >= 650 ? 'flex-row' : ''}`}>
        {[0, 1].map(offset => {
          const date = new Date(month.getFullYear(), month.getMonth() + offset, 1);
          const cells = monthCells(date.getFullYear(), date.getMonth()).map(cell => {
            const { morning, afternoon, longTerm, disabled: unavailable } = calendarDayState(cell.date, band, blocked, calendarNow, minimumSwitchSeconds, clock.horizonAt);
            const disabled = !cell.current || unavailable || loading || !!availabilityError;
            const isStart = cell.current && cell.date === from;
            const isEnd = cell.current && cell.date === to;
            const inRange = cell.current && !!from && !!to && from < to && cell.date >= from && cell.date <= to;
            const bookedLongTerm = cell.current && longTerm;
            const showBookedBand = cell.current && morning && afternoon && !bookedLongTerm && !inRange && !isStart && !isEnd;
            return { ...cell, morning, afternoon, longTerm, disabled, isStart, isEnd, inRange, bookedLongTerm, showBookedBand };
          });
          const rangeColor = band === 'LONG_TERM' ? 'bg-purple-200' : 'bg-blue-200';
          const endpointColor = band === 'LONG_TERM' ? 'bg-purple-600' : 'bg-brand';
          return <View key={offset} className="flex-1"><Text className="mb-4 text-center text-sm font-medium text-ink">{date.getFullYear()}년 {date.getMonth()+1}월</Text>
            <View className="mb-2 flex-row">{['일','월','화','수','목','금','토'].map(day => <Text key={day} className="text-center text-xs text-muted" style={{ width: `${100/7}%` }}>{day}</Text>)}</View>
            <View className="flex-row flex-wrap">{cells.map((cell, index) => {
              const { morning, afternoon, longTerm, disabled, isStart, isEnd, inRange, bookedLongTerm, showBookedBand } = cell;
              const endpoint = isStart || isEnd;
              const startsRow = index % 7 === 0 || !cells[index - 1]?.current;
              const endsRow = index % 7 === 6 || !cells[index + 1]?.current;
              const roundLeft = inRange ? startsRow && !isStart : startsRow || !cells[index - 1]?.showBookedBand;
              const roundRight = inRange ? endsRow && !isEnd : endsRow || !cells[index + 1]?.showBookedBand;
              return <Pressable key={cell.date} accessibilityRole="button" accessibilityLabel={`${cell.date}${bookedLongTerm ? ' 장기 대여 예약' : ''}${disabled ? ' 선택 불가' : ''}`} accessibilityState={{ disabled: !!disabled, selected: inRange || endpoint }} disabled={disabled} onPress={() => select(cell.date)} style={{ width: `${100/7}%` }} className="h-12 items-center justify-center">
                <View className="relative h-8 w-full items-center justify-center">
                  {(inRange || showBookedBand) && <View
                    pointerEvents="none"
                    className={`absolute bottom-0 top-0 ${inRange ? rangeColor : 'bg-slate-100'} ${roundLeft ? 'rounded-l-full' : ''} ${roundRight ? 'rounded-r-full' : ''}`}
                    style={{ left: isStart ? '50%' : 0, right: isEnd ? '50%' : 0 }}
                  />}
                  <View className={`h-8 w-8 items-center justify-center rounded-full ${bookedLongTerm ? 'bg-purple-600' : endpoint ? endpointColor : ''}`}>
                    <Text className={`text-sm ${bookedLongTerm || endpoint ? 'text-white' : disabled ? 'text-slate-300' : 'text-ink'}`}>{cell.day}</Text>
                  </View>
                </View>
                <View className="h-1 flex-row gap-1">{cell.current && !longTerm && morning && <View className="h-1 w-1 rounded-full bg-blue-500" />}{cell.current && !longTerm && afternoon && <View className="h-1 w-1 rounded-full bg-red-500" />}</View>
              </Pressable>;
            })}</View></View>;
        })}
      </View>
    </Panel>
    {loading && <View className="mt-3 flex-row gap-2"><ActivityIndicator size="small" color="#2563eb" /><Text className="text-xs text-muted">예약 가능 시간을 확인하고 있습니다.</Text></View>}
    {availabilityError ? <View className="mt-3 gap-2"><Notice error>{availabilityError}</Notice><Button variant="secondary" onPress={() => setReload(n=>n+1)}>가용 시간 다시 확인</Button></View> : null}
    <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-2">{[['오전 예약','bg-blue-500'],['오후 예약','bg-red-500'],['장기 대여 예약','bg-purple-600']].map(([label,color]) => <View key={label} className="flex-row items-center gap-1.5"><View className={`h-2 w-2 rounded-full ${color}`} /><Text className="text-xs text-muted">{label}</Text></View>)}<Text className="text-xs text-muted">회색 날짜 = 선택 불가</Text></View>
    <View accessibilityLiveRegion="polite" testID="reservation-date-summary" className="mt-4 border-y border-blue-100 bg-blue-50 px-4 py-3">
      <Text className="mb-2 text-sm font-semibold text-ink">선택한 대여 기간</Text>
      <View className="flex-row flex-wrap gap-x-6 gap-y-3">
        <View className="min-w-[120px] flex-1">
          <Text className="mb-1 text-sm text-muted">시작일</Text>
          <Text testID="reservation-start-date" className={`text-lg font-semibold leading-7 ${from ? 'text-brand' : 'text-muted'}`}>{from || '시작일 선택'}</Text>
        </View>
        <View className="min-w-[120px] flex-1">
          <Text className="mb-1 text-sm text-muted">종료일</Text>
          <Text testID="reservation-end-date" className={`text-lg font-semibold leading-7 ${to ? 'text-brand' : 'text-muted'}`}>{to || '종료일 선택'}</Text>
        </View>
      </View>
    </View>
    {!from && <Text className="mt-2 text-xs leading-5 text-muted">시작일과 종료일을 차례로 선택하세요. 같은 날을 두 번 누르면 하루 대여됩니다.</Text>}
    {minimumSwitchSeconds > 0 && <Text className="mt-2 text-xs leading-5 text-muted">다른 예약과 서버 전환 준비 시간 {Math.ceil(minimumSwitchSeconds / 60)}분 이상의 간격이 필요합니다.</Text>}
    <Text className="mt-6 mb-3 text-sm font-medium text-ink">대여 방식</Text>
    <View className="flex-row gap-2">{[['MORNING','오전','08:00 - 15:00','sun'],['AFTERNOON','오후','16:00 - 23:00','moon'],['LONG_TERM','장기 대여','24시간 연속 사용','calendar']].map(([value,label,time,icon]) => {
      const active = band === value; const purple = value === 'LONG_TERM';
      return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: active }} onPress={() => { setBand(value); setError(''); }} className={`flex-1 items-center gap-2 rounded-lg border px-1 py-4 ${active ? purple ? 'border-purple-600 bg-purple-50' : 'border-brand bg-blue-50' : 'border-line bg-white'}`}><Icon name={icon} color={active ? purple ? '#9333ea' : '#2563eb' : '#64748b'} /><Text className={active ? purple ? 'text-purple-700' : 'text-brand' : 'text-muted'}>{label}</Text><Text className="text-center text-[11px] text-muted">{time}</Text></Pressable>;
    })}</View>
    <View testID="test-reservation-times" className={`mt-4 rounded-lg border p-4 ${band === 'CUSTOM' ? 'border-brand bg-blue-50' : 'border-line bg-slate-50'}`}>
      <Pressable accessibilityRole="radio" accessibilityLabel="테스트용 시간 직접 지정" accessibilityState={{ checked: band === 'CUSTOM', disabled: busy }} disabled={busy} onPress={() => { setBand('CUSTOM'); setError(''); if (!startTime || !endTime || !from || !to) fillTestTimes(); }} className="flex-row items-center gap-2">
        <Icon name="clock" size={18} color={band === 'CUSTOM' ? '#2563eb' : '#64748b'} />
        <Text className={`flex-1 text-sm font-semibold ${band === 'CUSTOM' ? 'text-brand' : 'text-ink'}`}>테스트용 시간 직접 지정</Text>
        <Text className="text-xs text-muted">{band === 'CUSTOM' ? '선택됨' : '선택'}</Text>
      </Pressable>
      <Text className="mt-2 text-xs leading-5 text-muted">대여·반납 날짜와 시간을 분 단위로 지정합니다. 한국 시간(KST) 기준입니다.</Text>
      {band === 'CUSTOM' && <View className="mt-4 gap-4">
        <View className="flex-row gap-3">
          <DateTimeInput label="대여 날짜" type="date" value={from} onChange={updateTestTime(setFrom)} min={today} max={horizon} disabled={busy} />
          <DateTimeInput label="대여 시간" type="time" value={startTime} onChange={updateTestTime(setStartTime)} disabled={busy} />
        </View>
        <View className="flex-row gap-3">
          <DateTimeInput label="반납 날짜" type="date" value={to} onChange={updateTestTime(setTo)} min={from || today} max={horizon} disabled={busy} />
          <DateTimeInput label="반납 시간" type="time" value={endTime} onChange={updateTestTime(setEndTime)} disabled={busy} />
        </View>
        <Button variant="secondary" disabled={busy} onPress={fillTestTimes}>현재 기준 5분 뒤 · 30분 대여로 채우기</Button>
        <Text className="text-xs leading-5 text-muted">반납 시각은 대여 시각보다 늦어야 합니다. 기존 예약과 준비 시간 간격을 확인한 뒤 실제 예약으로 신청됩니다.</Text>
      </View>}
    </View>
    {band === 'LONG_TERM' && <View accessibilityRole="alert" className="mt-3 flex-row gap-2 rounded-lg border border-purple-200 bg-purple-50 p-3"><Icon name="clock" size={18} color="#9333ea" /><View className="flex-1"><Text className="text-sm font-medium leading-5 text-purple-800">장기 대여 기간 동안에는 24시간 사용 가능합니다</Text><Text className="mt-1 text-xs leading-5 text-purple-700">시작일 00:00부터 종료일 24:00까지 연속 사용합니다. 이미 시작된 날짜와 기존 예약이 겹치는 기간은 선택할 수 없습니다.</Text></View></View>}
    {selectionError ? <View className="mt-3"><Notice error>{selectionError}</Notice></View> : null}
    <Text className="mt-6 mb-3 text-sm font-medium text-ink">사용 용도</Text>
    <TextInput accessibilityLabel="사용 용도" placeholder="연구/프로젝트 목적을 입력하세요" placeholderTextColor="#94a3b8" multiline maxLength={2000} value={purpose} onChangeText={setPurpose} className={inputClass} style={{ minHeight: 84, textAlignVertical: 'top' }} />
    {error && error !== selectionError ? <View className="mt-4 gap-2"><Notice error>{error}</Notice><Button variant="secondary" disabled={busy || loading} onPress={() => { setError(''); setReload(n => n + 1); }}>예약 가능 시간 다시 확인</Button></View> : null}
    <View className="mt-6 flex-row justify-end gap-2"><Button variant="secondary" disabled={busy} onPress={onClose}>취소</Button><Button testID="confirm-reservation" disabled={serverBlocked || busy || loading || !!availabilityError || !!selectionError || !from || !to || !purpose.trim()} onPress={submit}>{busy ? '신청 중…' : '확인'}</Button></View>
  </Dialog>;
}
