import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, fonts, radius, space, tabular, type, Theme } from '../theme';
import { useApp } from '../state';
import { getOffering } from '../purchases';
import { getTrialEligibleIds, trialLabel } from '../trial';
import { requestReminderPermission } from '../reminder';
import { trialLength } from '../offer';
import { TRACKS } from '../labels';
import type { Track } from '../model';
import Glyph from '../ui/Glyph';
import BodyMap from '../ui/BodyMap';
import AppMark from '../ui/AppMark';
import { Button, Eyebrow, Leaf, LinkText, Radio, Tap } from '../ui/Kit';
import { MedDraft, MedForm, blankDraft, saveNewMed } from './Meds';

/**
 * First launch, in this order (App.tsx runs it). Nothing here asks for
 * money: the trial screens and the paywall come after the first saved shot.
 *   1-3. three value screens, each showing the real thing it promises
 *   4.   "What are you tracking?" (labels only)
 *   5.   "Add your first medication."
 *   then Home.
 * TrialSteps (Try it free, the day-before reminder) is used later, after
 * the first shot, only when this Apple ID can get the trial.
 */
const PAGES: { title: string; line: string; show: 'log' | 'next' | 'report' }[] = [
  { title: 'Log a shot in seconds.', line: 'One tap opens the log with your dose and the next site already filled in. Save, and it is done.', show: 'log' },
  { title: 'Always know when, and where.', line: 'When the next shot is due, and where it goes next in your own rotation, the moment you open the app.', show: 'next' },
  { title: 'Bring your prescriber a clean record.', line: 'Doses with dates, every shot and site, weight and side effects, on a page you can share or print.', show: 'report' },
];

interface TrialOffer {
  /** "3 days" */
  length: string;
  /** "$6.99 a week" */
  then: string;
}

let offerPromise: Promise<TrialOffer | null> | null = null;

/** The trial to offer, or null when not eligible or the store can't answer. */
async function loadTrialOffer(): Promise<TrialOffer | null> {
  const off = await getOffering();
  const pkg = off?.weekly;
  if (!pkg) return null;
  if (!trialLabel(pkg, await getTrialEligibleIds([pkg]))) return null;
  const length = trialLength(pkg.product.introPrice);
  if (!length) return null;
  return { length, then: `${pkg.product.priceString} a week` };
}

/** Starts the eligibility check early; it is ready long before the trial screen. */
export function trialOffer(): Promise<TrialOffer | null> {
  if (!offerPromise) offerPromise = loadTrialOffer().catch(() => null);
  return offerPromise;
}

