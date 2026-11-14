import React, { useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useTheme, eyebrow, radius, space, type } from '../theme';
import { useApp } from '../state';
import { dayKey, dayLabel, timeLabel } from '../days';
import { doseLabel } from '../schedule';
import { siteLabel } from '../sites';
import { convertWeight, daysSinceShot, fmt1, sinceLabel } from '../insights';
import { feelingLabel, levelLabel, waistUnit } from '../labels';
import { gate, visibleEntries } from '../gates';
import type { FeelingEntry, Shot, Weight } from '../model';
import { Button, Choice, GlyphButton, PageTitle, Row, Rows } from '../ui/Kit';
import { Tray } from '../ui/Tray';

export type Entry = { kind: 'shot'; at: number; item: Shot } | { kind: 'weight'; at: number; item: Weight } | { kind: 'feel'; at: number; item: FeelingEntry };
type Filter = 'all' | 'shot' | 'weight' | 'feel';

/**
 * Everything logged, newest day first: shots, weights and how I feel. Tap
 * any entry to change it; add anything from the past with the plus. Free
 * shows the last 30 days; Pro keeps the whole history.
 */
export default function History({
  onShot,
  onWeight,
  onFeel,
  onAddShot,
  onAddWeight,
  onAddFeel,
}: {
  onShot: (s: Shot) => void;
  onWeight: (w: Weight) => void;
  onFeel: (f: FeelingEntry) => void;
  onAddShot: () => void;
  onAddWeight: () => void;
  onAddFeel: () => void;
}) {
  const theme = useTheme();
  const { shots, weights, feelings, isPro, showPaywall, settings } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [adding, setAdding] = useState(false);
  const now = Date.now();

  const all = useMemo<Entry[]>(() => {
    const list: Entry[] = [];
    if (filter === 'all' || filter === 'shot') for (const s of shots) list.push({ kind: 'shot', at: s.at, item: s });
    if (filter === 'all' || filter === 'weight') for (const w of weights) list.push({ kind: 'weight', at: w.at, item: w });
    if (filter === 'all' || filter === 'feel') for (const f of feelings) list.push({ kind: 'feel', at: f.at, item: f });
    return list.sort((a, b) => b.at - a.at);
  }, [shots, weights, feelings, filter]);

  const { shown, hidden } = visibleEntries(all, now, isPro);
  const sections = useMemo(() => {
    const out: { title: string; data: Entry[] }[] = [];
    for (const e of shown) {
      const t = dayLabel(dayKey(e.at));
      if (out.length === 0 || out[out.length - 1].title !== t) out.push({ title: t, data: [] });
      out[out.length - 1].data.push(e);
    }
    return out;
  }, [shown]);

  const u = settings.weightUnit;
  const row = (e: Entry) => {
    if (e.kind === 'shot') {
      const s = e.item;
      return (
        <Row
          theme={theme}
          glyph="pen"
          label={`${s.medName || 'Shot'}${doseLabel(s) ? `  ${doseLabel(s)}` : ''}`}
          sub={[timeLabel(s.at), s.site ? siteLabel(s.site) : null, s.backfilled ? 'Added later' : null].filter(Boolean).join(' · ')}
          onPress={() => onShot(s)}
        />
      );
    }
    if (e.kind === 'weight') {
      const w = e.item;
      return (
        <Row
          theme={theme}
          glyph="scale"
          label={`${fmt1(convertWeight(w.value, w.unit, u))} ${u}`}
          sub={[timeLabel(w.at), w.waist != null ? `Waist ${w.waist} ${waistUnit(w.unit)}` : null].filter(Boolean).join(' · ')}
          onPress={() => onWeight(w)}
        />
      );
    }
    const f = e.item;
    const n = daysSinceShot(f.at, shots);
    return (
      <Row
        theme={theme}
        glyph="pulse"
        label={`${feelingLabel(f.kind)}, ${levelLabel(f.level).toLowerCase()}`}
        sub={[timeLabel(f.at), n != null ? sinceLabel(n) : null, f.note || null].filter(Boolean).join(' · ')}
        onPress={() => onFeel(f)}
      />
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <PageTitle theme={theme} title="History" right={<GlyphButton theme={theme} glyph="plus" label="Add something from the past" onPress={() => setAdding(true)} />} />
      <View style={styles.filter}>
        <Choice
          theme={theme}
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: 'All' },
            { id: 'shot', label: 'Shots' },
            { id: 'weight', label: 'Weight' },
            { id: 'feel', label: 'Feel' },
          ]}
        />
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(e) => `${e.kind}-${e.item.id}`}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={[eyebrow, styles.day, { color: theme.inkSoft }]} accessibilityRole="header">
            {section.title}
          </Text>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.item,
              { backgroundColor: theme.surface, borderColor: theme.edge },
              index === 0 && styles.first,
              index === section.data.length - 1 && styles.last,
              index > 0 && { borderTopColor: theme.rule, borderTopWidth: StyleSheet.hairlineWidth },
            ]}
          >
            {row(item)}
          </View>
        )}
        ListEmptyComponent={<Text style={[type.body, styles.empty, { color: theme.inkSoft }]}>Nothing here yet. Shots, weights and how you feel show here, newest first.</Text>}
        ListFooterComponent={
          hidden > 0 ? (
            <View style={styles.more}>
              <Text style={[type.body, { color: theme.inkSoft }]}>
                {hidden} older {hidden === 1 ? 'entry' : 'entries'}. Free shows the last 30 days; Pro keeps your whole history.
              </Text>
              <Button theme={theme} label="See my whole history" onPress={() => showPaywall(gate('history', isPro) ?? 'history')} />
            </View>
          ) : null
        }
      />
      <Tray theme={theme} visible={adding} onClose={() => setAdding(false)} title="Add from the past" sub="Pick the date and time on the next screen.">
        <Rows theme={theme}>
          <Row theme={theme} glyph="pen" label="A shot" onPress={() => (setAdding(false), onAddShot())} />
          <Row theme={theme} glyph="scale" label="A weight" onPress={() => (setAdding(false), onAddWeight())} />
          <Row theme={theme} glyph="pulse" label="How I felt" onPress={() => (setAdding(false), onAddFeel())} />
        </Rows>
      </Tray>
    </View>
  );
}

const styles = StyleSheet.create({
  filter: { paddingHorizontal: space.l, paddingBottom: space.s },
  list: { paddingHorizontal: space.l, paddingBottom: space.xxl },
  day: { marginTop: space.xl, marginBottom: space.s },
  item: { borderLeftWidth: 1, borderRightWidth: 1, overflow: 'hidden' },
  first: { borderTopWidth: 1, borderTopLeftRadius: radius.leaf, borderTopRightRadius: radius.leaf },
  last: { borderBottomWidth: 1, borderBottomLeftRadius: radius.leaf, borderBottomRightRadius: radius.leaf },
  empty: { marginTop: space.xl },
  more: { marginTop: space.xl, gap: space.m },
});
