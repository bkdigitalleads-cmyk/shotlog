/**
 * The words the app uses for things it stores, in one place (no runtime
 * imports), so the screens, the report and the CSV say the same thing.
 */
import type { DoseUnit, Feeling, Level, Track, WeightUnit } from './model';

export const DOSE_UNITS: { id: DoseUnit; label: string }[] = [
  { id: 'mg', label: 'mg' },
  { id: 'mcg', label: 'mcg' },
  { id: 'mL', label: 'mL' },
  { id: 'units', label: 'units' },
];

/**
 * Generic names offered as suggestions while typing a medication's name.
 * Generic names only, never a brand. The person can type any name.
 */
export const NAME_SUGGESTIONS = ['Semaglutide', 'Tirzepatide', 'Liraglutide', 'Dulaglutide', 'Retatrutide'];

export const FEELINGS: { id: Feeling; label: string }[] = [
  { id: 'nausea', label: 'Nausea' },
  { id: 'constipation', label: 'Constipation' },
  { id: 'heartburn', label: 'Heartburn' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'headache', label: 'Headache' },
  { id: 'low_appetite', label: 'Low appetite' },
  { id: 'site_reaction', label: 'Site reaction' },
  { id: 'other', label: 'Other' },
];

export const LEVELS: { id: Level; label: string }[] = [
  { id: 'mild', label: 'Mild' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'strong', label: 'Strong' },
];

export function feelingLabel(k: Feeling): string {
  return FEELINGS.find((f) => f.id === k)?.label ?? 'Other';
}

export function levelLabel(l: Level): string {
  return LEVELS.find((x) => x.id === l)?.label ?? 'Mild';
}

/** "What are you tracking?" Labels only. */
export const TRACKS: { id: Track; label: string; sub: string }[] = [
  { id: 'glp1', label: 'GLP-1 medication', sub: 'For weight or diabetes' },
  { id: 'peptides', label: 'Peptides', sub: 'Prescribed or your own' },
  { id: 'other', label: 'Other injections', sub: 'Anything you inject on a schedule' },
];

export const WEIGHT_UNITS: { id: WeightUnit; label: string }[] = [
  { id: 'lb', label: 'lb' },
  { id: 'kg', label: 'kg' },
];

/** Waist follows the weight unit: inches with lb, cm with kg. */
export function waistUnit(u: WeightUnit): string {
  return u === 'lb' ? 'in' : 'cm';
}

/** Water follows the weight unit: fl oz with lb, mL with kg. */
export function waterUnit(u: WeightUnit): string {
  return u === 'lb' ? 'fl oz' : 'mL';
}

/** The tap-to-add steps. Counters only; the app sets no targets. */
export function intakeSteps(u: WeightUnit): { protein: number[]; water: number[] } {
  return { protein: [10, 25], water: u === 'lb' ? [8, 16] : [250, 500] };
}
