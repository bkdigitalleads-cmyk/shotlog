import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, space, tabular, type, Theme } from '../theme';
import { useApp } from '../state';
import { addDoseChange, addMed, deleteDoseChange, deleteMed, updateMed } from '../db';
import { atTime, dayKey, shortDate, WEEKDAY_SHORT, WEEKDAY_LONG } from '../days';
import { doseLabel, doseOn, scheduleLabel } from '../schedule';
import { canAddMed, gate } from '../gates';
import { DOSE_UNITS, NAME_SUGGESTIONS } from '../labels';
import type { DoseUnit, Med, Schedule } from '../model';
import { Button, Choice, Eyebrow, Field, GlyphButton, LinkText, ProMark, Row, Rows, SwitchRow, Tag, Tags, TopBar } from '../ui/Kit';
import { Tray } from '../ui/Tray';
import When from '../ui/When';
import { savedHaptic } from '../ui/motion';

export interface MedDraft {
  name: string;
  amount: string;
  unit: DoseUnit;
  kind: 'interval' | 'weekdays';
  everyDays: number;
  weekdays: number[];
  startDay: string;
  remind: boolean;
}

export function blankDraft(): MedDraft {
  const today = dayKey(Date.now());
  return { name: '', amount: '', unit: 'mg', kind: 'interval', everyDays: 7, weekdays: [], startDay: today, remind: true };
}

function draftOf(m: Med): MedDraft {
  const d = doseOn(m.doses, dayKey(Date.now()));
  return {
    name: m.name,
    amount: d?.amount ?? '',
    unit: d?.unit ?? 'mg',
    kind: m.schedule.kind,
    everyDays: m.schedule.kind === 'interval' ? m.schedule.everyDays : 7,
    weekdays: m.schedule.kind === 'weekdays' ? m.schedule.days : [],
    startDay: m.startDay,
    remind: m.remind,
  };
}

export function scheduleOf(d: MedDraft): Schedule {
  return d.kind === 'interval' ? { kind: 'interval', everyDays: d.everyDays } : { kind: 'weekdays', days: d.weekdays };
}

/** Saves a new medication from a draft. Returns its id, or null when the name is empty. */
export async function saveNewMed(d: MedDraft): Promise<number | null> {
  if (!d.name.trim()) return null;
  return addMed({ name: d.name, schedule: scheduleOf(d), startDay: d.startDay, remind: d.remind }, { amount: d.amount, unit: d.unit });
}

/**
 * The medication form: name (generic names offered as you type), the dose
 * as an amount and a unit the person types, the schedule (every N days or
 * chosen weekdays) and the start date. No suggested doses, no titration,
 * no conversions.
 */
