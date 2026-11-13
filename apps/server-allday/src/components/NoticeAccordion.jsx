import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Icon, Panel } from './ui';

export default function NoticeAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(null);
  return <Panel className="px-4">
    {items.map((item, index) => {
      const open = openIndex === index;
      const body = <Text className="pb-5 text-sm leading-6 text-muted">{item.body}</Text>;
      return <View key={item.title}>
        <Pressable accessibilityRole="button" accessibilityLabel={item.title}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpenIndex(current => current === index ? null : index)}
          className="flex-row items-center justify-between gap-3 py-5">
          <Text className="flex-1 text-sm text-ink">{item.title}</Text>
          <View className={`notice-chevron ${open ? 'notice-chevron-open' : ''}`}>
            <Icon name={Platform.OS !== 'web' && open ? 'up' : 'chevron'} color="#8794a5" size={17} />
          </View>
        </Pressable>
        {Platform.OS === 'web'
          ? <View testID={`notice-content-${index}`} aria-hidden={!open}
              className={`notice-content ${open ? 'notice-content-open' : ''}`}>
              <View className="notice-content-inner">{body}</View>
            </View>
          : open && body}
      </View>;
    })}
  </Panel>;
}
