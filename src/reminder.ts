/**
 * Local notifications only; nothing comes from a server, and the app has
 * no push entitlement (plugins/withoutPushEntitlement.js).
 *  - "Shot due today", on each active medication's due day at the chosen
 *    time, rescheduled whenever a shot, a medication or a setting changes.
 *    A "Remind me in an hour" button on it snoozes.
 *  - "Your free trial ends tomorrow" (the engine's), only once a free
 *    trial has started.
 */
import * as Notifications from 'expo-notifications';
import Purchases from 'react-native-purchases';
import { ENTITLEMENT_ID, isBillingAvailable } from './purchases';
import { trialReminderAt } from './offer';
import { medDueDay, reminderAt, SNOOZE_MS } from './schedule';
import type { Med, Shot } from './model';

const TRIAL_ID = 'shotlog.trialReminder';
const DUE_PREFIX = 'shotlog.due.';
const SNOOZE_PREFIX = 'shotlog.snooze.';
export const DUE_CATEGORY = 'shot-due';
export const SNOOZE_ACTION = 'snooze';

// If the app happens to be open when one fires, still show it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let categoryReady: Promise<unknown> | null = null;
/** The "Remind me in an hour" button on the due notification. It opens the app, which schedules the snooze. */
function ensureCategory(): Promise<unknown> {
  if (!categoryReady) {
    categoryReady = Notifications.setNotificationCategoryAsync(DUE_CATEGORY, [
      { identifier: SNOOZE_ACTION, buttonTitle: 'Remind me in an hour', options: { opensAppToForeground: true } },
    ]).catch(() => null);
  }
  return categoryReady;
}

/** True when notifications are allowed. Asks only if iOS has not asked yet. Never throws. */
export async function requestReminderPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const res = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return res.granted;
  } catch {
    return false;
  }
}

async function cancelPrefixed(prefix: string, keep: Set<string> = new Set()): Promise<void> {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.identifier.startsWith(prefix) && !keep.has(n.identifier)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  } catch {
    // notifications unavailable
  }
}

const dueBody = 'Log it in Shot Log when you are ready.';

/**
 * One "Shot due today" per active medication with reminders on, at its due
 * day and the chosen time. Free users have one active medication, so one
 * reminder. Anything else of ours is cancelled. A logged shot also clears
 * that medication's snooze.
 */
export async function syncShotReminders(active: Med[], shots: Shot[], settings: { reminders: boolean; reminderMinutes: number }): Promise<void> {
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!settings.reminders || !perm.granted) {
      await cancelPrefixed(DUE_PREFIX);
      await cancelPrefixed(SNOOZE_PREFIX);
      return;
    }
    await ensureCategory();
    const now = Date.now();
    const keep = new Set<string>();
    for (const med of active) {
      if (!med.remind) continue;
      const at = reminderAt(medDueDay(med, shots), settings.reminderMinutes, now);
      if (at == null) continue;
      const id = DUE_PREFIX + med.id;
      keep.add(id);
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: { title: 'Shot due today', body: dueBody, categoryIdentifier: DUE_CATEGORY, data: { medId: med.id } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
      });
    }
    await cancelPrefixed(DUE_PREFIX, keep);
    // A snooze for a medication whose shot is now logged today is no longer needed.
    for (const med of active) {
      const last = shots.find((s) => s.medId === med.id);
      if (last && now - last.at < SNOOZE_MS * 2) await cancelPrefixed(SNOOZE_PREFIX + med.id);
    }
  } catch {
    // never let reminder plumbing get in the way of logging
  }
}

/** "Remind me in an hour": one more notification an hour from now. Returns when it will fire, or null. */
export async function snooze(medId: number | null): Promise<number | null> {
  try {
    await ensureCategory();
    const at = Date.now() + SNOOZE_MS;
    await Notifications.scheduleNotificationAsync({
      identifier: SNOOZE_PREFIX + (medId ?? 0),
      content: { title: 'Shot due today', body: dueBody, categoryIdentifier: DUE_CATEGORY, data: { medId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
    return at;
  } catch {
    return null;
  }
}

/** Calls back when the person taps "Remind me in an hour" (also after a cold start from it). */
export function onSnoozeTapped(cb: (medId: number | null) => void): () => void {
  const handle = (r: Notifications.NotificationResponse | null) => {
    if (!r || r.actionIdentifier !== SNOOZE_ACTION) return;
    const medId = r.notification.request.content.data?.medId;
    cb(typeof medId === 'number' ? medId : null);
  };
  Notifications.getLastNotificationResponseAsync()
    .then((r) => {
      handle(r);
      if (r) Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
    })
    .catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}

// ---------- the trial reminder (the engine's) ----------

interface TrialState {
  active: boolean;
  willRenew: boolean;
  expiresMs: number | null;
}

/** The pro entitlement's trial state, or null when RevenueCat can't answer (offline, not configured). */
async function getTrialState(): Promise<TrialState | null> {
  if (!isBillingAvailable()) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    const ent = info.entitlements.active[ENTITLEMENT_ID];
    if (!ent || ent.periodType !== 'TRIAL') return { active: false, willRenew: false, expiresMs: null };
    const expiresMs = ent.expirationDate ? Date.parse(ent.expirationDate) : NaN;
    return { active: true, willRenew: ent.willRenew, expiresMs: Number.isFinite(expiresMs) ? expiresMs : null };
  } catch {
    return null;
  }
}

/**
 * After a successful purchase: if it started a free trial and notifications
 * are allowed, schedule the reminder for 1 day before the trial ends.
 * Returns true when a reminder was scheduled. Never asks for permission.
 */
export async function scheduleTrialReminderIfTrial(): Promise<boolean> {
  const trial = await getTrialState();
  if (!trial?.active || !trial.willRenew) return false;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return false;
    await cancelTrialReminder();
    await Notifications.scheduleNotificationAsync({
      identifier: TRIAL_ID,
      content: {
        title: 'Your free trial ends tomorrow',
        body: 'Shot Log Pro renews tomorrow. Cancel anytime in Settings, Apple ID, Subscriptions.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trialReminderAt(trial.expiresMs, Date.now()),
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelTrialReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(TRIAL_ID);
  } catch {
    // nothing scheduled, or notifications unavailable
  }
}

/**
 * Foreground check: drop the trial reminder once the trial is over, or has
 * been cancelled (it would no longer renew). An unknown answer leaves it alone.
 */
export async function syncTrialReminder(): Promise<void> {
  const trial = await getTrialState();
  if (trial && (!trial.active || !trial.willRenew)) await cancelTrialReminder();
}
