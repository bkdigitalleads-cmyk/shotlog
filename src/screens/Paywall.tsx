import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { useTheme, radius, space, tabular, type } from '../theme';
import { useApp, PaywallReason } from '../state';
import { getOffering, purchasePackage, restorePurchases, isBillingAvailable } from '../purchases';
import { getTrialEligibleIds, trialLabel } from '../trial';
import { cancelTrialReminder, scheduleTrialReminderIfTrial } from '../reminder';
import { planOrder, planTitle, planTypeOf, preselect, showsTrial, PlanType } from '../offer';
import { ONBOARDING_CLOSE_DELAY_MS } from '../flow';
import { afterLifetimePurchase } from '../plans';
import { PRIVACY_URL, TERMS_URL } from '../links';
import Glyph from '../ui/Glyph';
import { Button, GlyphButton, Radio, Tap } from '../ui/Kit';
import { MODAL_ANIMATION } from '../ui/motion';

/** The headline and one line, by why the paywall opened. */
const REASON: Record<PaywallReason, { title: string; line: string }> = {
  stack: { title: 'Your whole stack.', line: 'More than one medication, each with its own schedule, dose history and reminder.' },
  trends: { title: 'Weight against your shots.', line: '30, 90 and 180 days with every shot marked, the average change a week, and the change since your first shot.' },
  patterns: { title: 'Which days after a shot.', line: 'How you feel, counted by days since the last shot, so you can see where it clusters.' },
  sites: { title: 'Your site history.', line: 'Your last 12 shots on the body map, with how many went to each site.' },
  intake: { title: 'Protein and water.', line: 'Tap-to-add counters on Today, against goals you set yourself.' },
  report: { title: 'A clean record for your prescriber.', line: 'Share or print the PDF: doses with dates, every shot and site, weight and side effects.' },
  csv: { title: 'Everything in a spreadsheet.', line: 'Every shot, weight and side effect, one row each.' },
  history: { title: 'Your whole history.', line: 'Every shot and entry past the last 30 days, kept on this iPhone.' },
  pro: { title: 'Shot Log Pro.', line: 'A stack of medications, trends and patterns, the report for your prescriber, and your whole history.' },
};

const typeOf = (p: PurchasesPackage): PlanType | null => planTypeOf(p.packageType);

/**
 * Two paywalls in one component (the engine's, with the lifetime plan).
 * Products: shot_pro_weekly ($rc_weekly, 3-day free trial),
 * shot_pro_yearly ($rc_annual), shot_pro_lifetime ($rc_lifetime).
 *  - onboarding (after the first saved shot, once): Weekly first and
 *    preselected with its trial wording and "No payment now" when this
 *    Apple ID can get the trial; the X appears after 3 seconds, every time
 *    this kind opens.
 *  - in-app: "Yearly, best value" first and preselected; no trial wording.
 * Prices and trial lengths always come from StoreKit. Logging a shot is
 * never behind this.
 */
