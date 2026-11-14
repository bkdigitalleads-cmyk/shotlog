import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useTheme, FONT_FILES, lightTheme, space, type } from './src/theme';
import { AppProvider, useApp, REMINDER_ASKED_KEY } from './src/state';
import { kvGet, kvSet } from './src/db';
import { onSnoozeTapped, snooze } from './src/reminder';
import { maybeRequestReview, recordInstallDay, setReviewGuard } from './src/reviews';
import { secondShotMet } from './src/flow';
import { addDays, dayKey, timeLabel } from './src/days';
import type { FeelingEntry, Shot, Weight } from './src/model';
import Today from './src/screens/Today';
import History from './src/screens/History';
import LogShot, { LogShotRequest } from './src/screens/LogShot';
import { FeelTray, WeightTray, EntryRequest } from './src/screens/Entries';
import MedsScreen from './src/screens/Meds';
import SettingsScreen from './src/screens/Settings';
import ReminderAsk from './src/screens/ReminderAsk';
import TabRail, { Tab } from './src/ui/TabRail';
import { PageTitle, Toast } from './src/ui/Kit';

/** A screen over the tabs. */
type Over = 'settings' | 'meds' | null;

function Shell() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { ready, notice, say, shots, paywallThisLaunch } = useApp();
  const [tab, setTab] = useState<Tab>('today');
  const [over, setOver] = useState<Over>(null);
  const [overFrom, setOverFrom] = useState<Over>(null);
  const [logShot, setLogShot] = useState<LogShotRequest | null>(null);
  const [weight, setWeight] = useState<EntryRequest<Weight> | null>(null);
  const [feel, setFeel] = useState<EntryRequest<FeelingEntry> | null>(null);
  const [askReminder, setAskReminder] = useState(false);
  const guardRef = useRef({ onboarding: false, paywallThisLaunch });
  guardRef.current = { onboarding: false, paywallThisLaunch };

  useEffect(() => {
    if (!ready) return;
    recordInstallDay();
    setReviewGuard(() => guardRef.current);
    // "Remind me in an hour" on a due notification.
    return onSnoozeTapped(async (medId) => {
      const atMs = await snooze(medId);
      if (atMs) say(`We will remind you again at ${timeLabel(atMs)}.`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  /** After a shot is saved: the reminder question once, then the rating trigger. */
  const afterShot = async (saved: Shot | null) => {
    setLogShot(null);
    if (!saved) return;
    if ((await kvGet(REMINDER_ASKED_KEY)) !== '1') {
      // After the sheet has faded, so iOS is not asked to show one modal while another leaves.
      setTimeout(() => setAskReminder(true), 450);
      return;
    }
    if (secondShotMet(shots.length + 1)) maybeRequestReview('secondShot');
  };

  const answerReminder = async () => {
    setAskReminder(false);
    await kvSet(REMINDER_ASKED_KEY, '1').catch(() => {});
  };

  if (!ready) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  const openMeds = (from: Over) => {
    setOverFrom(from);
    setOver('meds');
  };

  let body: React.ReactNode;
  if (over === 'meds') body = <MedsScreen onBack={() => setOver(overFrom === 'settings' ? 'settings' : null)} />;
  else if (over === 'settings') body = <SettingsScreen onBack={() => setOver(null)} onMeds={() => openMeds('settings')} />;
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
        onAddShot={() => setLogShot({ shot: null, past: true })}
        onAddWeight={() => setWeight({ entry: null, day: addDays(dayKey(Date.now()), -1) })}
        onAddFeel={() => setFeel({ entry: null, day: addDays(dayKey(Date.now()), -1) })}
      />
    );
  else body = <PageTitle theme={theme} title={tab === 'insights' ? 'Insights' : 'Report'} />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>{body}</View>
      {over == null ? <TabRail theme={theme} tab={tab} onTab={setTab} /> : null}
      <Toast theme={theme} text={notice} bottom={over == null ? 64 + insets.bottom : insets.bottom} />
      <LogShot request={logShot} onClose={afterShot} />
      <WeightTray request={weight} onClose={() => setWeight(null)} />
      <FeelTray request={feel} onClose={() => setFeel(null)} />
      <ReminderAsk visible={askReminder} onDone={answerReminder} />
    </View>
  );
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
