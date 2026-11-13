import React from 'react';
import { View, Text, Platform, useWindowDimensions } from 'react-native';
import { Icon, Button, Panel, Heading, Badge, Notice, Dialog } from '../components/ui';
import NoticeAccordion from '../components/NoticeAccordion';
import notices from '../content/notices.json';
const { CLOSED } = require('../domain.cjs');

function Stats({ servers, rentals }) {
  return <View className="mb-8 flex-row flex-wrap gap-4">{[
    [servers.length, '전체 서버', 'server', '#2563eb', 'bg-blue-50'],
    [servers.filter(s => s.reservationAllowed).length, '대여 가능', 'check', '#059669', 'bg-emerald-50'],
    [rentals.filter(r => !CLOSED.includes(r.status)).length, '진행 중 대여', 'activity', '#d97706', 'bg-amber-50'],
  ].map(([count,label,icon,color,bg]) => <Panel key={label} className="min-w-[100px] flex-1"><View className="flex-row items-center gap-4 p-5"><View className={`hidden h-11 w-11 items-center justify-center rounded-lg sm:flex ${bg}`}><Icon name={icon} color={color} /></View><View><Text className="text-2xl font-bold text-ink">{count}</Text><Text className="mt-1 text-sm text-muted">{label}</Text></View></View></Panel>)}</View>;
}
export default function RentScreen({ servers, categories, rentals, selectedCategory, setCategory, onRent, rentalEligible }) {
  const { width } = useWindowDimensions();
  const category = categories.find(c => c.id === selectedCategory);
  const list = category ? servers.filter(server => server.categoryId === category.id) : [];
  const wrapText = Platform.OS === 'web' ? { overflowWrap: 'anywhere' } : undefined;
  return <View>
    <View aria-hidden={!!category}>
      <Text accessibilityRole="header" className="text-[30px] font-bold text-ink">서버 대여</Text>
      <Text className="mt-3 mb-8 max-w-[700px] text-[15px] leading-6 text-muted">성능 등급을 선택하면 해당 등급의 서버 목록(스펙)을 확인할 수 있습니다. 원하는 서버의 대여하기 버튼으로 직접 신청하고, 일정과 용도를 입력하면 VM이 자동 생성되어 SSH 접속 정보가 제공됩니다.</Text>
      <Stats servers={servers} rentals={rentals} />
      {!rentalEligible && <View className="mb-5"><Notice>현재 계정은 서버 대여 자격이 없습니다. 관리자에게 문의하세요.</Notice></View>}
      {!categories.length && <Panel className="p-8"><Text className="text-center text-muted">등록된 카테고리가 없습니다.</Text></Panel>}
      <View className={`gap-5 ${width > 700 ? 'flex-row flex-wrap' : ''}`}>
        {categories.map((item, index) => {
          const group = servers.filter(server => server.categoryId === item.id);
          const blue = index % 2 === 0;
          return <View key={item.id} className="min-w-0" style={width > 700 ? { flexBasis: '45%', flexGrow: 1 } : undefined}>
            <Panel className="flex-1 p-6">
              <View className="mb-5 flex-row items-center gap-4">
                <View className={`h-12 w-12 items-center justify-center rounded-lg ${blue ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                  <Icon name={blue ? 'bolt' : 'cpu'} color={blue ? '#2563eb' : '#059669'} size={26} />
                </View>
                <View className="min-w-0 flex-1">
                  <Heading><Text style={wrapText}>{item.name}</Text></Heading>
                  <Text className="mt-1 text-sm text-muted" style={wrapText}>{item.description}</Text>
                </View>
              </View>
              <View className="mb-4 flex-row flex-wrap justify-between gap-2">
                <Text className="text-sm text-muted">총 {group.length}대</Text>
                <Text className="text-sm text-emerald-600">대여 가능 {group.filter(server => server.reservationAllowed).length}대</Text>
              </View>
              <Button variant={blue ? 'primary' : 'green'} onPress={() => setCategory(item.id)}>대여하기</Button>
            </Panel>
          </View>;
        })}
      </View>
      <View className="mt-9 mb-4 flex-row items-center gap-2"><Icon name="notice" color="#485a72" size={21} /><Heading>이용 안내</Heading></View>
      <NoticeAccordion items={notices} />
    </View>
    {category && <Dialog title="서버 목록" description={`${category.name} · 전체 ${list.length}대 · 대여 가능 ${list.filter(server => server.reservationAllowed).length}대`} onClose={() => setCategory(null)}>
      <View className="gap-3">
        {list.map(server => <Panel key={server.id} className="p-4 sm:p-5">
          <View className="mb-4 flex-row items-start justify-between gap-3">
            <Text accessibilityRole="header" className="min-w-0 flex-1 text-base font-semibold text-ink" style={wrapText}>{server.name}</Text>
            <Badge status={server.status} />
          </View>
          <View className="gap-2">
            {[['CPU', server.cpu], ['RAM', server.ram], ['GPU', server.gpu]].map(([label, value]) => <View key={label} className="flex-row items-start gap-2">
              <Text className="w-10 text-xs font-medium leading-5 text-muted">{label}</Text>
              <Text className="min-w-0 flex-1 text-sm leading-5 text-ink" style={wrapText}>{value || '-'}</Text>
            </View>)}
          </View>
          <View className="mt-4 items-end">
            <Button disabled={!server.reservationAllowed || !rentalEligible} onPress={() => onRent(server)}>대여하기</Button>
          </View>
        </Panel>)}
        {!list.length && <Panel className="p-8"><Text className="text-center text-muted">등록된 서버가 없습니다.</Text></Panel>}
      </View>
    </Dialog>}
  </View>;
}