export function MedForm({ theme, draft, onChange, newMed }: { theme: Theme; draft: MedDraft; onChange: (d: MedDraft) => void; newMed: boolean }) {
  const set = (patch: Partial<MedDraft>) => onChange({ ...draft, ...patch });
  const q = draft.name.trim().toLowerCase();
  const suggestions = NAME_SUGGESTIONS.filter((n) => n.toLowerCase() !== q && (q.length === 0 || n.toLowerCase().startsWith(q)));
  return (
    <>
      <View>
        <Field theme={theme} label="Name" value={draft.name} onChangeText={(name) => set({ name })} placeholder="Any name you use" autoCapitalize="words" maxLength={60} />
        {suggestions.length > 0 && (
          <View style={styles.suggest}>
            <Tags>
              {suggestions.map((n) => (
                <Tag key={n} theme={theme} label={n} on={false} onPress={() => set({ name: n })} hint="Uses this name" />
              ))}
            </Tags>
          </View>
        )}
      </View>

      {newMed && (
        <View>
          <View style={styles.doseRow}>
            <Field theme={theme} label="Dose" value={draft.amount} onChangeText={(amount) => set({ amount })} keyboardType="decimal-pad" placeholder="As prescribed" style={styles.amount} />
            <View style={styles.unit}>
              <Text style={[type.small, { color: theme.inkSoft, marginBottom: space.xs }]}>Unit</Text>
              <Choice theme={theme} label="Dose unit" options={DOSE_UNITS} value={draft.unit} onChange={(unit) => set({ unit })} />
            </View>
          </View>
          <Text style={[type.small, { color: theme.inkFaint, marginTop: space.s }]}>Type it the way your prescriber or label gives it.</Text>
        </View>
      )}

      <View>
        <Eyebrow theme={theme}>Schedule</Eyebrow>
        <Choice
          theme={theme}
          label="Schedule"
          options={[
            { id: 'interval', label: 'Every few days' },
            { id: 'weekdays', label: 'Chosen days' },
          ]}
          value={draft.kind}
          onChange={(kind) => set({ kind })}
        />
        {draft.kind === 'interval' ? (
          <View style={styles.stepper} accessible accessibilityRole="adjustable" accessibilityLabel={`Every ${draft.everyDays} days`} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={(e) => set({ everyDays: Math.max(1, Math.min(60, draft.everyDays + (e.nativeEvent.actionName === 'increment' ? 1 : -1))) })}>
            <GlyphButton theme={theme} glyph="minus" label="One day fewer" onPress={() => set({ everyDays: Math.max(1, draft.everyDays - 1) })} />
            <Text style={[type.title, styles.stepValue, { color: theme.ink }, tabular]}>{scheduleLabel({ kind: 'interval', everyDays: draft.everyDays })}</Text>
            <GlyphButton theme={theme} glyph="plus" label="One day more" onPress={() => set({ everyDays: Math.min(60, draft.everyDays + 1) })} />
          </View>
        ) : (
          <View style={styles.days}>
            {WEEKDAY_SHORT.map((d, i) => {
              const on = draft.weekdays.includes(i);
              return (
                <Tag
                  key={d}
                  theme={theme}
                  label={d}
                  on={on}
                  hint={WEEKDAY_LONG[i]}
                  onPress={() => set({ weekdays: on ? draft.weekdays.filter((x) => x !== i) : [...draft.weekdays, i].sort() })}
                />
              );
            })}
          </View>
        )}
      </View>

      <When theme={theme} label={newMed ? 'First shot on' : 'Started'} dateOnly value={atTime(draft.startDay, 12)} onChange={(ms) => set({ startDay: dayKey(ms) })} />
    </>
  );
}

/** Add or edit one medication, with its dose history. */
export function MedEditor({ med, onClose }: { med: Med | 'new' | null; onClose: () => void }) {
  const theme = useTheme();
  const { refresh, say } = useApp();
  const [draft, setDraft] = useState<MedDraft>(blankDraft());
  const [changing, setChanging] = useState(false);
  const [newDose, setNewDose] = useState<{ amount: string; unit: DoseUnit; from: string }>({ amount: '', unit: 'mg', from: dayKey(Date.now()) });
  const existing = med && med !== 'new' ? med : null;

  useEffect(() => {
    if (!med) return;
    setDraft(med === 'new' ? blankDraft() : draftOf(med));
    setChanging(false);
    if (med !== 'new') {
      const d = doseOn(med.doses, dayKey(Date.now()));
      setNewDose({ amount: '', unit: d?.unit ?? 'mg', from: dayKey(Date.now()) });
    }
  }, [med]);

  const valid = draft.name.trim().length > 0 && (draft.kind === 'interval' || draft.weekdays.length > 0);

  const save = async () => {
    if (!valid) return;
    try {
      if (existing) {
        await updateMed(existing.id, { name: draft.name, schedule: scheduleOf(draft), startDay: draft.startDay, remind: draft.remind });
        if (changing && newDose.amount.trim()) await addDoseChange(existing.id, newDose.from, newDose.amount, newDose.unit);
      } else {
        await saveNewMed(draft);
      }
      savedHaptic();
      await refresh();
      say(existing ? 'Medication saved.' : 'Medication added.');
      onClose();
    } catch {
      Alert.alert('That did not save', 'Try once more.');
    }
  };

  const remove = () => {
    if (!existing) return;
    Alert.alert(`Remove ${existing.name}?`, 'It leaves your list and its reminders stop. Shots already logged stay in your history.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await deleteMed(existing.id);
          await refresh();
          say('Medication removed.');
          onClose();
        },
      },
    ]);
  };

  return (
    <Tray
      theme={theme}
      visible={med != null}
      onClose={onClose}
      title={existing ? existing.name : 'Add a medication'}
      footer={
        <>
          <Button theme={theme} live label="Save" onPress={save} disabled={!valid} />
          {existing ? <Button theme={theme} danger compact glyph="trash" label="Remove from my list" onPress={remove} /> : null}
        </>
      }
    >
      <MedForm theme={theme} draft={draft} onChange={setDraft} newMed={!existing} />

      {existing && (
        <View>
          <Eyebrow theme={theme}>Dose history</Eyebrow>
          <Rows theme={theme}>
            {[...existing.doses].reverse().map((d) => (
              <Row
                key={d.id}
                theme={theme}
                label={doseLabel(d) || 'No dose typed'}
                sub={`From ${shortDate(d.fromDay, true)}`}
                right={
                  existing.doses.length > 1 ? (
                    <GlyphButton
                      theme={theme}
                      glyph="trash"
                      label={`Delete the dose change from ${shortDate(d.fromDay)}`}
                      color={theme.inkFaint}
                      onPress={async () => {
                        await deleteDoseChange(d.id);
                        await refresh();
                        onClose();
                      }}
                    />
                  ) : undefined
                }
              />
            ))}
          </Rows>
          {changing ? (
            <View style={styles.change}>
              <View style={styles.doseRow}>
                <Field theme={theme} label="New dose" value={newDose.amount} onChangeText={(amount) => setNewDose({ ...newDose, amount })} keyboardType="decimal-pad" placeholder="As prescribed" style={styles.amount} />
                <View style={styles.unit}>
                  <Text style={[type.small, { color: theme.inkSoft, marginBottom: space.xs }]}>Unit</Text>
                  <Choice theme={theme} label="Unit" options={DOSE_UNITS} value={newDose.unit} onChange={(unit) => setNewDose({ ...newDose, unit })} />
                </View>
              </View>
              <When theme={theme} label="From" dateOnly value={atTime(newDose.from, 12)} onChange={(ms) => setNewDose({ ...newDose, from: dayKey(ms) })} />
              <Text style={[type.small, { color: theme.inkFaint }]}>Saved with Save. Shots already logged keep the dose they were logged with.</Text>
            </View>
          ) : (
            <LinkText theme={theme} label="Change the dose" hint="Logs a new dose from a date" onPress={() => setChanging(true)} />
          )}
        </View>
      )}

      <SwitchRow theme={theme} label="Remind me when it is due" sub="A notification on the due day. Turn reminders on in Settings." value={draft.remind} onChange={(remind) => setDraft({ ...draft, remind })} />
    </Tray>
  );
}