export default function Welcome({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const page = PAGES[step];
  return (
    <Page
      theme={theme}
      title={page.title}
      line={page.line}
      dots={{ count: PAGES.length, active: step }}
      button="Continue"
      onPress={() => (step < PAGES.length - 1 ? setStep(step + 1) : onDone())}
      show={<Showcase theme={theme} what={page.show} />}
    />
  );
}

/** The real parts of the app, drawn with the app's own kit, as each value screen's picture. */
function Showcase({ theme, what }: { theme: Theme; what: 'log' | 'next' | 'report' }) {
  if (what === 'log') {
    return (
      <Leaf theme={theme} style={styles.show}>
        <Eyebrow theme={theme}>Log shot</Eyebrow>
        <View style={styles.showRow}>
          <View style={{ flex: 1, gap: space.s }}>
            <Text style={[type.title, { color: theme.ink }]}>Your medication</Text>
            <Text style={[type.body, { color: theme.inkSoft }, tabular]}>Your dose, as you typed it</Text>
            <Text style={[type.small, { color: theme.inkSoft }]}>Right abdomen, now</Text>
          </View>
          <BodyMap theme={theme} width={128} picked="abdomen-right" last="abdomen-left" caption={false} />
        </View>
        <View style={[styles.fakeSave, { backgroundColor: theme.live }]}>
          <Text style={[type.body, styles.semi, { color: theme.onLive }]}>Save</Text>
        </View>
      </Leaf>
    );
  }
  if (what === 'next') {
    return (
      <Leaf theme={theme} margin style={[styles.show, { paddingLeft: space.xxl }]}>
        <View style={styles.showRow}>
          <View style={{ flex: 1 }}>
            <Eyebrow theme={theme}>Next shot</Eyebrow>
            <Text style={[type.display, { color: theme.ink }]}>Due Thursday</Text>
            <Text style={[type.small, { color: theme.inkSoft }]}>In 5 days</Text>
          </View>
          <BodyMap theme={theme} width={128} last="abdomen-left" next="abdomen-right" caption={false} />
        </View>
        <Text style={[type.small, styles.showRule, { color: theme.inkSoft, borderTopColor: theme.rule }]}>Last: left abdomen. Next in your rotation: right abdomen.</Text>
      </Leaf>
    );
  }
  return (
    <View style={[styles.paper, { backgroundColor: theme.isDark ? '#E9E5DC' : '#FFFFFF', borderColor: theme.edge }]}>
      <Text style={styles.paperH}>Injection log</Text>
      <Text style={styles.paperMeta}>Dates: last 90 days</Text>
      <View style={styles.paperBoxes}>
        {['Shots logged', 'Latest weight', 'Side effects'].map((l) => (
          <View key={l} style={styles.paperBox}>
            <View style={[styles.paperBar, { width: 26 }]} />
            <Text style={styles.paperL}>{l}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.paperH2}>Medication and dose history</Text>
      {[0.9, 0.7, 0.8].map((w, i) => (
        <View key={i} style={[styles.paperLine, { width: `${w * 100}%` }]} />
      ))}
      <Text style={styles.paperH2}>Weight</Text>
      <View style={styles.paperChart}>
        {[34, 30, 31, 27, 25, 26, 22, 19, 18, 15].map((h, i) => (
          <View key={i} style={[styles.paperDot, { bottom: h, left: `${i * 10 + 4}%` }]} />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.paperTick, { left: `${i * 26 + 8}%` }]} />
        ))}
      </View>
      <Text style={styles.paperFoot}>Logged by the patient with Shot Log. Not medical advice.</Text>
    </View>
  );
}

/** "What are you tracking?" Labels only; nothing else changes. */
export function TrackStep({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useApp();
  const [picked, setPicked] = useState<Track>(settings.track);
  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingBottom: Math.max(insets.bottom, space.l) }]}>
      <ScrollView contentContainerStyle={styles.listPage}>
        <Text style={[type.display, { color: theme.ink }]} accessibilityRole="header">
          What are you tracking?
        </Text>
        <Text style={[type.body, styles.line, { color: theme.inkSoft }]}>Pick the closest. It only sets a label, and you can change it in Settings.</Text>
        <View style={[styles.choices, { backgroundColor: theme.surface, borderColor: theme.edge }]} accessibilityRole="radiogroup">
          {TRACKS.map((t, i) => (
            <Tap
              key={t.id}
              onPress={() => setPicked(t.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: picked === t.id }}
              accessibilityLabel={`${t.label}, ${t.sub}`}
              style={[styles.choiceRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }, picked === t.id && { backgroundColor: theme.picked }]}
              pressedStyle={{ backgroundColor: theme.well }}
            >
              <Radio theme={theme} on={picked === t.id} />
              <View style={{ flex: 1 }}>
                <Text style={[type.body, styles.semi, { color: theme.ink }]}>{t.label}</Text>
                <Text style={[type.small, { color: theme.inkSoft }]}>{t.sub}</Text>
              </View>
            </Tap>
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          theme={theme}
          live
          label="Continue"
          onPress={() => {
            updateSettings({ track: picked });
            onDone();
          }}
        />
      </View>
    </View>
  );
}

