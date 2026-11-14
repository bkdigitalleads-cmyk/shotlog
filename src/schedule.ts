/**
 * When the next shot is due, and which dose is current, as pure functions
 * checked by `npm test`. Days are local "YYYY-MM-DD" keys (src/days.ts), so
 * daylight saving never shifts a due day.
 *
 * Two schedules:
 *  - every N days: due N days after the last shot's day (a late shot moves
 *    the next one with it, the way people count it)
 *  - chosen weekdays: a shot counts for the chosen day nearest to it (a
 *    weekly Thursday shot taken on Wednesday still counts for Thursday),
 *    and the next one is the chosen day after that.
 * Before the first shot, the start date is the due day.
 *
 * Dose changes never move the schedule; they only change which dose is
 * prefilled. The app never suggests, checks or calculates a dose.
 */
import type { Dose, DoseChange, Med, Schedule, Shot } from './model';
import { addDays, atTime, dayKey, daysBetween, shortDate, weekdayMon, weekdayName, weekdayShort } from './days.ts';

/** The dose in effect on a day: the newest change on or before it, else the first one. Null when none was typed. */
export function doseOn(doses: DoseChange[], day: string): Dose | null {
  if (doses.length === 0) return null;
  const sorted = [...doses].sort((a, b) => (a.fromDay < b.fromDay ? -1 : a.fromDay > b.fromDay ? 1 : a.id - b.id));
  let pick = sorted[0];
  for (const d of sorted) if (d.fromDay <= day) pick = d;
  return { amount: pick.amount, unit: pick.unit };
}

/** "0.5 mg" */
export function doseLabel(d: Dose | null | undefined): string {
  if (!d || !d.amount.trim()) return '';
  return `${d.amount.trim()} ${d.unit}`;
}

/** This medication's newest shot, or null. */
export function lastShotFor(medId: number, shots: Shot[]): Shot | null {
  let best: Shot | null = null;
  for (const s of shots) if (s.medId === medId && (!best || s.at > best.at)) best = s;
  return best;
}

function isChosen(day: string, days: number[]): boolean {
  return days.includes(weekdayMon(day));
}

/** The first chosen weekday on or after `from` (within a week), or null when no weekday is chosen. */
function nextChosen(from: string, days: number[], strictlyAfter = false): string | null {
  if (days.length === 0) return null;
  for (let i = strictlyAfter ? 1 : 0; i <= 7 + (strictlyAfter ? 1 : 0); i++) {
    const d = addDays(from, i);
    if (isChosen(d, days)) return d;
  }
  return null;
}

function prevChosen(from: string, days: number[]): string | null {
  if (days.length === 0) return null;
  for (let i = 0; i <= 7; i++) {
    const d = addDays(from, -i);
    if (isChosen(d, days)) return d;
  }
  return null;
}

/** The chosen day a shot on `day` counts for: that day, else the nearest chosen day (a tie goes to the later one). */
export function coveredDay(day: string, days: number[]): string | null {
  const prev = prevChosen(day, days);
  const next = nextChosen(day, days);
  if (!prev || !next) return prev ?? next;
  if (prev === day) return day;
  return daysBetween(prev, day) < daysBetween(day, next) ? prev : next;
}

/** The day the next shot is due, from the schedule, the start day and the last shot's day. Null for a weekday schedule with no day chosen. */
export function nextDueDay(schedule: Schedule, startDay: string, lastShotDay: string | null): string | null {
  if (schedule.kind === 'interval') {
    const n = Math.max(1, Math.round(schedule.everyDays));
    return lastShotDay ? addDays(lastShotDay, n) : startDay;
  }
  const days = schedule.days;
  if (!lastShotDay) return nextChosen(startDay, days);
  const covered = coveredDay(lastShotDay, days);
  if (!covered) return null;
  const next = nextChosen(covered, days, true);
  if (!next) return null;
  // Never before the start day (a medication restarted with a later start).
  return next < startDay ? nextChosen(startDay, days) : next;
}

/** The next due day for a medication, given every logged shot. */
export function medDueDay(med: Pick<Med, 'id' | 'schedule' | 'startDay'>, shots: Shot[]): string | null {
  const last = lastShotFor(med.id, shots);
  return nextDueDay(med.schedule, med.startDay, last ? dayKey(last.at) : null);
}

/**
 * The next-due line on Home: "Due today", "Due tomorrow", "Due Thursday"
 * (with "In 3 days" under it), "Due Nov 30", or for a missed day, "Was due
 * yesterday" and "Was due 3 days ago". Plain words, no alarm.
 */
export function dueText(due: string, today: string): { title: string; sub: string; overdue: boolean; days: number } {
  const n = daysBetween(today, due);
  const date = `${weekdayShort(due)}, ${shortDate(due)}`;
  if (n === 0) return { title: 'Due today', sub: date, overdue: false, days: 0 };
  if (n === 1) return { title: 'Due tomorrow', sub: date, overdue: false, days: 1 };
  if (n > 1 && n < 7) return { title: `Due ${weekdayName(due)}`, sub: `In ${n} days, ${shortDate(due)}`, overdue: false, days: n };
  if (n >= 7) return { title: `Due ${shortDate(due)}`, sub: `In ${n} days`, overdue: false, days: n };
  if (n === -1) return { title: 'Was due yesterday', sub: date, overdue: true, days: n };
  return { title: `Was due ${-n} days ago`, sub: date, overdue: true, days: n };
}

/** "Every 7 days", "Every day", "Mon and Thu", "Every Thursday". */
export function scheduleLabel(s: Schedule): string {
  if (s.kind === 'interval') {
    const n = Math.max(1, Math.round(s.everyDays));
    if (n === 1) return 'Every day';
    if (n === 7) return 'Every 7 days';
    return `Every ${n} days`;
  }
  const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const short = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = [...new Set(s.days)].filter((d) => d >= 0 && d <= 6).sort();
  if (days.length === 0) return 'No day chosen';
  if (days.length === 7) return 'Every day';
  if (days.length === 1) return `Every ${names[days[0]]}`;
  const list = days.map((d) => short[d]);
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

/** Minutes after midnight for the reminder; 9 am unless the person picks another time. */
export const DEFAULT_REMINDER_MINUTES = 9 * 60;

/**
 * When the "Shot due today" reminder fires: the due day at the chosen time.
 * Null when that moment has passed (a missed day is not nagged about) or
 * there is no due day.
 */
export function reminderAt(due: string | null, minutes: number, now: number): number | null {
  if (!due) return null;
  const at = atTime(due, Math.floor(minutes / 60), minutes % 60);
  return at > now ? at : null;
}

/** Snooze: one hour from the moment it is asked for. */
export const SNOOZE_MS = 60 * 60 * 1000;
