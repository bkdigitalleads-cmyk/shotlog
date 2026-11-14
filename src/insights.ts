/**
 * Weight, how I feel, and protein and water, as pure functions checked by
 * `npm test`. Counts and averages only: no advice, no predictions, no
 * estimated drug levels, no targets the person did not set.
 */
import type { FeelingEntry, Intake, Shot, Weight, WeightUnit } from './model';
import { addDays, dayKey, daysBetween } from './days.ts';

const LB_PER_KG = 2.2046226218;

/** Weight in another unit (weights only; the app never converts doses). */
export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;
  return from === 'kg' ? value * LB_PER_KG : value / LB_PER_KG;
}

/** One decimal, the way scales show it. */
export function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** "182.4" (no unit), always one decimal so columns line up. */
export function fmt1(v: number): string {
  return round1(v).toFixed(1);
}

/** "+1.2", "-0.8", "0.0" for a change. */
export function signed1(v: number): string {
  const r = round1(v);
  if (r === 0) return '0.0';
  return `${r > 0 ? '+' : '-'}${Math.abs(r).toFixed(1)}`;
}

export interface WeightPoint {
  day: string;
  /** In the unit asked for; the average when a day has more than one entry. */
  value: number;
}

/** One point per day, oldest first, each the day's average. */
export function dailyWeights(weights: Weight[], unit: WeightUnit): WeightPoint[] {
  const byDay = new Map<string, number[]>();
  for (const w of weights) {
    const d = dayKey(w.at);
    const list = byDay.get(d) ?? [];
    list.push(convertWeight(w.value, w.unit, unit));
    byDay.set(d, list);
  }
  return [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([day, vs]) => ({ day, value: vs.reduce((s, v) => s + v, 0) / vs.length }));
}

/** The days from `days - 1` days before today up to today. */
export function inLastDays(points: WeightPoint[], days: number, today: string): WeightPoint[] {
  const from = addDays(today, -(days - 1));
  return points.filter((p) => p.day >= from && p.day <= today);
}

/**
 * Average change per week across the points: the slope of the best-fit
 * line through them, times 7. Null with fewer than two days or when they
 * span less than a week (too short to say per week).
 */
