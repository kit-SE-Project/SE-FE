import React from 'react';
import { View, Text, Pressable, ScrollView, Modal, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect, Circle, Line, Polyline } from 'react-native-svg';
const { LABELS, STEPS, STEP_INDEX } = require('../domain.cjs');

export function Icon({ name = 'server', color = '#2563eb', size = 22 }) {
  const common = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' };
  const shapes = {
    server: <><Rect x="3" y="3" width="18" height="7" rx="2" /><Rect x="3" y="14" width="18" height="7" rx="2" /><Line x1="7" y1="6.5" x2="7.1" y2="6.5" /><Line x1="7" y1="17.5" x2="7.1" y2="17.5" /></>,
    check: <><Circle cx="12" cy="12" r="9" /><Polyline points="8,12 11,15 16,9" /></>,
    tick: <Polyline points="5,12 10,17 19,7" />,
    bolt: <Path d="M13 2 3 14h8l-1 8 11-13h-8z" />,
    cpu: <><Rect x="5" y="5" width="14" height="14" rx="2" /><Rect x="9" y="9" width="6" height="6" />{[8,16].map(n => <React.Fragment key={n}><Line x1={n} y1="2" x2={n} y2="5" /><Line x1={n} y1="19" x2={n} y2="22" /><Line x1="2" y1={n} x2="5" y2={n} /><Line x1="19" y1={n} x2="22" y2={n} /></React.Fragment>)}</>,
    activity: <Polyline points="2,12 6,12 9,3 14,21 17,12 22,12" />,
    chevron: <Polyline points="6,9 12,15 18,9" />,
    up: <Polyline points="6,15 12,9 18,15" />,
    right: <Polyline points="9,6 15,12 9,18" />,
    back: <><Polyline points="12,5 5,12 12,19" /><Line x1="5" y1="12" x2="21" y2="12" /></>,
    close: <><Line x1="6" y1="6" x2="18" y2="18" /><Line x1="18" y1="6" x2="6" y2="18" /></>,
    copy: <><Rect x="8" y="8" width="13" height="13" rx="2" /><Path d="M16 5V3H3v13h2" /></>,
    calendar: <><Rect x="3" y="5" width="18" height="16" rx="2" /><Line x1="3" y1="10" x2="21" y2="10" /><Line x1="8" y1="2" x2="8" y2="7" /><Line x1="16" y1="2" x2="16" y2="7" /></>,
    clock: <><Circle cx="12" cy="12" r="9" /><Polyline points="12,6 12,12 16,14" /></>,
    sun: <><Circle cx="12" cy="12" r="4" />{[0,45,90,135].map(a=><Line key={a} x1="12" y1="1" x2="12" y2="4" transform={`rotate(${a} 12 12)`}/>)}<Path d="M12 20v3M1 12h3M4 20l2-2M18 18l2 2" /></>,
    moon: <Path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z" />,
    key: <><Circle cx="15" cy="8" r="5" /><Path d="m11 12-8 8v2h4v-3h3v-3l3-3" /></>,
    notice: <><Path d="m3 10 17-6v16l-17-6zM6 15l2 6h4l-2-5" /></>,
    file: <><Path d="M5 2h9l5 5v15H5zM14 2v6h5M8 12h8M8 16h6" /></>,
    globe: <><Circle cx="12" cy="12" r="9" /><Path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18" /></>,
    terminal: <><Polyline points="3,5 9,11 3,17" /><Line x1="12" y1="19" x2="21" y2="19" /></>,
    tool: <Path d="M14 3a6 6 0 0 0-7 8L2 17a3 3 0 0 0 5 5l6-7a6 6 0 0 0 8-7l-5 5-4-4 5-5z" />,
    refresh: <><Path d="M20 8a9 9 0 0 0-15-3L2 8M4 16a9 9 0 0 0 15 3l3-3" /><Polyline points="2,2 2,8 8,8" /><Polyline points="22,22 22,16 16,16" /></>,
    user: <><Circle cx="12" cy="7" r="4" /><Path d="M5 22v-5c0-6 14-6 14 0v5" /></>,
    eye: <><Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><Circle cx="12" cy="12" r="3" /></>,
    eyeOff: <><Path d="M3 3l18 18M10 5a12 12 0 0 1 12 7s-1.5 3-4 5M6 6a18 18 0 0 0-4 6s3.5 7 10 7a12 12 0 0 0 4-1" /><Path d="M10 10a3 3 0 0 0 4 4" /></>,
    hash: <Path d="M9 3 7 21M17 3l-2 18M3 9h18M2 15h18" />,
    bell: <><Path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    external: <><Path d="M14 3h7v7M21 3 10 14M10 3H3v18h18v-7" /></>,
    plus: <Path d="M12 5v14M5 12h14" />,
    pencil: <><Path d="m16 3 5 5-12 12-6 1 1-6zM13 6l5 5" /></>,
    trash: <><Path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>,
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" {...common}>{shapes[name] || shapes.server}</Svg>;
}
export function Button({ children, onPress, variant = 'primary', disabled, icon, className = '', testID }) {
  const style = { primary: 'bg-brand border-brand', green: 'bg-success border-success', secondary: 'bg-white border-line', ghost: 'bg-transparent border-transparent', danger: 'bg-red-600 border-red-600' }[variant];
  const light = ['primary', 'green', 'danger'].includes(variant);
  return <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} className={`min-h-[40px] flex-row items-center justify-center gap-2 rounded-lg border px-4 py-2 ${style} ${disabled ? 'opacity-40' : 'active:opacity-70'} ${className}`}>{icon && <Icon name={icon} color={light ? '#fff' : '#485a72'} size={18} />}<Text className={`text-sm font-medium ${light ? 'text-white' : 'text-ink'}`}>{children}</Text></Pressable>;
}
export function Badge({ status }) {
  const green = ['AVAILABLE', 'ACTIVE', 'READY'].includes(status); const amber = ['RESERVED', 'PROVISIONING', 'RETURNING', 'RENTED', 'RETAINED'].includes(status);
  return <View className={`self-start rounded-md border px-2.5 py-1 ${green ? 'border-emerald-200 bg-emerald-50' : amber ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-slate-100'}`}><Text className={`text-xs font-semibold ${green ? 'text-emerald-700' : amber ? 'text-amber-700' : 'text-slate-400'}`}>{LABELS[status] || { AVAILABLE: '대여 가능', MAINTENANCE: '점검 중', RENTED: '대여 중', UNKNOWN: '상태 미확인', QUARANTINED: '격리 중' }[status] || status}</Text></View>;
}
export function Panel({ children, className = '' }) { return <View className={`overflow-hidden rounded-xl border border-line bg-white ${className}`}>{children}</View>; }
export function Heading({ children, className = '' }) { return <Text accessibilityRole="header" className={`text-xl font-bold text-ink ${className}`}>{children}</Text>; }
export function Notice({ children, error = false }) { return <View accessibilityRole="alert" className={`rounded-lg border p-4 ${error ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}><Text className={`text-sm leading-6 ${error ? 'text-red-700' : 'text-amber-700'}`}>{children}</Text></View>; }
export function Dialog({ title, description, onClose, children, wide = false }) {
  const { height } = useWindowDimensions();
  return <Modal transparent animationType="fade" visible onRequestClose={onClose}><View className="flex-1 items-center justify-center bg-black/65 p-4"><View accessibilityViewIsModal className="w-full overflow-hidden rounded-xl border border-line bg-white" style={{ maxWidth: wide ? 960 : 680, maxHeight: height - 40 }}><View className="flex-row items-start justify-between gap-4 px-6 pt-6 pb-4"><View className="flex-1"><Heading>{title}</Heading>{description && <Text className="mt-2 text-sm leading-6 text-muted">{description}</Text>}</View><Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} className="rounded-lg p-2"><Icon name="close" color="#64748b" size={20} /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingTop: 4 }}>{children}</ScrollView></View></View></Modal>;
}
export function Timeline({ rental }) {
  const current = STEP_INDEX[rental.status] ?? 0;
  if (rental.status === 'CANCELLED') return <Text className="text-sm text-muted">자원 생성 전 예약이 취소되었습니다.</Text>;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false}><View className="flex-row py-3">{STEPS.map((label, i) => {
    const completed = i < current || rental.status === 'RETURNED';
    return <View key={label} className="flex-row items-start"><View className="w-[104px] items-center gap-2"><View className={`h-8 w-8 items-center justify-center rounded-full border-2 ${completed ? 'border-brand bg-brand' : i === current ? 'border-brand bg-white' : 'border-line bg-white'}`}>{completed ? <Icon name="tick" color="#fff" size={17} /> : <Text className={i === current ? 'text-brand' : 'text-slate-300'}>{i + 1}</Text>}</View><Text className={`text-xs ${i === current ? 'text-brand' : i < current ? 'text-muted' : 'text-slate-400'}`}>{label}</Text></View>{i < 6 && <View className={`mt-4 h-0.5 w-5 ${i < current ? 'bg-brand' : 'bg-line'}`} />}</View>;
  })}</View></ScrollView>;
}
export const inputClass = 'min-h-[44px] rounded-lg border border-line bg-white px-3 py-3 text-sm text-ink';
