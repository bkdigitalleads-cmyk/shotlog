import Constants from 'expo-constants';
import React, { useRef, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme, space, tabular, type } from '../theme';
import { useApp } from '../state';
import { deleteAllData, kvSet } from '../db';
import { atTime, dayKey, timeLabel } from '../days';
import { convertWeight, fmt1, round1, waterShown, waterStored } from '../insights';
import { TRACKS, WEIGHT_UNITS, waterUnit } from '../labels';
import { requestReminderPermission } from '../reminder';
import { shareCsv } from '../exporting';
import { gate } from '../gates';
import { PRIVACY_URL, SUPPORT_EMAIL, SUPPORT_URL, TERMS_URL } from '../links';
import type { WeightUnit } from '../model';
import { Choice, Eyebrow, Field, PageTitle, ProMark, Row, Rows, SwitchRow, Tag, Tags } from '../ui/Kit';
import When from '../ui/When';

/** The medical line, the same here, in the App Review note and on the website. */
export const ABOUT_LINE =
  'Shot Log is a personal log. It does not diagnose, treat, calculate doses or give medical advice. Follow your prescriber about your medication and your doses.';

/** Extra rows other parts of the app add (Pro and purchases, the CSV, test tools). */
export interface SettingsSlots {
  pro?: React.ReactNode;
  data?: React.ReactNode;
  testing?: (open: boolean) => React.ReactNode;
}