/** "Add your first medication." Saved with Continue; Skip goes to Home with the add button there. */
export function FirstMedStep({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { refresh } = useApp();
  const [draft, setDraft] = useState<MedDraft>(blankDraft());
  const [busy, setBusy] = useState(false);
  const valid = draft.name.trim().length > 0 && (draft.kind === 'interval' || draft.weekdays.length > 0);
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { backgroundColor: theme.bg, paddingBottom: Math.max(insets.bottom, space.l) }]}>
      <ScrollView contentContainerStyle={[styles.listPage, { gap: space.xl }]} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={[type.display, { color: theme.ink }]} accessibilityRole="header">
            Add your first medication.
          </Text>
          <Text style={[type.body, styles.line, { color: theme.inkSoft }]}>The name you use, the dose your prescriber gave you, and how often. The app never suggests or changes a dose.</Text>
        </View>
        <MedForm theme={theme} draft={draft} onChange={setDraft} newMed />
      </ScrollView>
      <View style={styles.footer}>
        <Button
          theme={theme}
          live
          label={busy ? 'Saving' : 'Continue'}
          disabled={!valid || busy}
          onPress={async () => {
            setBusy(true);
            try {
              await saveNewMed(draft);
              await refresh();
            } finally {
              setBusy(false);
            }
            onDone();
          }}
        />
        <View style={styles.center}>
          <LinkText theme={theme} label="Skip for now" onPress={onDone} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/** The trial and reminder screens, after the first shot. Calls onDone right away when no trial is on offer. */
export function TrialSteps({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [offer, setOffer] = useState<TrialOffer | null | undefined>(undefined);
  const [step, setStep] = useState<'trial' | 'remind'>('trial');
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    let live = true;
    trialOffer().then((o) => {
      if (!live) return;
      if (o) setOffer(o);
      else onDone();
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!offer) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center' }]}>
        <ActivityIndicator color={theme.inkSoft} />
      </View>
    );
  }

  if (step === 'trial') {
    return (
      <Page
        theme={theme}
        title={`Try it free for ${offer.length}.`}
        line={`Then ${offer.then}. Cancel in Settings any time before it ends.`}
        button="Continue"
        onPress={() => setStep('remind')}
        noPayment
        show={<TrialTimeline theme={theme} length={offer.length} then={offer.then} />}
      />
    );
  }

  return (
    <Page
      theme={theme}
      title="We’ll remind you the day before it ends."
      line="One notification on this iPhone. Nothing else changes."
      show={
        <View style={[styles.banner, { backgroundColor: theme.surface, borderColor: theme.edge }]}>
          <View style={styles.bannerIcon}>
            <AppMark size={32} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.small, styles.semi, { color: theme.ink }]}>Your free trial ends tomorrow</Text>
            <Text style={[type.small, { color: theme.inkSoft }]}>Shot Log Pro renews tomorrow. Cancel anytime in Settings, Apple ID, Subscriptions.</Text>
          </View>
        </View>
      }
      button="Continue"
      waiting={waiting}
      onPress={async () => {
        // Ask iOS, then on to the paywall whatever the answer. The shot reminder choice stays as it was.
        setWaiting(true);
        await requestReminderPermission();
        setWaiting(false);
        onDone();
      }}
    />
  );
}

function TrialTimeline({ theme, length, then }: { theme: Theme; length: string; then: string }) {
  const rows = [
    { glyph: 'check' as const, title: 'Today', line: 'Everything in Pro opens. No payment now.' },
    { glyph: 'bell' as const, title: 'The day before it ends', line: 'A reminder on this iPhone.' },
    { glyph: 'calendar' as const, title: `After ${length}`, line: `${then[0].toUpperCase()}${then.slice(1)}, unless you cancel.` },
  ];
  return (
    <Leaf theme={theme} style={styles.show}>
      {rows.map((r, i) => (
        <View key={r.title} style={[styles.timeRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.rule }]} accessible accessibilityLabel={`${r.title}. ${r.line}`}>
          <Glyph name={r.glyph} size={22} color={theme.ink} />
          <View style={{ flex: 1 }}>
            <Text style={[type.body, styles.semi, { color: theme.ink }]}>{r.title}</Text>
            <Text style={[type.small, { color: theme.inkSoft }]}>{r.line}</Text>
          </View>
        </View>
      ))}
    </Leaf>
  );
}

/**
 * One idea per screen: the real thing it is about, one large line, one
 * line under it, the dots and Continue.
 */
