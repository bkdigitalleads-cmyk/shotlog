import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, radius, space, tabular, type, Theme } from '../theme';
import { useApp } from '../state';
import { addIntake } from '../db';
import { dayKey, shortDate, weekdayName, whenShort } from '../days';
import { doseLabel, doseOn, dueText, medDueDay, scheduleLabel } from '../schedule';
import { nextSite, rotationLine, siteName } from '../sites';
import { daysSinceShot, fmt1, intakeOn, latestWeight, progress, sinceLabel, waterShown, waterStored } from '../insights';
import { feelingLabel, intakeSteps, levelLabel, waterUnit } from '../labels';
import { gate } from '../gates';
import type { Med } from '../model';
import { Button, Eyebrow, GlyphButton, Leaf, MainAction, PageTitle, ProMark, Row, Rows, Tap } from '../ui/Kit';
import BodyMap from '../ui/BodyMap';
import Glyph from '../ui/Glyph';
import { soonestMed } from './LogShot';
import { tick } from '../ui/motion';

/**
 * Home is one screen: when the next shot is due, where it goes next in the
 * person's own rotation, and one large Log shot button. Under it, the day's
 * quick entries: weight, how I feel, and protein and water.
 */
export default function Today({
  onLogShot,
  onMeds,
  onSettings,
  onWeight,
  onFeel,
}: {
  onLogShot: (medId: number | null) => void;
  onMeds: () => void;
  onSettings: () => void;
  onWeight: () => void;
  onFeel: () => void;
}) {
  const theme = useTheme();
  const { active, shots, weights, feelings, settings, isPro, intake, showPaywall, refresh } = useApp();
  const now = Date.now();
  const today = dayKey(now);

  const med = soonestMed(active, shots);
  const others = active.filter((m) => m.id !== med?.id);
  // The site rotation is the medication's own: a B12 shot in the arm does not move a weekly shot's rotation.
  const history = useMemo(() => shots.filter((s) => s.medId === med?.id).sort((a, b) => a.at - b.at), [shots, med]);
  const lastSite = useMemo(() => {
    for (let i = history.length - 1; i >= 0; i--) if (history[i].site) return history[i].site;
    return null;
  }, [history]);
  const next = useMemo(() => nextSite(history.map((s) => s.site)), [history]);

  const due = med ? medDueDay(med, shots) : null;
  const dueLine = due ? dueText(due, today) : null;
  const dose = med ? doseLabel(doseOn(med.doses, due && due > today ? due : today)) : '';
  const last = latestWeight(weights, settings.weightUnit);
  const since = daysSinceShot(now, shots);
  const todays = feelings.filter((f) => dayKey(f.at) === today);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <PageTitle theme={theme} title="Today" sub={`${weekdayName(today)}, ${shortDate(today)}`} right={<GlyphButton theme={theme} glyph="sliders" label="Settings" onPress={onSettings} />} />

      <View style={styles.body}>
        {med && dueLine ? (
          <Leaf theme={theme} margin style={styles.next}>
            <Eyebrow theme={theme}>Next shot</Eyebrow>
            <Text style={[type.display, { color: theme.ink }]} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
              {dueLine.title}
            </Text>
            <Text style={[type.small, { color: theme.inkSoft }, tabular]}>{dueLine.sub}</Text>
            <View style={styles.nextInner}>
              <Tap onPress={onMeds} accessibilityRole="button" accessibilityLabel={`${med.name}, ${dose || 'no dose typed'}, ${scheduleLabel(med.schedule)}. Edit`} style={styles.medLine}>
                <Text style={[type.body, styles.semi, { color: theme.ink }, tabular]} numberOfLines={2}>
                  {med.name}
                </Text>
                {dose ? <Text style={[type.title, { color: theme.ink }, tabular]}>{dose}</Text> : null}
                <Text style={[type.small, { color: theme.inkSoft }]}>{scheduleLabel(med.schedule)}</Text>
              </Tap>
              <View style={styles.mini} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <BodyMap theme={theme} width={150} last={lastSite} next={next} caption={false} />
              </View>
            </View>
            <Text style={[type.small, styles.rotation, { color: theme.inkSoft, borderTopColor: theme.rule }]}>{rotationLine(lastSite, next)}</Text>
          </Leaf>
        ) : (
          <Leaf theme={theme}>
            <Eyebrow theme={theme}>Next shot</Eyebrow>
            <Text style={[type.title, { color: theme.ink }]}>Add your medication</Text>
            <Text style={[type.body, { color: theme.inkSoft, marginTop: space.xs, marginBottom: space.l }]}>Then the next shot and where it goes show here.</Text>
            <Button theme={theme} glyph="plus" label="Add a medication" onPress={onMeds} />
          </Leaf>
        )}

        {others.length > 0 && (
          <Rows theme={theme}>
            {others.map((m) => (
              <OtherMed key={m.id} theme={theme} med={m} today={today} onLog={() => onLogShot(m.id)} />
            ))}
          </Rows>
        )}

        <MainAction
          theme={theme}
          glyph="pen"
          label="Log shot"
          sub={med ? [dose, next ? siteName(next) : null].filter(Boolean).join(', ') || undefined : undefined}
          hint="Opens the log sheet, already filled in. Save is the only tap needed."
          onPress={() => (med ? onLogShot(med.id) : onMeds())}
        />

        <View>
          <Eyebrow theme={theme}>Also today</Eyebrow>
          <Rows theme={theme}>
            <Row
              theme={theme}
              glyph="scale"
              label="Weight"
              sub={last ? `Last ${fmt1(last.value)} ${settings.weightUnit}, ${whenShort(last.at, now).split(',')[0]}${settings.weightGoal ? ` · Goal ${fmt1(settings.weightGoal)} ${settings.weightUnit}` : ''}` : 'Tap to add'}
              onPress={onWeight}
            />
            <Row
              theme={theme}
              glyph="pulse"
              label="How I feel"
              sub={
                todays.length > 0
                  ? todays
                      .slice(0, 3)
                      .map((f) => `${feelingLabel(f.kind)}, ${levelLabel(f.level).toLowerCase()}`)
                      .join(' · ')
                  : since != null
                    ? `${since === 0 ? 'The day of your last shot' : `${sinceLabel(since)} your last shot`}`
                    : 'Nausea, fatigue, a site reaction, anything'
              }
              onPress={onFeel}
            />
          </Rows>
        </View>

        {settings.showIntake && (
          <Intake
            theme={theme}
            locked={!isPro}
            day={today}
            values={(() => {
              const v = intakeOn(intake, today);
              return { protein: v.protein, water: waterShown(v.water, settings.weightUnit) };
            })()}
            goals={{ protein: settings.proteinGoal, water: settings.waterGoal != null ? waterShown(settings.waterGoal, settings.weightUnit) : null }}
            unit={settings.weightUnit}
            onLocked={() => showPaywall(gate('intake', isPro) ?? 'intake')}
            onAdd={async (what, n) => {
              await addIntake(today, what, what === 'water' ? waterStored(n, settings.weightUnit) : n);
              await refresh();
            }}
          />
        )}
      </View>
    </ScrollView>
  );
}