export default function SettingsScreen({ onMeds, slots = {} }: { onMeds: () => void; slots?: SettingsSlots }) {
  const theme = useTheme();
  const { settings, updateSettings, meds, shots, weights, feelings, isPro, showPaywall, refresh, testBuild, say } = useApp();
  const u = settings.weightUnit;
  // Test builds only: seven taps on the version line open the testing tools.
  const [testing, setTesting] = useState(false);
  const taps = useRef<{ count: number; at: number }>({ count: 0, at: 0 });
  const onVersionTap = () => {
    if (!testBuild) return;
    const now = Date.now();
    taps.current = { count: now - taps.current.at < 1500 ? taps.current.count + 1 : 1, at: now };
    if (taps.current.count >= 7) setTesting(true);
  };

  const onReminders = async (on: boolean) => {
    if (!on) return updateSettings({ reminders: false });
    const ok = await requestReminderPermission();
    if (!ok) {
      Alert.alert('Notifications are off for Shot Log', 'Turn them on in the iPhone Settings app, under Notifications, then switch this on again.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    await updateSettings({ reminders: true });
  };

  const setUnit = (next: WeightUnit) => {
    if (next === u) return;
    updateSettings({ weightUnit: next, weightGoal: settings.weightGoal != null ? round1(convertWeight(settings.weightGoal, u, next)) : null });
  };

  const askGoal = (what: 'protein' | 'water') => {
    const unit = what === 'protein' ? 'g' : waterUnit(u);
    const current = what === 'protein' ? settings.proteinGoal : settings.waterGoal != null ? Math.round(waterShown(settings.waterGoal, u)) : null;
    Alert.prompt(
      what === 'protein' ? 'Protein goal' : 'Water goal',
      `Your own number for a day, in ${unit}. Leave it empty for no goal.`,
      (text) => {
        const v = Number((text ?? '').replace(',', '.'));
        const value = text && Number.isFinite(v) && v > 0 ? v : null;
        if (what === 'protein') updateSettings({ proteinGoal: value });
        else updateSettings({ waterGoal: value != null ? waterStored(value, u) : null });
      },
      'plain-text',
      current != null ? String(current) : '',
      'decimal-pad'
    );
  };

  const onDeleteAll = () => {
    Alert.alert('Delete everything?', 'Every shot, medication, weight, entry and counter on this iPhone. Your purchases stay. This cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete everything',
        style: 'destructive',
        onPress: async () => {
          await deleteAllData();
          await refresh();
          say('Everything was deleted.');
        },
      },
    ]);
  };

  const mail = () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Shot Log')}`;
    Linking.openURL(url).catch(() => Alert.alert('Email support', SUPPORT_EMAIL));
  };

  const version = `${Constants.expoConfig?.version ?? '1.0.0'} (${Constants.expoConfig?.ios?.buildNumber ?? '1'})`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <PageTitle theme={theme} title="Settings" />
      <ScrollView contentContainerStyle={styles.page}>
        {slots.pro}

        <View>
          <Eyebrow theme={theme}>Medications</Eyebrow>
          <Rows theme={theme}>
            <Row theme={theme} glyph="vial" label="My medications" sub={meds.length ? meds.map((m) => m.name).join(', ') : 'None yet'} onPress={onMeds} />
          </Rows>
        </View>

        <View>
          <Eyebrow theme={theme}>Reminders</Eyebrow>
          <Rows theme={theme}>
            <SwitchRow theme={theme} label="Shot reminders" sub="On the due day. Remind me in an hour snoozes it." value={settings.reminders} onChange={onReminders} />
            {settings.reminders ? (
              <View style={styles.inset}>
                <When
                  theme={theme}
                  label="At"
                  timeOnly
                  value={atTime(dayKey(Date.now()), Math.floor(settings.reminderMinutes / 60), settings.reminderMinutes % 60)}
                  onChange={(ms) => {
                    const d = new Date(ms);
                    updateSettings({ reminderMinutes: d.getHours() * 60 + d.getMinutes() });
                  }}
                />
              </View>
            ) : null}
          </Rows>
          {settings.reminders ? (
            <Text style={[type.small, styles.note, { color: theme.inkSoft }, tabular]}>
              {`At ${timeLabel(atTime(dayKey(Date.now()), Math.floor(settings.reminderMinutes / 60), settings.reminderMinutes % 60))} on each due day, for the medications that have reminders on.`}
            </Text>
          ) : null}
        </View>

        <View>
          <Eyebrow theme={theme}>Units and goals</Eyebrow>
          <Rows theme={theme}>
            <View style={styles.inset}>
              <Choice theme={theme} label="Weight unit" options={WEIGHT_UNITS} value={u} onChange={setUnit} />
            </View>
            <Row
              theme={theme}
              label="Weight goal"
              value={settings.weightGoal != null ? `${fmt1(settings.weightGoal)} ${u}` : 'None'}
              onPress={() =>
                Alert.prompt(
                  'Weight goal',
                  `Your own goal, in ${u}. Leave it empty for none.`,
                  (t) => {
                    const v = Number((t ?? '').replace(',', '.'));
                    updateSettings({ weightGoal: t && Number.isFinite(v) && v > 0 ? v : null });
                  },
                  'plain-text',
                  settings.weightGoal != null ? fmt1(settings.weightGoal) : '',
                  'decimal-pad'
                )
              }
            />
            <Row theme={theme} label="Protein goal" value={settings.proteinGoal != null ? `${Math.round(settings.proteinGoal)} g` : 'None'} onPress={() => askGoal('protein')} />
            <Row theme={theme} label="Water goal" value={settings.waterGoal != null ? `${Math.round(waterShown(settings.waterGoal, u))} ${waterUnit(u)}` : 'None'} onPress={() => askGoal('water')} />
            <SwitchRow theme={theme} label="Protein and water on Today" value={settings.showIntake} onChange={(showIntake) => updateSettings({ showIntake })} />
          </Rows>
          <Text style={[type.small, styles.note, { color: theme.inkSoft }]}>Goals are yours to set. The app suggests none.</Text>
        </View>

        <View>
          <Eyebrow theme={theme}>What you are tracking</Eyebrow>
          <Tags>
            {TRACKS.map((t) => (
              <Tag key={t.id} theme={theme} label={t.label} on={settings.track === t.id} onPress={() => updateSettings({ track: t.id })} />
            ))}
          </Tags>
        </View>

        <View>
          <Eyebrow theme={theme}>The report</Eyebrow>
          <Field theme={theme} label="Your name on the report (optional)" value={settings.patientName} onChangeText={(patientName) => updateSettings({ patientName })} placeholder="Left blank, it prints a line to write on" maxLength={80} autoCapitalize="words" />
        </View>

        <View>
          <Eyebrow theme={theme}>Your data</Eyebrow>
          <Rows theme={theme}>
            {slots.data}
            <Row
              theme={theme}
              glyph="table"
              label="Export CSV"
              sub="Every shot, weight and side effect"
              right={isPro ? undefined : <ProMark theme={theme} />}
              onPress={async () => {
                const locked = gate('csv', isPro);
                if (locked) return showPaywall(locked);
                await shareCsv({ shots, weights, feelings }).catch(() => say('The CSV did not open. Try once more.'));
              }}
            />
            <Row theme={theme} glyph="trash" danger label="Delete everything" onPress={onDeleteAll} chevron={false} />
          </Rows>
          <Text style={[type.small, styles.note, { color: theme.inkSoft }]}>Everything stays on this iPhone. No account, nothing uploaded.</Text>
        </View>

        <View>
          <Eyebrow theme={theme}>Help</Eyebrow>
          <Rows theme={theme}>
            <Row theme={theme} glyph="mail" label="Email support" sub={SUPPORT_EMAIL} onPress={mail} />
            <Row theme={theme} glyph="page" label="Help and questions" onPress={() => Linking.openURL(SUPPORT_URL)} />
            <Row theme={theme} glyph="shield" label="Privacy policy" onPress={() => Linking.openURL(PRIVACY_URL)} />
            <Row theme={theme} glyph="report" label="Terms of Use (EULA)" onPress={() => Linking.openURL(TERMS_URL)} />
          </Rows>
        </View>

        <View>
          <Eyebrow theme={theme}>About</Eyebrow>
          <Text style={[type.body, { color: theme.inkSoft }]}>{ABOUT_LINE}</Text>
          <Text style={[type.small, styles.version, { color: theme.inkFaint }, tabular]} onPress={onVersionTap} accessibilityLabel={`Version ${version}`}>
            Shot Log {version}
          </Text>
        </View>

        {slots.testing?.(testing)}
      </ScrollView>
    </View>
  );
}

/** Kept for the testing tools: puts the first-run flow back to before the first shot. */
export async function resetFirstRun(): Promise<void> {
  await kvSet('flow.afterFirstShot', 'pending');
  await kvSet('flow.paywallSecondChance', '');
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.l, paddingTop: space.s, paddingBottom: space.xxl, gap: space.xxl },
  inset: { paddingHorizontal: space.l, paddingVertical: space.s },
  note: { marginTop: space.s },
  version: { marginTop: space.l, paddingVertical: space.s },
});
