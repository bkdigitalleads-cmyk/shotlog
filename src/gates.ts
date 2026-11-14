/**
 * What is free and what is Pro, as pure functions checked by `npm test`.
 *
 * Free forever: logging shots for one medication (and editing them,
 * backfilled ones too), the next-due line, one reminder, weight entry, how
 * I feel, and the last 30 days of history. Pro: more than one medication
 * (the stack), trends, patterns, site history, protein and water, the
 * doctor report and the CSV (free users see a SAMPLE preview that cannot
 * be shared or printed), and history older than 30 days. Logging a shot is
 * never behind the paywall.
 */
import { addDays, dayKey, dayStart } from './days.ts';

export const FREE_HISTORY_DAYS = 30;
export const FREE_MEDS = 1;

/** The start of the free history: local midnight 29 days before today. */
export function historyCutoff(now: number): number {
  return dayStart(addDays(dayKey(now), -(FREE_HISTORY_DAYS - 1)));
}

/** Entries (shots, weights, feelings) to list, and how many older ones Pro would show. */
export function visibleEntries<T extends { at: number }>(items: T[], now: number, isPro: boolean): { shown: T[]; hidden: number } {
  if (isPro) return { shown: items, hidden: 0 };
  const cut = historyCutoff(now);
  const shown = items.filter((i) => i.at >= cut);
  return { shown, hidden: items.length - shown.length };
}

/** Whether a day (YYYY-MM-DD) is inside what a free user sees. */
export function canSeeDay(day: string, now: number, isPro: boolean): boolean {
  return isPro || dayStart(day) >= historyCutoff(now);
}

/** One medication free; a second one (the stack) is Pro. Editing the ones already there is always free. */
export function canAddMed(medCount: number, isPro: boolean): boolean {
  return isPro || medCount < FREE_MEDS;
}

/**
 * The medications a free user logs and is reminded for: the first in the
 * list. (Someone whose Pro ended keeps all their medications and shots;
 * only the first stays active until Pro is back.)
 */
export function activeMeds<T extends { position: number; id: number }>(meds: T[], isPro: boolean): T[] {
  const sorted = [...meds].sort((a, b) => a.position - b.position || a.id - b.id);
  return isPro ? sorted : sorted.slice(0, FREE_MEDS);
}

export type ProFeature = 'stack' | 'trends' | 'patterns' | 'sites' | 'intake' | 'report' | 'csv' | 'history';

/** Null when it can be used now, else the feature, which is also why the paywall opens. */
export function gate(feature: ProFeature, isPro: boolean): ProFeature | null {
  return isPro ? null : feature;
}

/** Logging a shot never waits on Pro. Kept as a function so a check guards the promise. */
export function canLogShot(_isPro: boolean): true {
  return true;
}

/** The report preview opens for everyone; sharing and printing are Pro. */
export function reportAccess(isPro: boolean): { preview: true; share: boolean; sample: boolean } {
  return { preview: true, share: isPro, sample: !isPro };
}