function OtherMed({ theme, med, today, onLog }: { theme: Theme; med: Med; today: string; onLog: () => void }) {
  const { shots } = useApp();
  const due = medDueDay(med, shots);
  const t = due ? dueText(due, today) : null;
  return <Row theme={theme} glyph="vial" label={med.name} sub={t ? `${t.title}, ${t.sub}` : scheduleLabel(med.schedule)} value="Log" onPress={onLog} hint={`Log a ${med.name} shot`} />;
}

/** Protein and water: tap-to-add counters against a goal the person sets. No recommended targets. */
function Intake({
  theme,
  locked,
  values,
  goals,
  unit,
  onAdd,
  onLocked,
}: {
  theme: Theme;
  locked: boolean;
  day: string;
  values: { protein: number; water: number };
  goals: { protein: number | null; water: number | null };
  unit: 'kg' | 'lb';
  onAdd: (what: 'protein' | 'water', n: number) => void;
  onLocked: () => void;
}) {
  const steps = intakeSteps(unit);
  const wu = waterUnit(unit);
  const line = (what: 'protein' | 'water') => {
    const v = values[what];
    const g = goals[what];
    const u = what === 'protein' ? 'g' : wu;
    const p = progress(v, g);
    const label = what === 'protein' ? 'Protein' : 'Water';
    return (
      <View key={what} style={styles.intakeRow}>
        <Glyph name={what === 'protein' ? 'bowl' : 'drop'} size={22} color={theme.inkSoft} />
        <View style={styles.intakeText} accessible accessibilityLabel={`${label}: ${Math.round(v)} ${u}${g ? ` of ${Math.round(g)}` : ''}`}>
          <Text style={[type.body, { color: theme.ink }, tabular]}>
            {label} <Text style={[styles.semi, tabular]}>{Math.round(v)}</Text>
            <Text style={{ color: theme.inkSoft }}>{g ? ` / ${Math.round(g)} ${u}` : ` ${u}`}</Text>
          </Text>
          <View style={[styles.track, { backgroundColor: theme.well }]}>{p != null && <View style={[styles.fill, { width: `${p * 100}%`, backgroundColor: theme.ink }]} />}</View>
        </View>
        {(what === 'protein' ? steps.protein : steps.water).map((n) => (
          <Tap
            key={n}
            onPress={() => {
              if (locked) return onLocked();
              tick();
              onAdd(what, n);
            }}
            onLongPress={() => {
              if (locked || v <= 0) return;
              Alert.alert(`Take ${n} ${u} off?`, undefined, [
                { text: 'Keep', style: 'cancel' },
                { text: 'Take off', onPress: () => onAdd(what, -n) },
              ]);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Add ${n} ${u} of ${label.toLowerCase()}`}
            accessibilityHint="Touch and hold to take it off"
            style={[styles.step, { borderColor: theme.edge, backgroundColor: theme.surface }]}
            pressedStyle={{ backgroundColor: theme.well }}
          >
            <Text style={[type.small, styles.semi, { color: theme.ink }, tabular]}>+{n}</Text>
          </Tap>
        ))}
      </View>
    );
  };
  return (
    <View>
      <Eyebrow theme={theme} right={locked ? <ProMark theme={theme} /> : null}>
        Protein and water
      </Eyebrow>
      <Leaf theme={theme} style={styles.intake}>
        {line('protein')}
        <View style={[styles.hair, { backgroundColor: theme.rule }]} />
        {line('water')}
        {!goals.protein && !goals.water ? <Text style={[type.small, { color: theme.inkFaint, marginTop: space.s }]}>Set your own goals in Settings, if you want them.</Text> : null}
      </Leaf>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: space.xxl },
  body: { paddingHorizontal: space.l, gap: space.xl },
  semi: { fontWeight: '600' },
  next: { paddingLeft: space.xxl },
  nextInner: { flexDirection: 'row', alignItems: 'center', gap: space.s, marginTop: space.m },
  medLine: { flex: 1, minHeight: 44, justifyContent: 'center', gap: 2 },
  mini: { marginRight: -space.s },
  rotation: { marginTop: space.m, paddingTop: space.m, borderTopWidth: StyleSheet.hairlineWidth },
  intake: { paddingVertical: space.s },
  intakeRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 56 },
  intakeText: { flex: 1, gap: space.xs },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4 },
  step: { minWidth: 48, minHeight: 44, borderWidth: 1, borderRadius: radius.tab, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.s },
  hair: { height: StyleSheet.hairlineWidth },
});
