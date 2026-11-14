/**
 * First-run moments, paywall timing and the rating guard, as pure functions
 * checked by `npm test`. From Pumping 1.0.1: nothing before the first saved
 * shot; after it, the reminder question, then (when this Apple ID can get
 * the trial) "Try it free" and the day-before reminder screen, then the
 * onboarding paywall with the X after 3 seconds, once ever. One second
 * chance on a later calendar day. Never two paywalls in one launch.
 */

/** 'pending' from the end of onboarding until the first saved shot, then 'done'. */
export function firstFlowStep(flag: string | null, shotCount: number, isPro: boolean): 'none' | 'wait' | 'skip' | 'run' {
  if (flag !== 'pending') return 'none';
  if (shotCount <= 0) return 'wait';
  return isPro ? 'skip' : 'run';
}

/** The second chance: the day the first paywall showed is stored; due on the first launch on a later day. */
export function secondChanceDue(stored: string | null, today: string): boolean {
  return stored != null && /^\d{4}-\d{2}-\d{2}$/.test(stored) && stored < today;
}

/** A paywall the app opens on its own (the first one, the second chance): never for Pro, never twice in a launch. */
export function autoPaywallAllowed(opts: { isPro: boolean; shownThisLaunch: boolean }): boolean {
  return !opts.isPro && !opts.shownThisLaunch;
}

/** The close button on the onboarding paywall appears after this delay. */
export const ONBOARDING_CLOSE_DELAY_MS = 3000;

/**
 * The rating prompt: after the second logged shot or the first report
 * preview, each once ever, only on a launch on a later calendar day than
 * the install, at most one per launch, never during onboarding and never in
 * a launch that showed a paywall. StoreKit still decides whether it shows.
 */
export function reviewAllowed(opts: {
  installDay: string | null;
  today: string;
  onboarding: boolean;
  askedThisLaunch: boolean;
  paywallThisLaunch: boolean;
  triggerUsed: boolean;
}): boolean {
  return (
    opts.installDay != null &&
    opts.today > opts.installDay &&
    !opts.onboarding &&
    !opts.askedThisLaunch &&
    !opts.paywallThisLaunch &&
    !opts.triggerUsed
  );
}

/** The second-shot trigger is met once two or more shots are logged (so a daily shot on install day is not lost). */
export function secondShotMet(shotCount: number): boolean {
  return shotCount >= 2;
}
