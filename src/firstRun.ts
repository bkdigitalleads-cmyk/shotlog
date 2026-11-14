/**
 * First-run moments, kept as key/value rows (no table changes), from
 * Pumping 1.0.1:
 *  - the trial screens and paywall after the first saved shot, once ever
 *  - the paywall's second chance on a later calendar day, once ever
 * The decisions themselves are pure functions in flow.ts, with checks.
 */
import { kvGet, kvSet } from './db';
import { dayKey } from './days';
import { secondChanceDue } from './flow';

/** 'pending' from the end of onboarding until the first saved shot, then 'done'. */
export const FIRST_FLOW_KEY = 'flow.afterFirstShot';
/** The day the after-first-shot paywall was shown (YYYY-MM-DD), then 'done'. */
export const SECOND_CHANCE_KEY = 'flow.paywallSecondChance';

let secondChanceChecked = false;

/**
 * Once per cold launch, from the main screen: true when the in-app paywall
 * should open as the second chance. Consumes the flag when it is due, so
 * it happens once ever.
 */
export async function takeSecondChance(isPro: boolean): Promise<boolean> {
  if (secondChanceChecked) return false;
  secondChanceChecked = true;
  try {
    if (!secondChanceDue(await kvGet(SECOND_CHANCE_KEY), dayKey(Date.now()))) return false;
    await kvSet(SECOND_CHANCE_KEY, 'done');
    return !isPro;
  } catch {
    return false;
  }
}