function Page({
  theme,
  title,
  line,
  dots,
  button,
  onPress,
  waiting = false,
  noPayment = false,
  show,
}: {
  theme: Theme;
  title: string;
  line?: string;
  dots?: { count: number; active: number };
  button: string;
  onPress: () => void;
  waiting?: boolean;
  noPayment?: boolean;
  show?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { backgroundColor: theme.bg, paddingBottom: Math.max(insets.bottom, space.l) }]}>
      <View style={styles.words}>
        {show ? (
          <View style={styles.showWrap} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {show}
          </View>
        ) : null}
        <Text style={[type.display, { color: theme.ink }]} accessibilityRole="header">
          {title}
        </Text>
        {line ? <Text style={[type.body, styles.line, { color: theme.inkSoft }]}>{line}</Text> : null}
      </View>
      {dots && (
        <View style={styles.dots} accessible accessibilityLabel={`Page ${dots.active + 1} of ${dots.count}`}>
          {Array.from({ length: dots.count }, (_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === dots.active ? theme.ink : theme.rule }, i === dots.active && styles.dotOn]} />
          ))}
        </View>
      )}
      <View style={styles.footer}>
        {waiting ? <ActivityIndicator color={theme.inkSoft} style={styles.waiting} /> : <Button theme={theme} live label={button} onPress={onPress} />}
        {noPayment && (
          <View style={styles.noPaymentRow}>
            <Glyph name="check" size={18} color={theme.ink} weight={2.2} />
            <Text style={[type.body, styles.semi, { color: theme.ink }]}>No payment now</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const PAPER_INK = '#15171A';
const PAPER_SOFT = '#6A6D72';

const styles = StyleSheet.create({
  container: { flex: 1 },
  words: { flex: 1, justifyContent: 'center', paddingHorizontal: space.xl },
  showWrap: { marginBottom: space.xxl },
  show: { gap: space.m },
  showRow: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  showRule: { paddingTop: space.m, borderTopWidth: StyleSheet.hairlineWidth },
  fakeSave: { minHeight: 44, borderRadius: radius.tab, alignItems: 'center', justifyContent: 'center' },
  semi: { fontWeight: '600' },
  center: { alignItems: 'center' },
  listPage: { paddingTop: space.xxl, paddingBottom: space.xl, paddingHorizontal: space.l },
  line: { marginTop: space.m },
  choices: { marginTop: space.xl, borderRadius: radius.leaf, borderWidth: 1, overflow: 'hidden' },
  choiceRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 64, paddingHorizontal: space.l, paddingVertical: space.m },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.s, marginBottom: space.l },
  dot: { width: space.s, height: space.s, borderRadius: radius.round },
  dotOn: { width: space.xl },
  footer: { paddingHorizontal: space.l, gap: space.s, paddingTop: space.m },
  waiting: { height: 50 },
  noPaymentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.s, minHeight: 32 },
  banner: { flexDirection: 'row', gap: space.m, alignItems: 'flex-start', borderWidth: 1, borderRadius: radius.leaf, padding: space.m },
  bannerIcon: { width: 32, height: 32 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.s },
  paper: { borderWidth: 1, borderRadius: radius.tab / 2, padding: space.l, transform: [{ rotate: '-1.5deg' }] },
  paperH: { fontFamily: fonts.serif, fontSize: 18, color: PAPER_INK },
  paperMeta: { fontSize: 10, color: PAPER_SOFT, marginTop: 2 },
  paperBoxes: { flexDirection: 'row', gap: space.s, marginTop: space.m },
  paperBox: { flex: 1, borderWidth: 1, borderColor: '#CFCFCF', borderRadius: 4, padding: space.s, gap: space.xs },
  paperBar: { height: 8, borderRadius: 2, backgroundColor: PAPER_INK },
  paperL: { fontSize: 9, color: PAPER_SOFT },
  paperH2: { fontFamily: fonts.serif, fontSize: 12, color: PAPER_INK, marginTop: space.m, marginBottom: space.xs, borderBottomWidth: 1, borderBottomColor: '#CFCFCF' },
  paperLine: { height: 5, borderRadius: 2, backgroundColor: '#D9D9D9', marginTop: space.xs },
  paperChart: { height: 48, marginTop: space.xs, borderBottomWidth: 1, borderBottomColor: '#CFCFCF' },
  paperDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: PAPER_INK },
  paperTick: { position: 'absolute', bottom: -6, width: 2, height: 6, backgroundColor: '#2747C9' },
  paperFoot: { fontSize: 8.5, color: PAPER_SOFT, marginTop: space.m },
});
