import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTheme, space, tabular, type } from '../theme';
import { useApp } from '../state';
import { addFeeling, addWeight, deleteFeeling, deleteWeight, updateFeeling, updateWeight } from '../db';
import { timeLabel, whenShort } from '../days';
import { convertWeight, daysSinceShot, fmt1, latestWeight, sinceLabel } from '../insights';
import { FEELINGS, LEVELS, feelingLabel, waistUnit } from '../labels';
import type { Feeling, FeelingEntry, Level, Weight } from '../model';
import { Button, Choice, Eyebrow, Field, Figure, LinkText, Tag, Tags } from '../ui/Kit';
import { Tray } from '../ui/Tray';
import When from '../ui/When';
import { savedHaptic } from '../ui/motion';

/** Parses a typed number ("182.4" or "182,4"); null when it is not one. */
export function parseNumber(s: string): number | null {
  const v = Number(s.replace(',', '.').trim());
  return s.trim() && Number.isFinite(v) && v > 0 ? v : null;
}

function startAt(day?: string): number {
  return day ? Math.min(new Date(`${day}T08:00:00`).getTime(), Date.now()) : Date.now();
}

function NowOrEarlier({ at, setAt, open, setOpen, label }: { at: number; setAt: (v: number) => void; open: boolean; setOpen: (v: boolean) => void; label: string }) {
  const theme = useTheme();
  if (open) return <When theme={theme} label={label} value={at} onChange={setAt} max={Date.now()} />;
  return (
    <View style={styles.nowRow}>
      <Text style={[type.body, { color: theme.ink }, tabular]}>Now, {timeLabel(at)}</Text>
      <LinkText theme={theme} label="Earlier" hint="Pick the date and time" onPress={() => setOpen(true)} />
    </View>
  );
}

export interface EntryRequest<T> {
  entry: T | null;
  /** A new entry on this past day (from History). */
  day?: string;
}