export default function PaywallModal() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const { paywall, hidePaywall, setIsPro } = useApp();
  const visible = paywall != null;
  const onboarding = paywall?.onboarding ?? false;
  const reason: PaywallReason = paywall?.reason ?? 'pro';
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [selected, setSelected] = useState<PurchasesPackage | null>(null);
  const [trialEligible, setTrialEligible] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [canClose, setCanClose] = useState(true);

  useEffect(() => {
    if (!visible) return;
    if (!onboarding) return setCanClose(true);
    setCanClose(false);
    const t = setTimeout(() => setCanClose(true), ONBOARDING_CLOSE_DELAY_MS);
    return () => clearTimeout(t);
  }, [visible, onboarding]);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    (async () => {
      const off = await getOffering();
      setOffering(off);
      setTrialEligible(await getTrialEligibleIds(off?.availablePackages ?? []));
      const pkgs = (off?.availablePackages ?? []).filter((p) => typeOf(p) != null);
      const pick = preselect(pkgs.map((p) => typeOf(p) as string), onboarding);
      setSelected(pkgs.find((p) => typeOf(p) === pick) ?? null);
      setLoading(false);
    })();
  }, [visible, onboarding]);

  const buy = async () => {
    if (!selected) return;
    setPurchasing(true);
    const res = await purchasePackage(selected);
    setPurchasing(false);
    if (res.ok && res.isPro) {
      setIsPro(true);
      hidePaywall();
      if (typeOf(selected) === 'LIFETIME') {
        // A subscription bought earlier keeps billing unless cancelled: say so first.
        await afterLifetimePurchase();
        Alert.alert('Pro is on, for good', 'Your stack, trends, the report and your whole history are open.');
        return;
      }
      const reminded = await scheduleTrialReminderIfTrial();
      Alert.alert('Pro is on', `Your stack, trends, the report and your whole history are open.${reminded ? ' We will remind you the day before the trial ends.' : ''}`);
    } else if (res.ok) {
      Alert.alert('Paid, but Pro is not showing', 'The App Store can lag a minute. Tap Restore purchases in a moment and it turns on.');
    } else if (!res.userCancelled && res.error) {
      Alert.alert('The purchase did not go through', res.error);
    }
  };

  const onRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    const res = await restorePurchases();
    setRestoring(false);
    if (res.ok) cancelTrialReminder();
    if (res.ok && res.isPro) {
      setIsPro(true);
      hidePaywall();
      Alert.alert('Pro is back on', 'Everything is open again.');
    } else if (res.ok) {
      Alert.alert('Nothing to restore', 'This Apple ID has no Shot Log Pro purchase.');
    } else {
      Alert.alert('Restore did not work', res.error ?? 'Try once more.');
    }
  };

  const order = planOrder(onboarding);
  const packages = [...(offering?.availablePackages ?? [])]
    .filter((p) => typeOf(p) != null)
    .sort((a, b) => order.indexOf(typeOf(a) as PlanType) - order.indexOf(typeOf(b) as PlanType));
  const weeklyPkg = packages.find((p) => typeOf(p) === 'WEEKLY');
  const yearlyPkg = packages.find((p) => typeOf(p) === 'ANNUAL');
  const lifetimePkg = packages.find((p) => typeOf(p) === 'LIFETIME');
  const weeklyTrial = trialLabel(weeklyPkg, trialEligible);
  const shownTrial = showsTrial('WEEKLY', onboarding, weeklyTrial);

  const money = (n: number, cur?: string) => n.toLocaleString(undefined, { style: 'currency', currency: cur ?? 'USD' });
  const yearlyPerWeek = yearlyPkg?.product.price ? `${money(yearlyPkg.product.price / 52, yearlyPkg.product.currencyCode)} a week` : null;

  // Always-visible 3.1.2(c) disclosure, built from whatever StoreKit returned.
  const parts: string[] = [];
  if (yearlyPkg) parts.push(`Yearly ${yearlyPkg.product.priceString}/year is an auto-renewing subscription billed once a year until cancelled.`);
  if (weeklyPkg)
    parts.push(
      `Weekly ${weeklyPkg.product.priceString}/week is an auto-renewing subscription billed once a week until cancelled${
        shownTrial ? `; it starts with ${shownTrial} and you are not charged until the trial ends` : ''
      }.`
    );
  if (lifetimePkg) parts.push(`Lifetime ${lifetimePkg.product.priceString} is a one-time purchase.`);
  const disclosure =
    (parts.length > 0 ? parts.join(' ') : 'Pro is offered as a weekly or yearly auto-renewing subscription, or once for life.') +
    ' Payment is charged to your Apple ID. Cancel a subscription anytime in your Apple ID settings at least 24 hours before the period ends.';

  const copy = REASON[reason];
  const headline = shownTrial ? `${copy.title} ${shownTrial[0].toUpperCase()}${shownTrial.slice(1)} first.` : copy.title;

  return (
    <Modal visible={visible} animationType={MODAL_ANIMATION} presentationStyle="fullScreen" onRequestClose={() => canClose && hidePaywall()}>
      <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Holds its space while hidden so nothing jumps when the close button appears. */}
          <View style={[styles.closeRow, { opacity: canClose ? 1 : 0 }]} accessibilityElementsHidden={!canClose} importantForAccessibility={canClose ? 'auto' : 'no-hide-descendants'}>
            <GlyphButton theme={theme} glyph="close" label="Close" onPress={hidePaywall} disabled={!canClose} color={theme.inkSoft} />
          </View>

          <Text style={[type.display, styles.title, compact && styles.titleCompact, { color: theme.ink }]} accessibilityRole="header">
            {headline}
          </Text>
          <Text style={[type.body, styles.line, { color: theme.inkSoft }]}>{copy.line}</Text>
          <Text style={[type.body, styles.line, { color: theme.inkSoft }]}>Logging your shots is always free.</Text>

          {loading ? (
            <ActivityIndicator style={{ marginVertical: space.xl }} color={theme.inkSoft} />
          ) : packages.length === 0 || !isBillingAvailable() ? (
            <Text style={[type.body, styles.unavailable, { color: theme.inkSoft }]}>The App Store is not answering right now. Try again in a bit.</Text>
          ) : (
            <View style={[styles.plans, compact && { marginTop: space.l }, { backgroundColor: theme.surface, borderColor: theme.edge }]} accessibilityRole="radiogroup">
              {packages.map((p, i) => {
                const t = typeOf(p) as PlanType;
                const on = selected?.identifier === p.identifier;
                const title = planTitle(t, onboarding);
                const trial = showsTrial(t, onboarding, weeklyTrial);
                // 3.1.2(c) on the row itself: the trial length, then the price after it.
                const line =
                  t === 'ANNUAL'
                    ? `${p.product.priceString} a year${yearlyPerWeek ? `, ${yearlyPerWeek}` : ''}`
                    : t === 'LIFETIME'
                      ? `${p.product.priceString} once, no subscription`
                      : trial
                        ? `${trial}, then ${p.product.priceString} a week`
                        : `${p.product.priceString} a week`;
                return (
                  <Tap
                    key={p.identifier}
                    onPress={() => setSelected(p)}
                    style={[styles.plan, compact && styles.planCompact, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }, on && { backgroundColor: theme.picked }]}
                    pressedStyle={{ backgroundColor: theme.well }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${title}, ${line}`}
                  >
                    <Radio theme={theme} on={on} />
                    <View style={{ flex: 1 }}>
                      <Text style={[type.title, { color: theme.ink }]}>{title}</Text>
                      <Text style={[type.small, { color: theme.inkSoft }, tabular]}>{line}</Text>
                    </View>
                    {trial ? (
                      <View style={[styles.trialTag, { borderColor: theme.ink }]}>
                        <Text style={[type.small, styles.semi, { color: theme.ink }]}>{trial}</Text>
                      </View>
                    ) : (
                      <Text style={[type.title, { color: theme.ink }, tabular]}>{p.product.priceString}</Text>
                    )}
                  </Tap>
                );
              })}
            </View>
          )}
        </ScrollView>

        <View style={[styles.bottom, { borderTopColor: theme.rule, paddingBottom: Math.max(insets.bottom, space.m) }]}>
          {/* The button says Continue, never Subscribe. */}
          <Button theme={theme} live label={purchasing ? 'One moment' : 'Continue'} onPress={buy} disabled={purchasing || !selected || loading} />
          {selected && showsTrial(typeOf(selected) as PlanType, onboarding, trialLabel(selected, trialEligible)) ? (
            <View style={styles.checkLine}>
              <Glyph name="check" size={18} color={theme.ink} weight={2.2} />
              <Text style={[type.body, styles.semi, { color: theme.ink }]}>No payment now</Text>
            </View>
          ) : null}
          {/*
            App Review guideline 3.1.2(c): title, length, price and functional
            Terms of Use (EULA) + Privacy Policy links live in the app itself.
            Outside the ScrollView and outside the "offering loaded" branch on
            purpose: visible without scrolling, rendered even with no products.
          */}
          <Text style={[styles.legalText, { color: theme.inkFaint }]}>Shot Log Pro. {disclosure}</Text>
          <View style={styles.legalLinks}>
            <Text style={[styles.legalLink, { color: theme.inkSoft }]} onPress={onRestore} accessibilityRole="button">
              {restoring ? 'Restoring' : 'Restore purchases'}
            </Text>
            <Text style={[styles.legalLink, { color: theme.inkSoft }]} onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link">
              Terms of Use (EULA)
            </Text>
            <Text style={[styles.legalLink, { color: theme.inkSoft }]} onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link">
              Privacy Policy
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: space.xl, paddingHorizontal: space.l },
  closeRow: { alignItems: 'flex-end', marginRight: -space.s, paddingTop: space.xs },
  title: { marginTop: space.l },
  titleCompact: { marginTop: space.xs },
  line: { marginTop: space.s },
  semi: { fontWeight: '600' },
  plans: { marginTop: space.xxl, borderRadius: radius.leaf, borderWidth: 1, overflow: 'hidden' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 68, paddingHorizontal: space.l, paddingVertical: space.m },
  planCompact: { minHeight: 58, paddingVertical: space.s },
  trialTag: { borderWidth: 1, borderRadius: radius.tab, paddingHorizontal: space.s, paddingVertical: 2 },
  unavailable: { textAlign: 'center', marginVertical: space.xl },
  bottom: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.l, paddingTop: space.m, gap: space.s },
  checkLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s },
  legalText: { fontSize: 11, lineHeight: 15, textAlign: 'center' },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.m },
  legalLink: { fontSize: 12, fontWeight: '600', textDecorationLine: 'underline', paddingVertical: space.xs },
});