export function weeklyChange(points: WeightPoint[]): number | null {
  if (points.length < 2) return null;
  const x0 = points[0].day;
  const xs = points.map((p) => daysBetween(x0, p.day));
  if (xs[xs.length - 1] - xs[0] < 7) return null;
  const n = points.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = points.reduce((s, p) => s + p.value, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (points[i].value - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? null : (num / den) * 7;
}

/**
 * Total change since the first shot: from the weight on the first shot's
 * day (or the last one before it, else the first one after it) to the
 * latest. Null without a shot or without two different days of weights.
 */
export function changeSinceFirstShot(
  points: WeightPoint[],
  shots: Shot[]
): { from: number; fromDay: string; to: number; toDay: string; change: number } | null {
  if (points.length === 0 || shots.length === 0) return null;
  const firstShotDay = dayKey(Math.min(...shots.map((s) => s.at)));
  let base: WeightPoint | undefined;
  for (const p of points) if (p.day <= firstShotDay) base = p;
  if (!base) base = points.find((p) => p.day > firstShotDay);
  const last = points[points.length - 1];
  if (!base || base.day === last.day) return null;
  return { from: base.value, fromDay: base.day, to: last.value, toDay: last.day, change: last.value - base.value };
}

/** The latest weight entry in the unit asked for, or null. */
export function latestWeight(weights: Weight[], unit: WeightUnit): { value: number; at: number; waist: number | null } | null {
  let best: Weight | null = null;
  for (const w of weights) if (!best || w.at > best.at) best = w;
  return best ? { value: convertWeight(best.value, best.unit, unit), at: best.at, waist: best.waist } : null;
}

// ---------- how I feel ----------

/** The buckets: day of the shot (0) to 6 days after, then 7 or more. */
export const SINCE_BUCKETS = 8;

/** Whole local days from the last shot at or before `at` to `at`, or null when there was no shot before it. */
export function daysSinceShot(at: number, shots: Shot[]): number | null {
  let last: number | null = null;
  for (const s of shots) if (s.at <= at && (last == null || s.at > last)) last = s.at;
  return last == null ? null : daysBetween(dayKey(last), dayKey(at));
}

/** "Day of the shot", "1 day after", "3 days after", "7+ days after". */
export function sinceLabel(n: number): string {
  if (n <= 0) return 'Day of the shot';
  if (n >= SINCE_BUCKETS - 1) return `${SINCE_BUCKETS - 1}+ days after`;
  return `${n} day${n === 1 ? '' : 's'} after`;
}

/** Short for chart axes: "0", "1", ... "7+". */
export function sinceShort(i: number): string {
  return i >= SINCE_BUCKETS - 1 ? `${SINCE_BUCKETS - 1}+` : String(i);
}

export interface Patterns {
  /** Entries per bucket (day of the shot, 1 day after, ... 7+). */
  buckets: number[];
  /** Per kind of feeling, the same buckets. */
  byKind: Record<string, number[]>;
  /** Entries counted (those after a shot). */
  total: number;
  /** Entries from before the first shot, not counted in the buckets. */
  beforeFirstShot: number;
  /** The bucket(s) with the most entries; empty when there are none. */
  peaks: number[];
}

/** How I feel against days since the last shot. Counts only. */
export function patterns(feelings: FeelingEntry[], shots: Shot[]): Patterns {
  const buckets = new Array(SINCE_BUCKETS).fill(0);
  const byKind: Record<string, number[]> = {};
  let total = 0;
  let before = 0;
  for (const f of feelings) {
    const n = daysSinceShot(f.at, shots);
    if (n == null) {
      before++;
      continue;
    }
    const b = Math.min(n, SINCE_BUCKETS - 1);
    buckets[b]++;
    (byKind[f.kind] ??= new Array(SINCE_BUCKETS).fill(0))[b]++;
    total++;
  }
  const max = Math.max(...buckets);
  const peaks = max > 0 ? buckets.map((v, i) => (v === max ? i : -1)).filter((i) => i >= 0) : [];
  return { buckets, byKind, total, beforeFirstShot: before, peaks };
}

/** The one plain line under the chart: a count, never advice. */
export function patternLine(p: Patterns): string {
  if (p.total === 0) return 'Nothing logged after a shot yet.';
  const where = p.peaks.map((i) => sinceLabel(i).toLowerCase());
  const days = where.length === 1 ? where[0] : `${where.slice(0, -1).join(', ')} and ${where[where.length - 1]}`;
  return `Most entries: ${days} (${p.buckets[p.peaks[0]]} of ${p.total}).`;
}

/** Counts per kind of feeling over the entries given, most first. */
export function feelingCounts(feelings: FeelingEntry[]): { kind: string; count: number; strong: number }[] {
  const m = new Map<string, { count: number; strong: number }>();
  for (const f of feelings) {
    const c = m.get(f.kind) ?? { count: 0, strong: 0 };
    c.count++;
    if (f.level === 'strong') c.strong++;
    m.set(f.kind, c);
  }
  return [...m.entries()].map(([kind, c]) => ({ kind, ...c })).sort((a, b) => b.count - a.count || (a.kind < b.kind ? -1 : 1));
}

// ---------- protein and water ----------

export function intakeOn(intake: Intake[], day: string): Intake {
  return intake.find((i) => i.day === day) ?? { day, protein: 0, water: 0 };
}

/** 0 to 1 against the person's own goal; null with no goal set. */
export function progress(value: number, goal: number | null): number | null {
  if (!goal || goal <= 0) return null;
  return Math.max(0, Math.min(1, value / goal));
}

const ML_PER_FL_OZ = 29.5735295625;

/** Water is stored in mL; shown in fl oz when the person weighs in pounds. */
export function waterShown(ml: number, unit: WeightUnit): number {
  return unit === 'lb' ? ml / ML_PER_FL_OZ : ml;
}

/** A typed or tapped water amount in the shown unit, to mL for storage. */
export function waterStored(v: number, unit: WeightUnit): number {
  return unit === 'lb' ? v * ML_PER_FL_OZ : v;
}
