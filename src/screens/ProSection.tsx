import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useTheme, space, type } from '../theme';
import { useApp } from '../state';
import { restorePurchases, isBillingAvailable } from '../purchases';
import { cancelTrialReminder } from '../reminder';
import { getPlanState, openManageSubscriptions, PlanState, rowsFor } from '../plans';
import { Eyebrow, Row, Rows } from '../ui/Kit';

/**
 * Settings, Shot Log Pro. Free: the Pro row (opens the paywall). Pro through
 * a subscription without lifetime: Switch to lifetime ("Pay once, then
 * cancel the subscription"), which opens the paywall with only the Lifetime
 * plan; after that purchase the app offers Apple's Manage Subscriptions
 * sheet (src/plans.ts afterLifetimePurchase). Manage subscription shows for
 * Pro, except with lifetime and nothing renewing. Restore purchases always.
 * The rule for the rows is src/offer.ts proRows, with checks.
 */
export default function ProSection() {
  const theme = useTheme();
  const { isPro, setIsPro, showPaywall, paywall } = useApp();
  const [plan, setPlan] = useState<PlanState | null>(null);

  // Read again whenever Pro changes or a paywall closes (a lifetime purchase changes the rows).
  useEffect(() => {
    if (paywall != null) return;
    let live = true;
    getPlanState().then((p) => live && setPlan(p));
    return () => {
      live = false;
    };
  }, [isPro, paywall]);

  const rows = rowsFor(isPro, plan);
  const lifetime = isPro && plan?.ownsLifetime === true;

  const onRestore = async () => {
    if (!isBillingAvailable()) return Alert.alert('The App Store is not answering', 'Try again in a minute.');
    const res = await restorePurchases();
    if (res.ok) {
      cancelTrialReminder();
      setIsPro(res.isPro);
      setPlan(await getPlanState());
      Alert.alert(res.isPro ? 'Pro is back on' : 'Nothing to restore', res.isPro ? 'Everything is open again.' : 'This Apple ID has no Shot Log Pro purchase.');
    } else Alert.alert('Restore did not work', res.error ?? 'Try once more.');
  };

  return (
    <View>
      <Eyebrow theme={theme}>Shot Log Pro</Eyebrow>
      <Rows theme={theme}>
        <Row
          theme={theme}
          glyph="ring"
          label={isPro ? 'Pro is on' : 'Shot Log Pro'}
          sub={isPro ? (lifetime ? 'Lifetime. Thank you.' : 'Thank you. Everything is open.') : 'A stack, trends, the report and your whole history'}
          onPress={isPro ? undefined : () => showPaywall('pro')}
        />
        {rows.switchToLifetime ? <Row theme={theme} label="Switch to lifetime" sub="Pay once, then cancel the subscription" onPress={() => showPaywall('lifetime', false, 'LIFETIME')} /> : null}
        {rows.manageSubscription ? <Row theme={theme} label="Manage subscription" onPress={openManageSubscriptions} /> : null}
        <Row theme={theme} label="Restore purchases" onPress={onRestore} />
      </Rows>
      <Text style={[type.small, { color: theme.inkSoft, marginTop: space.s }]}>Logging your shots is always free.</Text>
    </View>
  );
}
