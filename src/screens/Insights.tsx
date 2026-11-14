import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTheme, space, tabular, type, Theme } from '../theme';
import { useApp } from '../state';
import { addDays, dayKey, shortDate } from '../days';
import { siteLabel, recentSites } from '../sites';
import { changeSinceFirstShot, dailyWeights, feelingCounts, fmt1, inLastDays, patternLine, patterns, signed1, weeklyChange } from '../insights';
import { feelingLabel } from '../labels';
import { gate, type ProFeature } from '../gates';
import type { Feeling, Site } from '../model';
import { Button, Choice, Eyebrow, Figure, Leaf, PageTitle, ProMark, Row, Rows } from '../ui/Kit';
import { SinceBars, WeightChart } from '../ui/Charts';
import BodyMap, { SiteUse } from '../ui/BodyMap';

type View3 = 'trends' | 'patterns' | 'sites';
const RANGES = [30, 90, 180] as const;

/** What each Pro view holds, for free users, with one button to the paywall. */
const LOCKED: Record<View3, { title: string; line: string; button: string; feature: ProFeature }> = {
  trends: {
    title: 'Weight against your shots',
    line: 'Your weight over 30, 90 or 180 days with each shot marked on the line, the average change a week, and the change since your first shot.',
    button: 'See my trends',
    feature: 'trends',
  },
  patterns: {
    title: 'Which days after a shot',
    line: 'How I feel entries counted by days since the last shot, so you can see where they cluster. Counts only.',
    button: 'See my patterns',
    feature: 'patterns',
  },
  sites: {
    title: 'Where your last 12 shots went',
    line: 'Your last 12 shots on the body map, with how many went to each site and when.',
    button: 'See my site history',
    feature: 'sites',
  },
};

export default function Insights() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { isPro, showPaywall } = useApp();
  const [view, setView] = useState<View3>('trends');
  const inner = Math.min(width, 520) - space.l * 2;

  return (
    <View style={{ flex: 1 }}>
      <PageTitle theme={theme} title="Insights" right={isPro ? null : <View style={styles.proTop}><ProMark theme={theme} /></View>} />
      <View style={styles.switch}>
        <Choice
          theme={theme}
          label="Insights"
          value={view}
          onChange={setView}
          options={[
            { id: 'trends', label: 'Trends' },
            { id: 'patterns', label: 'Patterns' },
            { id: 'sites', label: 'Sites' },
          ]}
        />
      </View>
      <ScrollView contentContainerStyle={styles.page}>
        {!isPro ? (
          <Leaf theme={theme}>
            <Text style={[type.title, { color: theme.ink }]}>{LOCKED[view].title}</Text>
            <Text style={[type.body, styles.lockedLine, { color: theme.inkSoft }]}>{LOCKED[view].line}</Text>
            <Button theme={theme} label={LOCKED[view].button} onPress={() => showPaywall(gate(LOCKED[view].feature, isPro) ?? 'pro')} />
          </Leaf>
        ) : view === 'trends' ? (
          <Trends theme={theme} width={inner} />
        ) : view === 'patterns' ? (
          <Patterns theme={theme} width={inner} />
        ) : (
          <Sites theme={theme} width={inner} />
        )}
      </ScrollView>
    </View>
  );
}

function Trends({ theme, width }: { theme: Theme; width: number }) {
  const { weights, shots, settings } = useApp();
  const [range, setRange] = useState<(typeof RANGES)[number]>(90);
  const u = settings.weightUnit;
  const today = dayKey(Date.now());
  const all = useMemo(() => dailyWeights(weights, u), [weights, u]);
  const pts = inLastDays(all, range, today);
  const from = addDays(today, -(range - 1));
  const shotDays = shots.map((s) => dayKey(s.at)).filter((d) => d >= from && d <= today);
  const perWeek = weeklyChange(pts);
  const since = changeSinceFirstShot(all, shots);

  return (
    <>
      <Choice theme={theme} label="Range" value={range} onChange={setRange} options={RANGES.map((r) => ({ id: r, label: `${r} days` }))} />
      <Leaf theme={theme}>
        <Eyebrow theme={theme}>Weight, {u}</Eyebrow>
        {pts.length > 0 ? (
          <WeightChart theme={theme} width={width - space.l * 2 - 2} points={pts} shotDays={shotDays} from={from} to={today} goal={settings.weightGoal} unit={u} />
        ) : (
          <Text style={[type.body, { color: theme.inkSoft }]}>No weights in the last {range} days yet.</Text>
        )}
        <View style={styles.key}>
          <View style={[styles.keyTick, { backgroundColor: theme.live }]} />
          <Text style={[type.small, { color: theme.inkSoft }]}>A shot</Text>
          {settings.weightGoal != null && (
            <>
              <View style={[styles.keyDash, { borderColor: theme.inkSoft }]} />
              <Text style={[type.small, { color: theme.inkSoft }]}>Your goal</Text>
            </>
          )}
        </View>
      </Leaf>
      <View style={styles.figures}>
        <Leaf theme={theme} style={styles.figure}>
          <Figure theme={theme} value={perWeek != null ? signed1(perWeek) : 'None yet'} unit={perWeek != null ? `${u} a week` : undefined} label={`Average, last ${range} days`} />
        </Leaf>
        <Leaf theme={theme} style={styles.figure}>
          <Figure theme={theme} value={since ? signed1(since.change) : 'None yet'} unit={since ? u : undefined} label={since ? `Since your first shot (${shortDate(since.fromDay)})` : 'Since your first shot'} />
        </Leaf>
      </View>
      <Text style={[type.small, { color: theme.inkFaint }]}>
        {pts.length} {pts.length === 1 ? 'day' : 'days'} weighed and {shotDays.length} {shotDays.length === 1 ? 'shot' : 'shots'} in this range. A day with more than one weight shows their average.
      </Text>
    </>
  );
}