/** My medications. Free keeps one; a second one (the stack) is Pro. */
export default function MedsScreen({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { meds, active, isPro, showPaywall } = useApp();
  const [editing, setEditing] = useState<Med | 'new' | null>(null);
  const canAdd = canAddMed(meds.length, isPro);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <TopBar theme={theme} title="My medications" back={{ label: 'Back', onPress: onBack }} />
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: insets.bottom + space.xxl }]}>
        {meds.length > 0 ? (
          <Rows theme={theme}>
            {meds.map((m) => {
              const on = active.some((a) => a.id === m.id);
              return (
                <Row
                  key={m.id}
                  theme={theme}
                  glyph="vial"
                  label={m.name}
                  sub={[doseLabel(doseOn(m.doses, dayKey(Date.now()))), scheduleLabel(m.schedule), on ? null : 'Paused until Pro is back'].filter(Boolean).join(' · ')}
                  onPress={() => setEditing(m)}
                />
              );
            })}
          </Rows>
        ) : (
          <Text style={[type.body, { color: theme.inkSoft }]}>Add the medication you inject. The next shot and its reminder follow its schedule.</Text>
        )}
        <View style={styles.add}>
          <Button
            theme={theme}
            glyph="plus"
            label={meds.length === 0 ? 'Add a medication' : 'Add another medication'}
            onPress={() => {
              const locked = canAdd ? null : gate('stack', isPro);
              if (locked) return showPaywall(locked);
              setEditing('new');
            }}
          />
          {!canAdd && (
            <View style={styles.proLine}>
              <ProMark theme={theme} />
              <Text style={[type.small, { color: theme.inkSoft, flex: 1 }]}>One medication is free. Pro keeps a stack of them, each with its own schedule and reminder.</Text>
            </View>
          )}
        </View>
      </ScrollView>
      <MedEditor med={editing} onClose={() => setEditing(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.l, gap: space.l },
  suggest: { marginTop: space.s },
  doseRow: { flexDirection: 'row', gap: space.m, alignItems: 'flex-end' },
  amount: { flex: 1 },
  unit: { flex: 1.6 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.m },
  stepValue: { flex: 1, textAlign: 'center' },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.m },
  change: { marginTop: space.m, gap: space.m },
  add: { gap: space.m },
  proLine: { flexDirection: 'row', gap: space.s, alignItems: 'center' },
});
