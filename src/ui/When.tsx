import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Theme, space, type } from '../theme';

/**
 * A date (and a time) as the phone's own compact pickers, in the app's
 * colours. Used for when a shot was taken, a weight, a feeling, a start
 * date and a dose change. To the minute.
 */
export default function When({
  theme,
  label,
  value,
  onChange,
  max,
  min,
  dateOnly = false,
  timeOnly = false,
}: {
  theme: Theme;
  label: string;
  value: number;
  onChange: (ms: number) => void;
  max?: number;
  min?: number;
  dateOnly?: boolean;
  timeOnly?: boolean;
}) {
  const variant = theme.isDark ? 'dark' : 'light';
  const pick = (_: DateTimePickerEvent, d?: Date) => {
    if (d) onChange(d.getTime());
  };
  return (
    <View style={styles.row} accessibilityLabel={label}>
      <Text style={[type.body, styles.label, { color: theme.inkSoft }]} maxFontSizeMultiplier={1.6}>
        {label}
      </Text>
      <View style={styles.pickers}>
        {!timeOnly && (
          <DateTimePicker
            value={new Date(value)}
            mode="date"
            display="compact"
            onChange={pick}
            maximumDate={max != null ? new Date(max) : undefined}
            minimumDate={min != null ? new Date(min) : undefined}
            themeVariant={variant}
            accentColor={theme.live}
            accessibilityLabel={`${label}, date`}
          />
        )}
        {!dateOnly && (
          <DateTimePicker
            value={new Date(value)}
            mode="time"
            display="compact"
            onChange={pick}
            minuteInterval={1}
            themeVariant={variant}
            accentColor={theme.live}
            accessibilityLabel={`${label}, time`}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.m, minHeight: 52, flexWrap: 'wrap' },
  label: { flexShrink: 1 },
  pickers: { flexDirection: 'row', alignItems: 'center', gap: space.s },
});
