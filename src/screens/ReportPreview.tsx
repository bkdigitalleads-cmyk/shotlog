import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fonts, lightTheme, radius, space, tabular, type, Theme } from '../theme';
import { REPORT_FOOTER, rangeText, ReportModel } from '../report';
import { fmt1, signed1, sinceShort } from '../insights';
import { shortDate } from '../days';
import { Button, GlyphButton } from '../ui/Kit';
import { WeightChart } from '../ui/Charts';
import { MODAL_ANIMATION } from '../ui/motion';

/** The printed page's colours: white paper and black ink, slightly softened in dark mode so it never glares. */
const PAPER_LIGHT = { bg: '#FFFFFF', ink: '#111111', soft: '#4A4A4A', rule: '#D6D6D6' };
const PAPER_DARK = { bg: '#E9E5DC', ink: '#15171A', soft: '#4A4D52', rule: '#C9C4BA' };

/**
 * The report as its pages look, drawn from the same model as the PDF. For
 * free users it carries a large SAMPLE watermark and no share or print;
 * the one button opens the paywall.
 */
export default function ReportPreview({
  visible,
  model,
  sample,
  onClose,
  onShare,
  onPrint,
  onLocked,
}: {
  visible: boolean;
  model: ReportModel | null;
  sample: boolean;
  onClose: () => void;
  onShare: () => void;
  onPrint: () => void;
  onLocked: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  if (!model) return null;
  const P = theme.isDark ? PAPER_DARK : PAPER_LIGHT;
  const paperTheme: Theme = { ...lightTheme, chart: P.ink, rule: P.rule, inkSoft: P.soft, live: '#2747C9' };
  const u = model.unit;
  const pageW = Math.min(width, 560) - space.l * 2;
  // Oldest first, as in the PDF: the latest 14 shots, with the count of earlier ones above them.
  const shown = model.shots.slice(-14);

  const box = (n: string, l: string) => (
    <View style={[styles.box, { borderColor: P.rule }]} accessible accessibilityLabel={`${l}: ${n}`}>
      <Text style={[styles.boxN, { color: P.ink }, tabular]} numberOfLines={1} adjustsFontSizeToFit>
        {n}
      </Text>
      <Text style={[styles.boxL, { color: P.soft }]}>{l}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType={MODAL_ANIMATION} presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: theme.rule }]}>
          <Text style={[type.title, { color: theme.ink }]} accessibilityRole="header">
            {sample ? 'Report preview' : 'Your report'}
          </Text>
          <GlyphButton theme={theme} glyph="close" label="Close the preview" onPress={onClose} color={theme.inkSoft} />
        </View>
        {sample ? <Text style={[type.small, styles.note, { color: theme.inkSoft }]}>Your own entries, laid out the way your prescriber sees them. Pro shares and prints the clean copy.</Text> : null}

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={[styles.page, { backgroundColor: P.bg, width: pageW, borderColor: theme.edge }]}>
            <Text style={[styles.h1, { color: P.ink }]}>Injection log</Text>
            <Text style={[styles.meta, { color: P.soft }, tabular]}>{`Patient: ${model.patient || '________________'}\nDates: ${rangeText(model)}`}</Text>
            <View style={styles.boxes}>
              {box(String(model.shots.length), 'Shots logged')}
              {box(model.weightEnd ? `${fmt1(model.weightEnd.value)}` : model.weightStart ? fmt1(model.weightStart.value) : 'None', `Latest weight, ${u}`)}
            </View>
            <View style={styles.boxes}>
              {box(model.weightChange != null ? signed1(model.weightChange) : 'None', model.perWeek != null ? `Change, ${u} (${signed1(model.perWeek)} a week)` : `Change in range, ${u}`)}
              {box(String(model.feelingTotal), 'Side-effect entries')}
            </View>

            <Text style={[styles.h2, { color: P.ink, borderBottomColor: P.rule }]}>Medication and dose history</Text>
            {model.meds.length === 0 ? <Text style={[styles.small, { color: P.soft }]}>No medication on the list.</Text> : null}
            {model.meds.map((m) => (
              <View key={m.name} style={[styles.medRow, { borderBottomColor: P.rule }]}>
                <Text style={[styles.cellB, { color: P.ink }]}>{m.name}</Text>
                <Text style={[styles.small, { color: P.soft }]}>{`${m.schedule}, first shot ${m.start}`}</Text>
                {m.doses.map((d) => (
                  <Text key={d.from} style={[styles.cell, { color: P.ink }, tabular]}>{`${d.dose} from ${d.from}`}</Text>
                ))}
              </View>
            ))}

            <Text style={[styles.h2, { color: P.ink, borderBottomColor: P.rule }]}>Weight</Text>
            {model.weights.length > 1 ? (
              <WeightChart theme={paperTheme} width={pageW - space.l * 2} height={150} points={model.weights} shotDays={model.shotDays} from={model.from} to={model.to} goal={null} unit={u} />
            ) : (
              <Text style={[styles.small, { color: P.soft }]}>Fewer than two days of weights in this range.</Text>
            )}

            <Text style={[styles.h2, { color: P.ink, borderBottomColor: P.rule }]}>Side effects</Text>
            {model.feelings.length === 0 ? <Text style={[styles.small, { color: P.soft }]}>None logged in this range.</Text> : null}
            {model.feelings.map((f) => (
              <View key={f.kind} style={[styles.tr, { borderBottomColor: P.rule }]}>
                <Text style={[styles.cell, styles.grow, { color: P.ink }]}>{f.label}</Text>
                <Text style={[styles.cell, { color: P.soft }, tabular]}>{`${f.mild} mild  ${f.moderate} moderate  ${f.strong} strong`}</Text>
                <Text style={[styles.cellB, styles.count, { color: P.ink }, tabular]}>{f.total}</Text>
              </View>
            ))}
            {model.feelings.length > 0 ? (
              <Text style={[styles.small, { color: P.soft, marginTop: space.s }, tabular]}>
                {`By days since the last shot: ${model.byDaysSince.map((n, i) => `${i === 0 ? 'day of' : sinceShort(i)}: ${n}`).join(', ')}`}
              </Text>
            ) : null}
            <Text style={[styles.foot, { color: P.soft }]}>{REPORT_FOOTER}</Text>

            <Text style={[styles.h2, { color: P.ink, borderBottomColor: P.rule }]}>Every shot</Text>
            {model.shots.length > shown.length ? (
              <Text style={[styles.small, { color: P.soft, marginBottom: space.xs }]}>{`${model.shots.length - shown.length} earlier ${model.shots.length - shown.length === 1 ? 'shot is' : 'shots are'} in the PDF. The latest ${shown.length}, oldest first:`}</Text>
            ) : null}
            {shown.map((s, i) => (
              <View key={i} style={[styles.tr, { borderBottomColor: P.rule }]}>
                <Text style={[styles.cell, styles.date, { color: P.ink }, tabular]}>{s.date.replace(/, \d{4}$/, '')}</Text>
                <Text style={[styles.cell, styles.grow, { color: P.ink }]} numberOfLines={1}>
                  {s.med}
                </Text>
                <Text style={[styles.cell, styles.dose, { color: P.ink }, tabular]}>{s.dose}</Text>
                <Text style={[styles.cell, styles.site, { color: P.soft }]} numberOfLines={1}>
                  {s.site}
                </Text>
              </View>
            ))}
            {model.shots.length === 0 ? <Text style={[styles.small, { color: P.soft }]}>No shots in this range.</Text> : null}
            <Text style={[styles.foot, { color: P.soft }]}>{REPORT_FOOTER}</Text>

            {sample && (
              <View pointerEvents="none" style={styles.wmWrap} importantForAccessibility="no-hide-descendants">
                <Text style={styles.wm}>SAMPLE</Text>
                <Text style={[styles.wm, { marginTop: 260 }]}>SAMPLE</Text>
              </View>
            )}
          </View>
          <Text style={[type.small, styles.printed, { color: theme.inkFaint }]}>{`Made ${shortDate(model.to, true)}. Printed as A4 or Letter pages.`}</Text>
        </ScrollView>

        <View style={[styles.bottom, { borderTopColor: theme.rule, paddingBottom: Math.max(insets.bottom, space.m) }]}>
          {sample ? (
            <Button theme={theme} live label="Share and print with Pro" onPress={onLocked} />
          ) : (
            <View style={styles.pair}>
              <View style={styles.grow}>
                <Button theme={theme} live glyph="share" label="Share PDF" onPress={onShare} />
              </View>
              <View style={styles.grow}>
                <Button theme={theme} glyph="print" label="Print" onPress={onPrint} />
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.l, paddingRight: space.s, minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
  note: { paddingHorizontal: space.l, paddingTop: space.s },
  scroll: { alignItems: 'center', paddingVertical: space.l },
  page: { padding: space.l, borderRadius: radius.tab / 2, borderWidth: 1, overflow: 'hidden' },
  h1: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 26 },
  h2: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, marginTop: space.l, marginBottom: space.s, paddingBottom: 2, borderBottomWidth: 1 },
  meta: { fontSize: 11, lineHeight: 16, marginTop: space.xs },
  boxes: { flexDirection: 'row', gap: space.s, marginTop: space.s },
  box: { flex: 1, borderWidth: 1, borderRadius: radius.tab / 2, padding: space.s },
  boxN: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 22 },
  boxL: { fontSize: 9.5, lineHeight: 12 },
  medRow: { paddingVertical: space.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  tr: { flexDirection: 'row', alignItems: 'center', gap: space.s, paddingVertical: 3, borderBottomWidth: StyleSheet.hairlineWidth },
  cell: { fontSize: 11, lineHeight: 15 },
  cellB: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
  small: { fontSize: 10, lineHeight: 14 },
  grow: { flex: 1 },
  count: { minWidth: 20, textAlign: 'right' },
  date: { width: 44 },
  dose: { width: 52, textAlign: 'right' },
  site: { width: 92 },
  foot: { fontSize: 9.5, marginTop: space.m },
  wmWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', paddingTop: 140 },
  wm: { fontSize: 72, fontWeight: '800', color: 'rgba(0,0,0,0.09)', transform: [{ rotate: '-24deg' }], letterSpacing: 6 },
  printed: { marginTop: space.s },
  bottom: { paddingHorizontal: space.l, paddingTop: space.m, borderTopWidth: StyleSheet.hairlineWidth },
  pair: { flexDirection: 'row', gap: space.m },
});
