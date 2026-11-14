import * as StoreReview from 'expo-store-review';
import { kvGet, kvSet } from './db';
import { dayKey } from './days';
import { reviewAllowed } from './flow';

/**
 * App Store rating asks, at moments of value (src/flow.ts reviewAllowed):
 *   secondShot  - two or more shots logged
 *   firstReport - the first time the report preview opens
 * Each once ever, only on a launch on a later calendar day than the
 * install, at most one per launch, never during onboarding and never in a
 * launch that showed a paywall. StoreKit still decides whether the prompt
 * actually shows (it caps it at 3 a year). Same engine as Migraine Log,
 * Pumping and Odo 1.0.6, with the triggers of this app.
 */
export type ReviewTrigger = 'secondShot' | 'firstReport';

const triggerKey = (t: ReviewTrigger) => `review.${t}`;
const INSTALL_DAY_KEY = 'review.installDay';

let launchState: 'idle' | 'checking' | 'asked' = 'idle';
let guard: () => { onboarding: boolean; paywallThisLaunch: boolean } = () => ({ onboarding: true, paywallThisLaunch: false });

/** App.tsx tells this module whether onboarding is showing and whether a paywall showed this launch. */
export function setReviewGuard(fn: () => { onboarding: boolean; paywallThisLaunch: boolean }): void {
  guard = fn;
}

/** Once per cold launch: records the install day the first time. */
export async function recordInstallDay(): Promise<void> {
  try {
    if (!(await kvGet(INSTALL_DAY_KEY))) await kvSet(INSTALL_DAY_KEY, dayKey(Date.now()));
  } catch {
    // never let review plumbing get in the way
  }
}

export async function maybeRequestReview(trigger: ReviewTrigger): Promise<void> {
  if (launchState !== 'idle') return;
  launchState = 'checking';
  try {
    const g = guard();
    const ok = reviewAllowed({
      installDay: await kvGet(INSTALL_DAY_KEY),
      today: dayKey(Date.now()),
      onboarding: g.onboarding,
      askedThisLaunch: false,
      paywallThisLaunch: g.paywallThisLaunch,
      triggerUsed: (await kvGet(triggerKey(trigger))) != null,
    });
    if (!ok) return;
    if (!(await StoreReview.hasAction())) return;
    await kvSet(triggerKey(trigger), '1');
    launchState = 'asked';
    setTimeout(() => {
      // One last look: a paywall that opened in the meantime wins.
      if (!guard().paywallThisLaunch) StoreReview.requestReview().catch(() => {});
    }, 1200);
  } catch {
    // never let review plumbing get in the way
  } finally {
    if (launchState === 'checking') launchState = 'idle';
  }
}
