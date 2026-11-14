// The app's src/purchases.ts for the renders: the same API, always "configured", Pro from the scenario.
import Purchases from './purchases-sdk.js';
export const ENTITLEMENT_ID = 'pro';
export function isBillingAvailable() {
  return true;
}
export async function initPurchases() {}
export function isProFromCustomerInfo(info) {
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}
export async function getIsPro() {
  return isProFromCustomerInfo(await Purchases.getCustomerInfo());
}
export async function checkPro() {
  return getIsPro();
}
export function onProChange(_cb) {
  return () => {};
}
export async function getOffering() {
  return (await Purchases.getOfferings()).current ?? null;
}
export async function purchasePackage(_pkg) {
  return { ok: false, isPro: false, userCancelled: true };
}
export async function restorePurchases() {
  return { ok: true, isPro: false, userCancelled: false };
}