function Patterns({ theme, width }: { theme: Theme; width: number }) {
  const { feelings, shots } = useApp();
  const p = useMemo(() => patterns(feelings, shots), [feelings, shots]);
  const counts = useMemo(() => feelingCounts(feelings), [feelings]);
  return (
    <>
      <Leaf theme={theme}>
        <Eyebrow theme={theme}>Days after a shot</Eyebrow>
        <SinceBars theme={theme} width={width - space.l * 2 - 2} buckets={p.buckets} />
        <Text style={[type.small, { color: theme.inkSoft, marginTop: space.s }]}>Day of the shot, then days after it. {p.beforeFirstShot > 0 ? `${p.beforeFirstShot} from before your first logged shot are not counted.` : ''}</Text>
      </Leaf>
      <Text style={[type.body, { color: theme.ink }, tabular]}>{patternLine(p)}</Text>
      {counts.length > 0 && (
        <View>
          <Eyebrow theme={theme}>All entries</Eyebrow>
          <Rows theme={theme}>
            {counts.map((c) => {
              const byDay = p.byKind[c.kind];
              const peak = byDay ? byDay.indexOf(Math.max(...byDay)) : -1;
              return (
                <Row
                  key={c.kind}
                  theme={theme}
                  label={feelingLabel(c.kind as Feeling)}
                  sub={[c.strong ? `${c.strong} strong` : null, peak >= 0 && byDay[peak] > 0 ? `most on ${peak === 0 ? 'the day of the shot' : `day ${peak === 7 ? '7+' : peak} after`}` : null].filter(Boolean).join(' · ') || undefined}
                  value={String(c.count)}
                />
              );
            })}
          </Rows>
        </View>
      )}
    </>
  );
}

function Sites({ theme, width }: { theme: Theme; width: number }) {
  const { shots } = useApp();
  const recent = useMemo(() => recentSites(shots, 12), [shots]);
  const uses = useMemo(() => {
    const u: Partial<Record<Site, SiteUse>> = {};
    for (const r of recent) {
      const cur = u[r.site] ?? { count: 0 };
      u[r.site] = { count: cur.count + 1, lastLabel: cur.lastLabel ?? shortDate(dayKey(r.at)) };
    }
    return u;
  }, [recent]);
  return (
    <>
      <Leaf theme={theme}>
        <Eyebrow theme={theme}>Last {recent.length || 12} shots</Eyebrow>
        <BodyMap theme={theme} width={width - space.l * 2 - 2} uses={uses} />
      </Leaf>
      {recent.length > 0 ? (
        <Rows theme={theme}>
          {recent.map((r) => (
            <Row key={`${r.at}-${r.rank}`} theme={theme} label={siteLabel(r.site)} value={shortDate(dayKey(r.at), dayKey(r.at).slice(0, 4) !== dayKey(Date.now()).slice(0, 4))} />
          ))}
        </Rows>
      ) : (
        <Text style={[type.body, { color: theme.inkSoft }]}>Shots with a site show here.</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  switch: { paddingHorizontal: space.l, paddingBottom: space.s },
  page: { padding: space.l, gap: space.l, paddingBottom: space.xxl },
  proTop: { paddingRight: space.s },
  lockedLine: { marginTop: space.s, marginBottom: space.l },
  key: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginTop: space.s },
  keyTick: { width: 3, height: 10, borderRadius: 2 },
  keyDash: { width: 16, borderTopWidth: 1, borderStyle: 'dashed', marginLeft: space.m },
  figures: { flexDirection: 'row', gap: space.m },
  figure: { flex: 1 },
});
