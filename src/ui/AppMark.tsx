import React from 'react';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { ICON_COLORS as C } from '../theme';

/**
 * The app icon in small, where the app shows itself (the trial's day-before
 * notification on onboarding): the injector pen on the blue tile, drawn
 * from the same shapes as store/icon-pen.svg, without the shadow.
 */
export default function AppMark({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <LinearGradient id="am-body" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={C.body} />
          <Stop offset="1" stopColor={C.bodyShade} />
        </LinearGradient>
      </Defs>
      <Rect width={1024} height={1024} rx={229} fill={C.tile} />
      <G transform="translate(512 512) rotate(45) scale(1.06) translate(-512 -512)">
        <Rect x={488} y={140} width={48} height={96} fill={C.cap} />
        <Rect x={450} y={56} width={124} height={98} rx={30} fill={C.cap} />
        <Rect x={466} y={862} width={92} height={88} rx={28} fill={C.cap} />
        <Rect x={420} y={204} width={184} height={676} rx={54} fill="url(#am-body)" />
        <Path d="M420 600h184v226a54 54 0 0 1-54 54h-76a54 54 0 0 1-54-54z" fill={C.cap} />
        <Rect x={470} y={292} width={84} height={196} rx={30} fill={C.window} />
        <Rect x={484} y={398} width={56} height={76} rx={18} fill={C.level} />
      </G>
    </Svg>
  );
}
