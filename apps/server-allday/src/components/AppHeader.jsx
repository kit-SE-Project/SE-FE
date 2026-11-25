import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import BrandLogo from './BrandLogo';
import { Icon } from './ui';
import { nicknameForMember } from '../api';

const menu = ['공지사항', '자유게시판', '학사', '채용', 'SE 건의사항', '서버대여', 'Project & Job'];
const boardPaths = {
  '공지사항': '/notice',
  '자유게시판': '/freeboard',
  '학사': 'https://www.kumoh.ac.kr/ko/sub06_01_01_01.do',
  '채용': 'https://cs.kumoh.ac.kr/cs/sub0602.do',
  'SE 건의사항': '/df883bcb',
  '서버대여': '/server-reservation',
  'Project & Job': '/recruit',
};

export default function AppHeader({ actor, api, onRent, onBoardHome, onSignOut }) {
  const { width } = useWindowDimensions();
  const desktop = width >= 1180;
  const web = Platform.OS === 'web';
  const MenuLink = web ? 'a' : View;
  const [profile, setProfile] = useState(null);
  useEffect(() => {
    let live = true;
    if (api) api.profile().then(value => {
      if (live) setProfile({ api, memberId: actor.memberId, nickname: nicknameForMember(value, actor.memberId) });
    }).catch(() => {});
    return () => { live = false; };
  }, [api, actor.memberId]);
  const nickname = profile?.api === api && profile?.memberId === actor.memberId ? profile.nickname : '';
  const name = nickname || `회원 ID ${actor.memberId}`;
  const navigation = <View className={`flex-row items-stretch ${desktop ? 'w-full justify-between' : ''}`} style={{ gap: desktop ? 16 : 26 }}>
    {menu.map(label => label === '서버대여' && !web
      ? <Pressable key={label} testID="header-rental-tab" accessibilityRole="tab"
          accessibilityState={{ selected: true }} aria-selected accessibilityLabel="서버대여"
          onPress={onRent} className="header-menu-item" style={{ height: desktop ? 64 : 48 }}>
          <Text style={{ color: '#3296ff', fontSize: 18, fontWeight: '700' }}>{label}</Text>
          <View className="header-active-indicator" />
        </Pressable>
      : <MenuLink key={label} href={web ? boardPaths[label] : undefined}
          target={web && ['학사', '채용'].includes(label) ? '_blank' : undefined}
          rel={web && ['학사', '채용'].includes(label) ? 'noopener noreferrer' : undefined}
          className="header-menu-item" style={{ display: 'flex', height: desktop ? 64 : 48, textDecorationLine: 'none' }}>
          <Text style={{ color: '#414b58', fontSize: 18, fontWeight: '600' }}>{label}</Text>
          {['학사', '채용'].includes(label) && <Icon name="external" color="#68727e" size={13} />}
        </MenuLink>)}
  </View>;
  return <View className="border-b border-line bg-white">
    <View className="mx-auto w-full flex-row items-center justify-between px-4" style={{ maxWidth: 1440, minHeight: 64, gap: desktop ? 24 : 16 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={onBoardHome ? 'SE 게시판 홈' : '서버 대여 홈'} onPress={onBoardHome || onRent}>
        <BrandLogo size={48} />
      </Pressable>
      {desktop && <View className="flex-1 pl-6">{navigation}</View>}
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <View accessibilityRole="image" accessibilityLabel="알림 (아직 연동되지 않음)" className="h-8 w-6 items-center justify-center">
          <Icon name="bell" color="#68727e" size={21} />
        </View>
        <View accessibilityLabel={`로그인 사용자 ${name}`} className="flex-row items-center gap-2">
          <View className="h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: '#ffccac' }}>
            {nickname ? <Text style={{ color: '#75402c', fontSize: 12, fontWeight: '600' }}>{Array.from(nickname)[0]}</Text>
              : <Icon name="user" size={15} color="#75402c" />}
          </View>
          <Text numberOfLines={1} style={{ maxWidth: width < 360 ? 48 : width < 400 ? 92 : 128, fontSize: 14, fontWeight: '600', color: '#414b58' }}>{name}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="로그아웃" onPress={onSignOut}
          className="items-center justify-center rounded-full border px-4" style={{ minHeight: 40, borderColor: '#3296ff' }}>
          <Text style={{ color: '#3296ff', fontSize: 14, fontWeight: '600' }}>로그아웃</Text>
        </Pressable>
      </View>
    </View>
    {!desktop && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>{navigation}</ScrollView>}
  </View>;
}
