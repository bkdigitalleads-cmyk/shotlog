// react-native-purchases for the renders: the planned store prices, a 3-day trial on weekly.
const product = (identifier, price, priceString, intro) => ({ identifier, price, priceString, currencyCode: 'USD', introPrice: intro });
const weekly = { identifier: '$rc_weekly', packageType: 'WEEKLY', product: product('shot_pro_weekly', 6.99, '$6.99', { price: 0, periodNumberOfUnits: 3, periodUnit: 'DAY' }) };
const annual = { identifier: '$rc_annual', packageType: 'ANNUAL', product: product('shot_pro_yearly', 39.99, '$39.99', null) };
const lifetime = { identifier: '$rc_lifetime', packageType: 'LIFETIME', product: product('shot_pro_lifetime', 79.99, '$79.99', null) };
const pro = () => !!(window.__SCENARIO__ || {}).pro;
const Purchases = {
  setLogLevel() {},
  configure() {},
  async getCustomerInfo() {
    // scenario.subs: active subscription products (all renewing); scenario.lifetime: lifetime owned.
    const sc = window.__SCENARIO__ || {};
    const subs = sc.subs || [];
    const byId = Object.fromEntries(subs.map((id) => [id, { willRenew: true, isActive: true }]));
    const owned = [...subs, ...(sc.lifetime ? ['shot_pro_lifetime'] : [])];
    return {
      // scenario.plan: the entitlement's product, renewal and period type (for the plan-change toast).
      entitlements: { active: pro() ? { pro: { productIdentifier: 'shot_pro_yearly', periodType: 'NORMAL', willRenew: true, isSandbox: false, ...(sc.plan || {}) } } : {} },
      activeSubscriptions: subs,
      subscriptionsByProductIdentifier: byId,
      allPurchasedProductIdentifiers: owned,
      nonSubscriptionTransactions: sc.lifetime ? [{ productIdentifier: 'shot_pro_lifetime' }] : [],
    };
  },
  async getOfferings() {
    return { current: { identifier: 'default', availablePackages: [weekly, annual, lifetime], weekly, annual, lifetime } };
  },
  async checkTrialOrIntroductoryPriceEligibility(ids) {
    const out = {};
    for (const id of ids) out[id] = { status: 2 };
    return out;
  },
  addCustomerInfoUpdateListener() {},
  removeCustomerInfoUpdateListener() {},
  async showManageSubscriptions() {},
};
export default Purchases;
export const LOG_LEVEL = { ERROR: 'ERROR' };
export const INTRO_ELIGIBILITY_STATUS = { INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 2 };
