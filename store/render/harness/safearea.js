// iPhone 15/16 safe areas (393 x 852 points): 59 at the top, 34 at the bottom.
import React from 'react';
import { View } from 'react-native';
const insets = { top: 59, bottom: 34, left: 0, right: 0 };
export function SafeAreaProvider({ children }) {
  return children;
}
export function useSafeAreaInsets() {
  return insets;
}
export function SafeAreaView(props) {
  return React.createElement(View, { ...props, style: [{ paddingTop: insets.top, paddingBottom: insets.bottom }, props.style] });
}
export const initialWindowMetrics = { insets, frame: { x: 0, y: 0, width: 393, height: 852 } };
