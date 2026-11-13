import React from 'react';
import { Image, Platform } from 'react-native';

const logo = Platform.OS === 'web' ? require('../asset/se-logo-web.cjs') : require('../asset/SE_LOGO.png');

export default function BrandLogo({ size = 36 }) {
  if (Platform.OS === 'web') return <img data-testid="se-logo" className="se-brand-logo"
    src={logo.uri} alt="SE 로고" width={size} height={size} loading="eager" decoding="async"
    draggable={false} style={{ display: 'block', width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />;
  return <Image testID="se-logo" source={logo} accessibilityLabel="SE 로고" resizeMode="contain" style={{ width: size, height: size }} />;
}
