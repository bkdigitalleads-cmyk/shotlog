import React, { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { useTheme, space, tabular, type } from '../theme';
import { useApp } from '../state';
import { atTime, dayKey, daysBetween, timeLabel, weekdayName } from '../days';
import { requestReminderPermission } from '../reminder';
import { medDueDay } from '../schedule';
import { soonestMed } from './LogShot';
import { Button } from '../ui/Kit';
import { Tray } from '../ui/Tray';

/**
 * Asked once, right after the first shot is saved: "Remind you when the
 * next one is due?" Turn on asks iOS; Not now leaves reminders off (they
 * can be turned on in Settings later). Either answer closes it.
 */
export default function ReminderAsk({ visible, onDone }: { visible: boolean; onDone: (on: boolean) => void }) {
  const theme = useTheme();
  const { active, shots, settings, updateSettings } = useApp();
  const [busy, setBusy] = useState(false);
  const med = soonestMed(active, shots);
  const due = med ? medDueDay(med, shots) : null;
  const today = dayKey(Date.now());
  const when = due
    ? `${daysBetween(today, due) === 1 ? 'Tomorrow' : daysBetween(today, due) < 7 ? `On ${weekdayName(due)}` : 'On the due day'} at ${timeLabel(atTime(due, Math.floor(settings.reminderMinutes / 60), settings.reminderMinutes % 60))}`
    : 'On each due day';

  const turnOn = async () => {
    setBusy(true);
    const ok = await requestReminderPermission();
    await updateSettings({ reminders: ok });
    setBusy(false);
    onDone(ok);
  };

  return (
    <Tray theme={theme} visible={visible} onClose={() => onDone(false)} title="Remind you when the next one is due?">
      <View style={styles.body}>
        <Text style={[type.body, { color: theme.ink }, tabular]}>{when}, on this iPhone. One notification, and a button on it to snooze for an hour.</Text>
        <Text style={[type.small, { color: theme.inkSoft }]}>You can change the time or turn it off in Settings.</Text>
      </View>
      <View style={styles.buttons}>
        <Button theme={theme} live label={busy ? 'One moment' : 'Turn on reminders'} onPress={turnOn} disabled={busy} />
        <Button theme={theme} label="Not now" onPress={() => onDone(false)} disabled={busy} />
      </View>
    </Tray>
  );
}

/** For a person who said no to iOS earlier: where to turn notifications back on. */
export function openNotificationSettings(): void {
  Linking.openSettings().catch(() => {});
}

const styles = StyleSheet.create({
  body: { gap: space.s },
  buttons: { gap: space.s },
});
