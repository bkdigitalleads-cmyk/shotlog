/**
 * Lifetime and Manage Subscriptions, kept apart from purchases.ts (a copy
 * of the engine's). After a lifetime purchase, a weekly or yearly
 * subscription on the same Apple ID keeps billing unless it is cancelled,
 * so the app says so and opens Apple's Manage Subscriptions sheet. The
 * rule itself is pure and checked (offer.ts subscriptionsToCancel).
 */
import { Alert } from 'react-native';
import Purchases from 'react-native-purchases';
import { ENTITLEMENT_ID, isBillingAvailable } from './purchases';
import { kvGet, kvSet } from './db';
import { PRODUCTS, planChangeMessage, PlanSnapshot, proRows, subscriptionsToCancel } from './offer';

/** Product ids of subscriptions still renewing on this Apple ID, other than lifetime. Empty when unknown. */
export async function renewingSubscriptions(): Promise<string[]> {
  if (!isBillingAvailable()) return [];
  try {
    const info = await Purchases.getCustomerInfo();
    const byId = info.subscriptionsByProductIdentifier ?? {};
    return subscriptionsToCancel(info.activeSubscriptions ?? [], (id) => byId[id]?.willRenew !== false, PRODUCTS.lifetime);
  } catch {
    return [];
  }
}

export interface PlanState {
  ownsLifetime: boolean;
  /** Active subscription products (renewing, or cancelled but still running), lifetime left out. */
  activeSubscriptions: string[];
  /** The ones that will renew. */
  renewing: string[];
}

/** How Pro is held on this Apple ID, or null when RevenueCat cannot answer (offline, not configured). */
export async function getPlanState(): Promise<PlanState | null> {
  if (!isBillingAvailable()) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    const byId = info.subscriptionsByProductIdentifier ?? {};
    const active = (info.activeSubscriptions ?? []).filter((id) => id !== PRODUCTS.lifetime);
    const ownsLifetime =
      (info.allPurchasedProductIdentifiers ?? []).includes(PRODUCTS.lifetime) ||
      (info.nonSubscriptionTransactions ?? []).some((t) => t.productIdentifier === PRODUCTS.lifetime);
    return { ownsLifetime, activeSubscriptions: active, renewing: subscriptionsToCancel(active, (id) => byId[id]?.willRenew !== false) };
  } catch {
    return null;
  }
}

/**
 * The Pro rows Settings shows (src/offer.ts proRows). When RevenueCat cannot
 * answer, Pro users keep Manage subscription and see no Switch to lifetime.
 */
export function rowsFor(isPro: boolean, plan: PlanState | null): { switchToLifetime: boolean; manageSubscription: boolean } {
  if (!plan) return { switchToLifetime: false, manageSubscription: isPro };
  return proRows({ isPro, ...plan });
}

// ---------- changes made in Apple's Manage Subscriptions sheet ----------

/** The plan last seen on this phone (kv), to compare against after Apple's sheet or a renewal. */
const PLAN_SEEN_KEY = 'plan.seen';
let managePending = false;
const manageClosed = new Set<() => void>();

/** The pro entitlement right now, or null when RevenueCat cannot answer. No Pro is { product: null }. */
export async function getPlanSnapshot(): Promise<PlanSnapshot | null> {
  if (!isBillingAvailable()) return null;
  try {
    const info = await Purchases.getCustomerInfo();
    const ent = info.entitlements.active[ENTITLEMENT_ID];
    return ent ? { product: ent.productIdentifier, willRenew: ent.willRenew, periodType: ent.periodType ?? null } : { product: null, willRenew: false, periodType: null };
  } catch {
    return null;
  }
}

/**
 * Reads the plan, compares it with the one last seen and stores it. Returns
 * the one short line to show ("Your plan is now Yearly.") or null
 * (src/offer.ts planChangeMessage). Unknown answers change nothing.
 */
export async function checkPlanChange(): Promise<string | null> {
  try {
    const after = await getPlanSnapshot();
    if (!after) return null;
    const stored = await kvGet(PLAN_SEEN_KEY);
    let before: PlanSnapshot | null = null;
    try {
      before = stored ? (JSON.parse(stored) as PlanSnapshot) : null;
    } catch {
      before = null;
    }
    await kvSet(PLAN_SEEN_KEY, JSON.stringify(after));
    return planChangeMessage(before, after);
  } catch {
    return null;
  }
}

/** True once after Apple's sheet was opened, so the next return to the foreground checks the plan. */
export function takeManagePending(): boolean {
  const was = managePending;
  managePending = false;
  return was;
}

/** Called when Apple's sheet closes (StoreKit's in-app sheet does not send the app to the background). */
export function onManageClosed(cb: () => void): () => void {
  manageClosed.add(cb);
  return () => {
    manageClosed.delete(cb);
  };
}

/** Apple's own sheet to cancel or change a subscription. Falls back to nothing when it cannot open. */
export async function openManageSubscriptions(): Promise<void> {
  managePending = true;
  try {
    await Purchases.showManageSubscriptions();
  } catch {
    // the App Store settings are the fallback; nothing to do here
  }
  for (const cb of manageClosed) cb();
}

/**
 * After lifetime: when a subscription is still renewing, say so and offer
 * Apple's sheet to cancel it. Resolves once the person has answered.
 */
export async function afterLifetimePurchase(): Promise<void> {
  const ids = await renewingSubscriptions();
  if (ids.length === 0) return;
  const which = ids.includes(PRODUCTS.weekly) ? 'weekly' : ids.includes(PRODUCTS.yearly) ? 'yearly' : '';
  await new Promise<void>((resolve) =>
    Alert.alert(
      `Your ${which ? `${which} ` : ''}subscription is still on`,
      'Lifetime is paid once, and Apple keeps billing the subscription until it is cancelled. Cancel it in Apple’s subscriptions page; Pro stays on with lifetime.',
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve() },
        {
          text: 'Manage subscriptions',
          onPress: () => {
            openManageSubscriptions().finally(resolve);
          },
        },
      ]
    )
  );
}
