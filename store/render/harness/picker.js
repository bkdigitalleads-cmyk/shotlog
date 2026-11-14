// A drawn stand-in for the iOS compact date and time pickers (a grey pill with the value).
import React from 'react';
import { Text, View, useColorScheme } from 'react-native';
const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export default function DateTimePicker({ value, mode }) {
  const dark = useColorScheme() === 'dark';
  const d = new Date(value);
  const h = d.getHours();
  const text = mode === 'time' ? `${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` : `${M[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  return React.createElement(
    View,
    { style: { backgroundColor: dark ? 'rgba(118,118,128,0.24)' : 'rgba(118,118,128,0.12)', borderRadius: 7, paddingHorizontal: 11, paddingVertical: 6 } },
    React.createElement(Text, { style: { fontSize: 17, color: dark ? '#E9E5DC' : '#1D232B' } }, text)
  );
}