/** Weight: quick entry, an optional waist, and the goal the person sets. */
export function WeightTray({ request, onClose }: { request: EntryRequest<Weight> | null; onClose: () => void }) {
  const theme = useTheme();
  const { settings, updateSettings, weights, refresh, say } = useApp();
  const u = settings.weightUnit;
  const editing = request?.entry ?? null;
  const [value, setValue] = useState('');
  const [waist, setWaist] = useState('');
  const [at, setAt] = useState(Date.now());
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState('');
  const [goalOpen, setGoalOpen] = useState(false);
  const last = latestWeight(weights, u);

  useEffect(() => {
    if (!request) return;
    if (editing) {
      setValue(fmt1(convertWeight(editing.value, editing.unit, u)));
      setWaist(editing.waist != null ? String(editing.waist) : '');
      setAt(editing.at);
      setOpen(true);
    } else {
      setValue('');
      setWaist('');
      setAt(startAt(request.day));
      setOpen(!!request.day);
    }
    setGoal(settings.weightGoal ? fmt1(settings.weightGoal) : '');
    setGoalOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const v = parseNumber(value);
  const save = async () => {
    if (v == null) return;
    const w = waist.trim() ? parseNumber(waist) : null;
    try {
      if (editing) await updateWeight(editing.id, at, v, u, w);
      else await addWeight(at, v, u, w);
      if (goalOpen) await updateSettings({ weightGoal: parseNumber(goal) });
      savedHaptic();
      await refresh();
      say(`Saved, ${fmt1(v)} ${u}.`);
      onClose();
    } catch {
      Alert.alert('That did not save', 'Try once more.');
    }
  };

  const remove = () => {
    if (!editing) return;
    Alert.alert('Delete this weight?', `${fmt1(convertWeight(editing.value, editing.unit, u))} ${u}, ${whenShort(editing.at, Date.now())}.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWeight(editing.id);
          await refresh();
          onClose();
        },
      },
    ]);
  };

  return (
    <Tray
      theme={theme}
      visible={request != null}
      onClose={onClose}
      title={editing ? 'Edit weight' : 'Weight'}
      sub={last && !editing ? `Last: ${fmt1(last.value)} ${u}, ${whenShort(last.at, Date.now())}` : undefined}
      footer={
        <>
          <Button theme={theme} live label="Save" onPress={save} disabled={v == null} />
          {editing ? <Button theme={theme} danger compact glyph="trash" label="Delete this weight" onPress={remove} /> : null}
        </>
      }
    >
      <View style={styles.pair}>
        <Field theme={theme} label="Weight" value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder={last ? fmt1(last.value) : '0.0'} suffix={u} style={styles.grow} autoFocus={!editing} />
        <Field theme={theme} label="Waist (optional)" value={waist} onChangeText={setWaist} keyboardType="decimal-pad" placeholder="" suffix={waistUnit(u)} style={styles.grow} />
      </View>
      <NowOrEarlier at={at} setAt={setAt} open={open} setOpen={setOpen} label="Weighed" />
      <View>
        <Eyebrow theme={theme}>Goal</Eyebrow>
        {goalOpen ? (
          <Field theme={theme} label="Your goal (optional)" value={goal} onChangeText={setGoal} keyboardType="decimal-pad" placeholder="None" suffix={u} />
        ) : (
          <View style={styles.nowRow}>
            {settings.weightGoal ? <Figure theme={theme} value={fmt1(settings.weightGoal)} unit={u} size="title" label="Your goal" /> : <Text style={[type.body, { color: theme.inkSoft }]}>No goal set</Text>}
            <LinkText theme={theme} label={settings.weightGoal ? 'Change' : 'Set a goal'} onPress={() => setGoalOpen(true)} />
          </View>
        )}
      </View>
    </Tray>
  );
}

/** How I feel: one-tap chips with mild, moderate or strong, against days since the last shot. */
export function FeelTray({ request, onClose }: { request: EntryRequest<FeelingEntry> | null; onClose: () => void }) {
  const theme = useTheme();
  const { shots, refresh, say } = useApp();
  const editing = request?.entry ?? null;
  const [kinds, setKinds] = useState<Feeling[]>([]);
  const [level, setLevel] = useState<Level>('mild');
  const [note, setNote] = useState('');
  const [at, setAt] = useState(Date.now());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!request) return;
    if (editing) {
      setKinds([editing.kind]);
      setLevel(editing.level);
      setNote(editing.note);
      setAt(editing.at);
      setOpen(true);
    } else {
      setKinds([]);
      setLevel('mild');
      setNote('');
      setAt(startAt(request.day));
      setOpen(!!request.day);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const since = useMemo(() => daysSinceShot(at, shots), [at, shots]);

  const toggle = (k: Feeling) => {
    if (editing) return setKinds([k]);
    setKinds(kinds.includes(k) ? kinds.filter((x) => x !== k) : [...kinds, k]);
  };

  const save = async () => {
    if (kinds.length === 0) return;
    try {
      if (editing) await updateFeeling(editing.id, at, kinds[0], level, note.trim());
      else for (const k of kinds) await addFeeling(at, k, level, note.trim());
      savedHaptic();
      await refresh();
      say(kinds.length === 1 ? `Saved: ${feelingLabel(kinds[0]).toLowerCase()}, ${level}.` : `Saved ${kinds.length} entries.`);
      onClose();
    } catch {
      Alert.alert('That did not save', 'Try once more.');
    }
  };

  const remove = () => {
    if (!editing) return;
    Alert.alert('Delete this entry?', `${feelingLabel(editing.kind)}, ${whenShort(editing.at, Date.now())}.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFeeling(editing.id);
          await refresh();
          onClose();
        },
      },
    ]);
  };

  return (
    <Tray
      theme={theme}
      visible={request != null}
      onClose={onClose}
      title={editing ? 'Edit entry' : 'How I feel'}
      sub={since == null ? 'Before your first logged shot' : since === 0 ? 'The day of your last shot' : `${sinceLabel(since)} your last shot`}
      footer={
        <>
          <Button theme={theme} live label="Save" onPress={save} disabled={kinds.length === 0} />
          {editing ? <Button theme={theme} danger compact glyph="trash" label="Delete this entry" onPress={remove} /> : null}
        </>
      }
    >
      <View>
        <Eyebrow theme={theme}>{editing ? 'What' : 'Tap any that apply'}</Eyebrow>
        <Tags>
          {FEELINGS.map((f) => (
            <Tag key={f.id} theme={theme} label={f.label} on={kinds.includes(f.id)} onPress={() => toggle(f.id)} />
          ))}
        </Tags>
      </View>
      <View>
        <Eyebrow theme={theme}>How strong</Eyebrow>
        <Choice theme={theme} label="How strong" options={LEVELS} value={level} onChange={setLevel} />
      </View>
      <NowOrEarlier at={at} setAt={setAt} open={open} setOpen={setOpen} label="When" />
      <Field theme={theme} label="Note (optional)" value={note} onChangeText={setNote} placeholder="Anything to remember" maxLength={200} />
    </Tray>
  );
}

const styles = StyleSheet.create({
  nowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  pair: { flexDirection: 'row', gap: space.m },
  grow: { flex: 1 },
});
