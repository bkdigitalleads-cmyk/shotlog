import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, space, type } from '../theme';
import Glyph, { GlyphName } from './Glyph';
import { Tap } from './Kit';

export type Tab = 'today' | 'history' | 'insights' | 'report' | 'settings';

const TABS: { id: Tab; label: string; glyph: GlyphName }[] = [
  { id: 'today', label: 'Today', glyph: 'ring' },
  { id: 'history', label: 'History', glyph: 'page' },
  { id: 'insights', label: 'Insights', glyph: 'chart' },
  { id: 'report', label: 'Report', glyph: 'report' },
  { id: 'settings', label: 'Settings', glyph: 'sliders' },
];

/** The tab rail: a ruled line on top, ink for the open tab, a short rule under its label. */
export default function TabRail({ theme, tab, onTab }: { theme: Theme; tab: Tab; onTab: (t: Tab) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.rail, { backgroundColor: theme.bg, borderTopColor: theme.rule, paddingBottom: Math.max(insets.bottom, space.s) }]} accessibilityRole="tablist">
      {TABS.map((t) => {
        const on = tab === t.id;
        return (
          <Tap
            key={t.id}
            onPress={() => onTab(t.id)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={t.label}
          >
            <Glyph name={t.glyph} size={24} color={on ? theme.ink : theme.inkFaint} weight={on ? 1.9 : 1.5} />
            <Text style={[type.small, styles.label, { color: on ? theme.ink : theme.inkFaint }]} maxFontSizeMultiplier={1.3} numberOfLines={1} minimumFontScale={0.75} adjustsFontSizeToFit>
              {t.label}
            </Text>
            <View style={[styles.mark, { backgroundColor: on ? theme.ink : 'transparent' }]} />
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.s },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 50, gap: 2 },
  label: { alignSelf: 'stretch', textAlign: 'center', fontWeight: '600' },
  mark: { width: 16, height: 2, marginTop: 2 },
});
