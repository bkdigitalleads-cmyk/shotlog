import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTheme, space, tabular, type } from '../theme';
import { useApp } from '../state';
import { addShot, deleteShot, updateShot } from '../db';
import { dayKey, timeLabel, whenShort } from '../days';
import { doseOn, medDueDay } from '../schedule';
import { nextSite, rotationLine, siteLabel } from '../sites';
import { DOSE_UNITS } from '../labels';
import type { DoseUnit, Med, Shot, Site } from '../model';
import { Button, Choice, Eyebrow, Field, LinkText, Tag, Tags } from '../ui/Kit';
import { Tray } from '../ui/Tray';
import BodyMap from '../ui/BodyMap';
import When from '../ui/When';
import { savedHaptic } from '../ui/motion';

export interface LogShotRequest {
  /** Editing a logged shot, or null for a new one. */
  shot: Shot | null;
  /** A new shot for this medication (else the one due soonest). */
  medId?: number | null;
  /** A shot from the past: the date and time show open, and it is marked as entered later. */
  past?: boolean;
  /** Start the date on this day (from History). */
  day?: string;
}

/** The medication due soonest among the active ones. */
export function soonestMed(active: Med[], shots: Shot[]): Med | null {
  let best: Med | null = null;
  let bestDue = '';
  for (const m of active) {
    const due = medDueDay(m, shots) ?? '9999-12-31';
    if (!best || due < bestDue) {
      best = m;
      bestDue = due;
    }
  }
  return best;
}

/**
 * The log sheet. One tap on Log shot opens it with the medication, its
 * current dose and the next site in the person's rotation already filled
 * in, so Save is the only tap needed. Everything can be changed; nothing
 * is checked or suggested about the dose.
 */
