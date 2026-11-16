import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useTheme, FONT_FILES, lightTheme, space, type } from './src/theme';
import { AppProvider, useApp, ONBOARDED_KEY, REMINDER_ASKED_KEY } from './src/state';
import { countMeds, countShots, kvGet, kvSet } from './src/db';
import { onSnoozeTapped, snooze } from './src/reminder';
import { maybeRequestReview, recordInstallDay, setReviewGuard } from './src/reviews';
import { autoPaywallAllowed, firstFlowStep, secondShotMet } from './src/flow';
import { FIRST_FLOW_KEY, SECOND_CHANCE_KEY, takeSecondChance } from './src/firstRun';
import { addDays, dayKey, timeLabel } from './src/days';
import type { FeelingEntry, Shot, Weight } from './src/model';
import Today from './src/screens/Today';
import History from './src/screens/History';
import Insights from './src/screens/Insights';
import Report from './src/screens/Report';
import LogShot, { LogShotRequest } from './src/screens/LogShot';
import { FeelTray, WeightTray, EntryRequest } from './src/screens/Entries';
import MedsScreen from './src/screens/Meds';
import SettingsScreen, { resetFirstRun } from './src/screens/Settings';
import ReminderAsk from './src/screens/ReminderAsk';
import ProSection from './src/screens/ProSection';
import PaywallModal from './src/screens/Paywall';
import Welcome, { FirstMedStep, TrackStep, TrialSteps, trialOffer } from './src/screens/Welcome';
import TabRail, { Tab } from './src/ui/TabRail';
import { Eyebrow, Row, Rows, SwitchRow, Toast } from './src/ui/Kit';

/** A screen over the tabs. */
type Over = 'settings' | 'meds' | null;

