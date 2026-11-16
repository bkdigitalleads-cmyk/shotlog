/**
 * Plan and trial rules as pure functions (no imports), checked by `npm test`.
 * The store objects come from RevenueCat; these only look at plain fields,
 * so prices and trial lengths always come from StoreKit. The engine's
 * (Migraine Log, Pumping) with the lifetime plan added.
 */

export interface IntroLike {
  price: number;
  periodNumberOfUnits: number;
  /** 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' */
  periodUnit: string;
}

/** "3 days" for a free trial, or null when the intro offer is not free. */
export function trialLength(intro: IntroLike | null | undefined): string | null {
  if (!intro || intro.price !== 0 || !(intro.periodNumberOfUnits > 0)) return null;
  const n = intro.periodNumberOfUnits;
  const unit = intro.periodUnit.toLowerCase();
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

/** "3 days free", only when the trial exists and this Apple ID can still get it. */
export function trialLabelFrom(intro: IntroLike | null | undefined, eligible: boolean): string | null {
  const len = eligible ? trialLength(intro) : null;
  return len ? `${len} free` : null;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/**
 * When the "trial ends tomorrow" reminder fires: a day before the trial
 * ends. Sandbox trials last minutes, so when that is under an hour away
 * (or the end is unknown), 2 days from now instead; the foreground check
 * cancels it once the trial is over.
 */
export function trialReminderAt(expiresMs: number | null, now: number): number {
  const at = expiresMs != null ? expiresMs - DAY : now + 2 * DAY;
  return at < now + HOUR ? now + 2 * DAY : at;
}

export type PlanType = 'WEEKLY' | 'ANNUAL' | 'LIFETIME';

/** The plans shown, in order: weekly first on the onboarding paywall, yearly first in the app. Lifetime is always last. */
export function planOrder(onboarding: boolean): PlanType[] {
  return onboarding ? ['WEEKLY', 'ANNUAL', 'LIFETIME'] : ['ANNUAL', 'WEEKLY', 'LIFETIME'];
}

/** The preselected plan among those the store returned (the one plan, when the paywall shows only one). */
export function preselect(available: string[], onboarding: boolean, only?: PlanType | null): PlanType | null {
  for (const t of planOrder(onboarding)) if (available.includes(t) && (!only || t === only)) return t;
  return null;
}

/** RevenueCat package types to ours ($rc_weekly, $rc_annual, $rc_lifetime). */
export function planTypeOf(packageType: string): PlanType | null {
  return packageType === 'WEEKLY' || packageType === 'ANNUAL' || packageType === 'LIFETIME' ? packageType : null;
}

/** The plan row's title. In the app, yearly is "Yearly, best value"; lifetime is always "Lifetime, pay once". */
export function planTitle(t: PlanType, onboarding: boolean): string {
  if (t === 'LIFETIME') return 'Lifetime, pay once';
  if (t === 'ANNUAL') return onboarding ? 'Yearly' : 'Yearly, best value';
  return 'Weekly';
}

/**
 * Trial wording on the weekly plan, on every paywall, whenever StoreKit says
 * this Apple ID can still get the trial (`trial` is then "3 days free", else
 * null). Apple grants the trial wherever weekly is bought, so the plan row,
 * the legal lines and "No payment now" always say so. (Until 1.0.0 build 3
 * the in-app paywall left it out, and a buyer got a trial it never named.)
 */
export function showsTrial(t: PlanType, trial: string | null): string | null {
  return t === 'WEEKLY' ? trial : null;
}

/** The plans a paywall lists, in its order: all of them, or only one (Switch to lifetime shows only Lifetime). */
export function plansShown(available: PlanType[], onboarding: boolean, only?: PlanType | null): PlanType[] {
  return planOrder(onboarding).filter((t) => available.includes(t) && (!only || t === only));
}

/** Whole percent saved by paying yearly instead of 52 weeks, or null when it is not a saving. */
export function yearlySavingPct(weeklyPrice: number, yearlyPrice: number): number | null {
  if (!(weeklyPrice > 0) || !(yearlyPrice > 0)) return null;
  const pct = Math.floor((1 - yearlyPrice / (weeklyPrice * 52)) * 100);
  return pct > 0 ? pct : null;
}

/** The product ids, as set up in App Store Connect and RevenueCat. */
export const PRODUCTS = { weekly: 'shot_pro_weekly', yearly: 'shot_pro_yearly', lifetime: 'shot_pro_lifetime' } as const;

/**
 * After a lifetime purchase: subscriptions still renewing on this Apple ID
 * (weekly or yearly) keep billing unless cancelled. Returns the ones to
 * mention; when any, the app says so and opens Apple's Manage
 * Subscriptions sheet. `activeSubscriptions` is RevenueCat's list of
 * product ids with an active subscription; `willRenew` is false for one
 * already cancelled.
 */
/**
 * Which Pro rows Settings shows, from RevenueCat's customer info:
 *  - "Switch to lifetime" (Pay once, then cancel the subscription): Pro is on
 *    through an active subscription and lifetime is not owned. It opens the
 *    paywall with only the Lifetime plan.
 *  - "Manage subscription": Pro is on, except when lifetime is owned and no
 *    subscription renews (then there is nothing to manage).
 * `activeSubscriptions` is every active subscription product (renewing or
 * cancelled but still running); `renewing` the ones that will renew.
 */
export function proRows(s: { isPro: boolean; ownsLifetime: boolean; activeSubscriptions: string[]; renewing: string[] }): { switchToLifetime: boolean; manageSubscription: boolean } {
  const subscribed = s.activeSubscriptions.some((id) => id !== PRODUCTS.lifetime);
  return {
    switchToLifetime: s.isPro && subscribed && !s.ownsLifetime,
    manageSubscription: s.isPro && !(s.ownsLifetime && s.renewing.length === 0),
  };
}

export function subscriptionsToCancel(activeSubscriptions: string[], renewing: (id: string) => boolean, lifetimeId: string = PRODUCTS.lifetime): string[] {
  return activeSubscriptions.filter((id) => id !== lifetimeId && renewing(id));
}