export default function LogShot({ request, onClose }: { request: LogShotRequest | null; onClose: (saved: Shot | null) => void }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { active, meds, shots, refresh, say } = useApp();
  const editing = request?.shot ?? null;
  const visible = request != null;

  const [medId, setMedId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<DoseUnit>('mg');
  const [site, setSite] = useState<Site | null>(null);
  const [at, setAt] = useState(Date.now());
  const [showWhen, setShowWhen] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // The other shots, oldest first, for the rotation (the one being edited left out).
  const history = useMemo(() => [...shots].filter((s) => s.id !== editing?.id).sort((a, b) => a.at - b.at), [shots, editing]);
  const lastSite = useMemo(() => {
    for (let i = history.length - 1; i >= 0; i--) if (history[i].site) return history[i].site;
    return null;
  }, [history]);
  const suggested = useMemo(() => nextSite(history.map((s) => s.site)), [history]);

  const prefillDose = (m: Med | undefined, when: number) => {
    const d = m ? doseOn(m.doses, dayKey(when)) : null;
    const prev = m ? shots.find((s) => s.medId === m.id) : undefined;
    setAmount(d?.amount ?? prev?.amount ?? '');
    setUnit(d?.unit ?? prev?.unit ?? 'mg');
  };

  useEffect(() => {
    if (!request) return;
    if (editing) {
      setMedId(editing.medId);
      setAmount(editing.amount);
      setUnit(editing.unit);
      setSite(editing.site);
      setAt(editing.at);
      setNote(editing.note);
      setShowWhen(true);
      return;
    }
    const m = (request.medId != null ? active.find((x) => x.id === request.medId) : null) ?? soonestMed(active, shots) ?? undefined;
    const when = request.day ? new Date(`${request.day}T09:00:00`).getTime() : Date.now();
    setMedId(m?.id ?? null);
    prefillDose(m, when);
    setSite(suggested);
    setAt(Math.min(when, Date.now()));
    setNote('');
    setShowWhen(!!request.past);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const med = meds.find((m) => m.id === medId);
  const medName = med?.name ?? editing?.medName ?? '';

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const fields = {
        medId: med ? med.id : null,
        medName,
        at,
        amount,
        unit,
        site,
        note: note.trim(),
        backfilled: editing ? editing.backfilled : !!request?.past || Date.now() - at > 60 * 60 * 1000,
      };
      let saved: Shot;
      if (editing) {
        await updateShot(editing.id, fields);
        saved = { ...editing, ...fields };
      } else {
        const id = await addShot(fields);
        saved = { id, createdAt: Date.now(), ...fields };
      }
      savedHaptic();
      await refresh();
      say(editing ? 'Changes saved.' : `Saved, ${whenShort(at, Date.now())}.`);
      onClose(saved);
    } catch {
      Alert.alert('That did not save', 'Try once more.');
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!editing) return;
    Alert.alert('Delete this shot?', `${medName}, ${whenShort(editing.at, Date.now())}. This cannot be undone.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteShot(editing.id);
          await refresh();
          say('Shot deleted.');
          onClose(null);
        },
      },
    ]);
  };

  const pickable = editing && editing.medId != null && !active.some((m) => m.id === editing.medId) ? [...active, ...meds.filter((m) => m.id === editing.medId)] : active;

  return (
    <Tray
      theme={theme}
      visible={visible}
      onClose={() => onClose(null)}
      title={editing ? 'Edit shot' : request?.past ? 'Add a past shot' : 'Log shot'}
      sub={showWhen ? undefined : `Now, ${timeLabel(at)}`}
      footer={
        <>
          <Button theme={theme} live label={busy ? 'Saving' : 'Save'} onPress={save} disabled={busy} />
          {editing ? <Button theme={theme} danger label="Delete this shot" glyph="trash" onPress={remove} compact /> : null}
        </>
      }
    >
      <View>
        <Eyebrow theme={theme}>Medication</Eyebrow>
        {pickable.length > 1 ? (
          <Tags>
            {pickable.map((m) => (
              <Tag
                key={m.id}
                theme={theme}
                label={m.name}
                on={medId === m.id}
                onPress={() => {
                  setMedId(m.id);
                  if (!editing) prefillDose(m, at);
                }}
              />
            ))}
          </Tags>
        ) : (
          <Text style={[type.title, { color: theme.ink }]} accessibilityLabel={`Medication: ${medName || 'none'}`}>
            {medName || 'No medication yet'}
          </Text>
        )}
      </View>

      <View>
        <Eyebrow theme={theme}>Dose</Eyebrow>
        <View style={styles.doseRow}>
          <Field theme={theme} label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="As prescribed" style={styles.amount} returnKeyType="done" />
          <View style={styles.unit}>
            <Text style={[type.small, { color: theme.inkSoft, marginBottom: space.xs }]}>Unit</Text>
            <Choice theme={theme} label="Unit" options={DOSE_UNITS} value={unit} onChange={setUnit} />
          </View>
        </View>
        <Text style={[type.small, { color: theme.inkFaint, marginTop: space.s }]}>As you typed it for this medication. The app never changes it.</Text>
      </View>

      <View>
        <Eyebrow theme={theme} right={site ? <Text style={[type.small, { color: theme.ink }]}>{siteLabel(site)}</Text> : null}>
          Site
        </Eyebrow>
        <BodyMap theme={theme} width={Math.min(width - space.l * 2, 420)} picked={site} last={lastSite} next={suggested} onPick={(s) => setSite(site === s ? null : s)} />
        <Text style={[type.small, styles.rotation, { color: theme.inkSoft }]}>{rotationLine(lastSite, suggested)}</Text>
      </View>

      <View>
        <Eyebrow theme={theme}>When</Eyebrow>
        {showWhen ? (
          <When theme={theme} label="Taken" value={at} onChange={setAt} max={Date.now()} />
        ) : (
          <View style={styles.nowRow}>
            <Text style={[type.body, { color: theme.ink }, tabular]}>Now, {timeLabel(at)}</Text>
            <LinkText theme={theme} label="Earlier" hint="Pick the date and time it was taken" onPress={() => setShowWhen(true)} />
          </View>
        )}
      </View>

      <Field theme={theme} label="Note (optional)" value={note} onChangeText={setNote} placeholder="Anything to remember" maxLength={200} />
    </Tray>
  );
}

const styles = StyleSheet.create({
  doseRow: { flexDirection: 'row', gap: space.m, alignItems: 'flex-end' },
  amount: { flex: 1 },
  unit: { flex: 1.6 },
  rotation: { marginTop: space.s },
  nowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
});