function Shell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const app = useApp();
  const { ready, notice, say, shots, isPro, setIsPro, paywall, paywallThisLaunch, showPaywall } = app;
  const [tab, setTab] = useState<Tab>('today');
  const [over, setOver] = useState<Over>(null);
  const [overFrom, setOverFrom] = useState<Over>(null);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  // New installs: three value screens, what you are tracking, the first medication, then Home.
  const [step, setStep] = useState<'welcome' | 'track' | 'med'>('welcome');
  const [logShot, setLogShot] = useState<LogShotRequest | null>(null);
  const [weight, setWeight] = useState<EntryRequest<Weight> | null>(null);
  const [feel, setFeel] = useState<EntryRequest<FeelingEntry> | null>(null);
  const [askReminder, setAskReminder] = useState(false);
  // After the first saved shot, once ever: the trial screens (when eligible), then the onboarding paywall.
  const [afterFirst, setAfterFirst] = useState<'idle' | 'trial' | 'paywall'>('idle');
  const firstFlowBusy = useRef(false);
  // Read after awaits, when the closure that started them may be a render behind.
  const latest = useRef({ isPro, paywallThisLaunch, onboarding: onboarded !== true });
  latest.current = { isPro, paywallThisLaunch, onboarding: onboarded !== true };
  const afterFirstRef = useRef(afterFirst);
  afterFirstRef.current = afterFirst;

  useEffect(() => {
    if (!ready || onboarded !== null) return;
    (async () => {
      if ((await kvGet(ONBOARDED_KEY)) === '1') return setOnboarded(true);
      // Anyone who already logged something, or is Pro, has used the app: no onboarding.
      if (isPro || (await countShots()) > 0 || (await countMeds()) > 0) {
        kvSet(ONBOARDED_KEY, '1').catch(() => {});
        return setOnboarded(true);
      }
      setOnboarded(false);
    })().catch(() => setOnboarded(true)); // fail open: never trap anyone
  }, [ready, onboarded, isPro]);

  useEffect(() => {
    if (!ready) return;
    recordInstallDay();
    setReviewGuard(() => ({ onboarding: latest.current.onboarding || afterFirstRef.current !== 'idle', paywallThisLaunch: latest.current.paywallThisLaunch }));
    // "Remind me in an hour" on a due notification.
    return onSnoozeTapped(async (medId) => {
      const at = await snooze(medId);
      if (at) say(`We will remind you again at ${timeLabel(at)}.`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /** Straight to Home after the first medication. 'pending' marks a new install: the trial and paywall come after its first shot. */
  const finishOnboarding = () => {
    kvSet(FIRST_FLOW_KEY, 'pending')
      .then(() => kvSet(ONBOARDED_KEY, '1'))
      .catch(() => {});
    trialOffer();
    setOnboarded(true);
  };

  const openFirstPaywall = () => {
    setAfterFirst('paywall');
    showPaywall('pro', true);
  };

  /**
   * The paywall after the first saved shot, once ever. Runs after the
   * reminder question, and once when the main screen opens in case the app
   * was closed in between. True when it started.
   */
  const runFirstFlow = async (afterSheet: boolean): Promise<boolean> => {
    if (firstFlowBusy.current) return false;
    firstFlowBusy.current = true;
    try {
      const step = firstFlowStep(await kvGet(FIRST_FLOW_KEY), await countShots(), latest.current.isPro);
      // A paywall the person opened themselves this launch: this one waits for the next launch.
      if (step === 'none' || step === 'wait' || (step === 'run' && !autoPaywallAllowed({ isPro: latest.current.isPro, shownThisLaunch: latest.current.paywallThisLaunch }))) {
        firstFlowBusy.current = false;
        return false;
      }
      await kvSet(FIRST_FLOW_KEY, 'done');
      if (step === 'skip') {
        firstFlowBusy.current = false;
        return false;
      }
      // Shown today; a later calendar day gets one more look if it is closed without buying.
      await kvSet(SECOND_CHANCE_KEY, dayKey(Date.now()));
      if (await trialOffer()) setAfterFirst('trial');
      else setTimeout(openFirstPaywall, afterSheet ? 450 : 0);
      return true;
    } catch {
      firstFlowBusy.current = false;
      return false;
    }
  };

  // When the onboarding paywall closes (purchase or the X), back to Today.
  useEffect(() => {
    if (paywall != null || afterFirst !== 'paywall') return;
    setAfterFirst('idle');
    firstFlowBusy.current = false;
  }, [paywall, afterFirst]);

  /** After a shot is saved: the reminder question once, then the first-shot moment, else the rating trigger. */
  const afterShot = async (saved: Shot | null) => {
    setLogShot(null);
    if (!saved) return;
    if ((await kvGet(REMINDER_ASKED_KEY)) !== '1') {
      // After the sheet has faded, so iOS is not asked to show one modal while another leaves.
      setTimeout(() => setAskReminder(true), 450);
      return;
    }
    if (await runFirstFlow(true)) return;
    if (secondShotMet(await countShots())) maybeRequestReview('secondShot');
  };

  const answerReminder = async () => {
    setAskReminder(false);
    await kvSet(REMINDER_ASKED_KEY, '1').catch(() => {});
    runFirstFlow(true);
  };

  if (!ready || onboarded === null) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  if (!onboarded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        {step === 'welcome' && <Welcome onDone={() => setStep('track')} />}
        {step === 'track' && <TrackStep onDone={() => setStep('med')} />}
        {step === 'med' && <FirstMedStep onDone={finishOnboarding} />}
      </View>
    );
  }

  const openMeds = (from: Over) => {
    setOverFrom(from);
    setOver('meds');
  };

  let body: React.ReactNode;
  if (over === 'meds') body = <MedsScreen onBack={() => setOver(overFrom === 'settings' ? 'settings' : null)} />;
  else if (over === 'settings')
    body = (
      <SettingsScreen
        onBack={() => setOver(null)}
        onMeds={() => openMeds('settings')}
        slots={{
          pro: <ProSection />,
          testing: (open) =>
            open ? (
              <View>
                <Eyebrow theme={theme}>Testing tools (test builds only)</Eyebrow>
                <Rows theme={theme}>
                  <SwitchRow theme={theme} label="Act as a free user" value={app.actFree} onChange={(v) => app.setActFree(v)} />
                  <Row
                    theme={theme}
                    label="Show the first-shot moment again"
                    sub="The reminder question, the trial screens and the paywall, after the next shot"
                    onPress={async () => {
                      await resetFirstRun();
                      await kvSet(REMINDER_ASKED_KEY, '0');
                      say('Log a shot to see it again.');
                    }}
                  />
                  <Row
                    theme={theme}
                    label="Show onboarding again"
                    onPress={async () => {
                      await kvSet(ONBOARDED_KEY, '0');
                      setOver(null);
                      setStep('welcome');
                      setOnboarded(false);
                    }}
                  />
                </Rows>
              </View>
            ) : null,
        }}
      />
    );
  else if (tab === 'today')
    body = (
      <Today
        onLogShot={(medId) => setLogShot({ shot: null, medId })}
        onMeds={() => openMeds(null)}
        onSettings={() => setOver('settings')}
        onWeight={() => setWeight({ entry: null })}
        onFeel={() => setFeel({ entry: null })}
      />
    );
  else if (tab === 'history')
    body = (
      <History
        onShot={(s) => setLogShot({ shot: s })}
        onWeight={(w) => setWeight({ entry: w })}
        onFeel={(f) => setFeel({ entry: f })}
        onAddShot={() => setLogShot({ shot: null, past: true, day: addDays(dayKey(Date.now()), -1) })}
        onAddWeight={() => setWeight({ entry: null, day: addDays(dayKey(Date.now()), -1) })}
        onAddFeel={() => setFeel({ entry: null, day: addDays(dayKey(Date.now()), -1) })}
      />
    );
  else if (tab === 'insights') body = <Insights />;
  else body = <Report />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <LaunchChecks runFirstFlow={() => runFirstFlow(false)} />
      <View style={{ flex: 1 }}>{body}</View>
      {over == null ? <TabRail theme={theme} tab={tab} onTab={setTab} /> : null}
      <Toast theme={theme} text={notice} bottom={over == null ? 64 + insets.bottom : insets.bottom} />
      <LogShot request={logShot} onClose={afterShot} />
      <WeightTray request={weight} onClose={() => setWeight(null)} />
      <FeelTray request={feel} onClose={() => setFeel(null)} />
      <ReminderAsk visible={askReminder} onDone={answerReminder} />
      {afterFirst === 'trial' && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
          <TrialSteps onDone={openFirstPaywall} />
        </View>
      )}
      <PaywallModal />
    </View>
  );
}

/**
 * Once per launch, from the main screen, at most one of these (never two
 * paywalls in a launch):
 *   1. the after-first-shot moment, if the app closed before it ran
 *   2. the paywall's second chance, on a later calendar day
 */
function LaunchChecks({ runFirstFlow }: { runFirstFlow: () => Promise<boolean> }) {
  const { isPro, showPaywall, paywallThisLaunch } = useApp();
  useEffect(() => {
    (async () => {
      if (await runFirstFlow()) return;
      if ((await takeSecondChance(isPro)) && autoPaywallAllowed({ isPro, shownThisLaunch: paywallThisLaunch })) showPaywall('pro');
    })().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** A failure while a screen renders: shown instead of a frozen page. Nothing logged is lost; it is all on disk. */
class Guard extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const t = lightTheme;
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, padding: space.l, paddingTop: 80 }}>
        <Text style={[type.title, { color: t.ink }]}>Something went wrong on this screen.</Text>
        <Text style={[type.body, { color: t.ink, marginTop: space.s }]}>Close the app and open it again. Your shots and entries are saved on this iPhone.</Text>
        <Text style={[type.small, { color: t.inkFaint, marginTop: space.l }]}>{error.message}</Text>
      </View>
    );
  }
}

export default function App() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  // If the fonts are still not in after a few seconds, open anyway with the system font.
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGaveUp(true), 6000);
    return () => clearTimeout(t);
  }, []);
  // The page's colour while fonts load, so launch never flashes.
  if (!fontsLoaded && !fontError && !gaveUp) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  return (
    <Guard>
      <SafeAreaProvider>
        <AppProvider>
          <Shell />
        </AppProvider>
      </SafeAreaProvider>
    </Guard>
  );
}
