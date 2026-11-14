/**
 * The shapes of what the app stores, shared by the database, the screens and
 * the pure logic. Types only: nothing here runs.
 */

/** The units a person can type a dose in. The app never converts between them. */
export type DoseUnit = 'mg' | 'mcg' | 'mL' | 'units';

/** Every N days from the last shot, or on chosen weekdays (0 = Monday ... 6 = Sunday). */
export type Schedule = { kind: 'interval'; everyDays: number } | { kind: 'weekdays'; days: number[] };

/** The injection sites on the body map. Left and right are the person's own. */
export type Site =
  | 'abdomen-left'
  | 'abdomen-right'
  | 'thigh-left'
  | 'thigh-right'
  | 'arm-left'
  | 'arm-right'
  | 'glute-left'
  | 'glute-right';

/** A dose as typed: the amount stays text, exactly as entered. No math is ever done on it. */
export interface Dose {
  amount: string;
  unit: DoseUnit;
}

/** A dose the person started on a day ("from Nov 3, 0.5 mg"). The newest one on or before a day is the dose then. */
export interface DoseChange extends Dose {
  id: number;
  medId: number;
  /** Local day, YYYY-MM-DD. */
  fromDay: string;
}

export interface Med {
  id: number;
  name: string;
  schedule: Schedule;
  /** Local day, YYYY-MM-DD: the first shot is due on or after this day. */
  startDay: string;
  /** Dose history, oldest first. */
  doses: DoseChange[];
  /** Shot reminders for this medication. */
  remind: boolean;
  position: number;
  createdAt: number;
}

export interface Shot {
  id: number;
  /** The medication in the list, or null when it has since been deleted. */
  medId: number | null;
  /** The name as it was when logged; the list's name wins while the medication exists. */
  medName: string;
  at: number;
  amount: string;
  unit: DoseUnit;
  site: Site | null;
  note: string;
  /** Entered later, from memory. */
  backfilled: boolean;
  createdAt: number;
}

export type WeightUnit = 'kg' | 'lb';

export interface Weight {
  id: number;
  at: number;
  /** As typed, in `unit`. */
  value: number;
  unit: WeightUnit;
  /** Optional, in cm when the unit is kg, inches when lb. */
  waist: number | null;
  createdAt: number;
}

export type Feeling = 'nausea' | 'constipation' | 'heartburn' | 'fatigue' | 'headache' | 'low_appetite' | 'site_reaction' | 'other';
export type Level = 'mild' | 'moderate' | 'strong';

export interface FeelingEntry {
  id: number;
  at: number;
  kind: Feeling;
  level: Level;
  note: string;
  createdAt: number;
}

/** One day's protein (g) and water (mL; shown in fl oz with lb) counters. */
export interface Intake {
  day: string;
  protein: number;
  water: number;
}

/** "What are you tracking?" Words only; nothing else changes. */
export type Track = 'glp1' | 'peptides' | 'other';
