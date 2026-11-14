import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as RNAppState } from 'react-native';
import { initPurchases, getIsPro, checkPro, onProChange } from './purchases';
import { getFeelings, getIntake, getMeds, getShots, getWeights, kvAll, kvGet, kvSet } from './db';
import { syncShotReminders, syncTrialReminder } from './reminder';
import { hasSandboxPro } from './testing';
import { activeMeds, type ProFeature } from './gates';
import { DEFAULT_REMINDER_MINUTES } from './schedule';
import type { FeelingEntry, Intake, Med, Shot, Track, Weight, WeightUnit } from './model';

export interface Settings {
  /** "What are you tracking?" Words only. */
  track: Track;
  weightUnit: WeightUnit;
  /** In weightUnit, or null when not set. */
  weightGoal: number | null;
  /** Grams a day, set by the person; null until they set one. No recommended targets. */
  proteinGoal: number | null;
  /** mL (kg) or fl oz (lb) a day; null until set. */
  waterGoal: number | null;
  /** Shot reminders on (asked after the first saved shot). */
  reminders: boolean;
  /** Minutes after midnight on the due day. */
  reminderMinutes: number;
  /** Protein and water counters on Today. */
  showIntake: boolean;
  /** Printed on the report; optional. */
  patientName: string;
}

export const DEFAULT_SETTINGS: Settings = {
  track: 'glp1',
  weightUnit: 'lb',
  weightGoal: null,
  proteinGoal: null,
  waterGoal: null,
  reminders: false,
  reminderMinutes: DEFAULT_REMINDER_MINUTES,
  showIntake: true,
  patientName: '',
};

export const SETTING_PREFIX = 'setting.';
export const ONBOARDED_KEY = 'flag.onboarded';
/** Set once the reminder question after the first shot has been answered. */
export const REMINDER_ASKED_KEY = 'flag.reminderAsked';
/** Test builds only: Pro is ignored on this phone while this is on. */
const ACT_FREE_KEY = 'test.actFree';

const num = (v: unknown, min: number, max: number): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null);

/** Settings from their stored rows, with defaults for anything missing or unreadable. */
export function parseSettings(rows: Record<string, string>): Settings {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rows)) {
    try {
      raw[k] = JSON.parse(v);
    } catch {
      // one bad row falls back to its default
    }
  }
  const track = raw.track === 'glp1' || raw.track === 'peptides' || raw.track === 'other' ? raw.track : DEFAULT_SETTINGS.track;
  const minutes = num(raw.reminderMinutes, 0, 24 * 60 - 1);
  return {
    track,
    weightUnit: raw.weightUnit === 'kg' ? 'kg' : raw.weightUnit === 'lb' ? 'lb' : DEFAULT_SETTINGS.weightUnit,
    weightGoal: num(raw.weightGoal, 1, 1500),
    proteinGoal: num(raw.proteinGoal, 1, 1000),
    waterGoal: num(raw.waterGoal, 1, 20000),
    reminders: raw.reminders === true,
    reminderMinutes: minutes == null ? DEFAULT_REMINDER_MINUTES : Math.round(minutes),
    showIntake: raw.showIntake !== false,
    patientName: typeof raw.patientName === 'string' ? raw.patientName.slice(0, 80) : '',
  };
}

/** Why the in-app paywall opened; it changes one line on it. 'pro' is the general one. */
export type PaywallReason = ProFeature | 'pro';

export interface PaywallRequest {
  reason: PaywallReason;
  /** The onboarding paywall: weekly with the trial preselected, X after 3 seconds. */
  onboarding: boolean;
}

interface AppState {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  isPro: boolean;
  setIsPro: (v: boolean) => void;
  /** Development, or Pro from a sandbox (TestFlight) purchase. */
  testBuild: boolean;
  actFree: boolean;
  setActFree: (v: boolean) => Promise<void>;
  paywall: PaywallRequest | null;
  /** Opens the paywall. A tap on something Pro always opens it. */
  showPaywall: (reason: PaywallReason, onboarding?: boolean) => void;
  hidePaywall: () => void;
  /** True once any paywall has shown in this launch (the app never opens a second one on its own). */
  paywallThisLaunch: boolean;
  ready: boolean;
  meds: Med[];
  /** The medications logged and reminded: all for Pro, the first for free. */
  active: Med[];
  /** Newest first. */
  shots: Shot[];
  weights: Weight[];
  feelings: FeelingEntry[];
  intake: Intake[];
  /** Reloads everything after a change. */
  refresh: () => Promise<void>;
  /** A one-line note at the bottom of the screen for a few seconds. */
  notice: string | null;
  say: (text: string) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const settingsRef = useRef(settings);
  const [storePro, setIsPro] = useState(false);
  const [sandbox, setSandbox] = useState(false);
  const [actFree, setActFreeState] = useState(false);
  const [paywall, setPaywall] = useState<PaywallRequest | null>(null);
  const [paywallThisLaunch, setPaywallThisLaunch] = useState(false);
  const [ready, setReady] = useState(false);
  const [meds, setMeds] = useState<Med[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [weights, setWeights] = useState<Weight[]>([]);
  const [feelings, setFeelings] = useState<FeelingEntry[]>([]);
  const [intake, setIntake] = useState<Intake[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useCallback((text: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = setTimeout(() => setNotice(null), 4200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [m, s, w, f, i] = await Promise.all([getMeds(), getShots(), getWeights(), getFeelings(), getIntake()]);
      setMeds(m);
      setShots(s);
      setWeights(w);
      setFeelings(f);
      setIntake(i);
    } catch {
      // keep what is on screen
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = parseSettings(await kvAll(SETTING_PREFIX));
        settingsRef.current = s;
        setSettings(s);
        setActFreeState((await kvGet(ACT_FREE_KEY)) === '1');
        await refresh();
      } catch {
        // unreadable storage -> defaults
      }
      try {
        await initPurchases();
        setIsPro(await getIsPro());
        setSandbox(await hasSandboxPro());
      } catch {
        setIsPro(false);
      }
      setReady(true);
    })();
  }, [refresh]);

  // Keep Pro in step with the store without a relaunch (renewals, expiries,
  // refunds), and re-check after a real trip to the background. The same
  // foreground check drops the trial reminder once the trial is over and
  // reloads the data, so a new day shows the right due line.
  useEffect(() => {
    if (!ready) return;
    syncTrialReminder();
    const unsubscribe = onProChange((v) => {
      setIsPro(v);
      hasSandboxPro().then(setSandbox);
    });
    let wasBackground = false;
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'background') wasBackground = true;
      if (s !== 'active' || !wasBackground) return;
      wasBackground = false;
      checkPro().then((v) => {
        if (v !== null) setIsPro(v);
      });
      syncTrialReminder();
      refresh();
    });
    return () => {
      unsubscribe();
      sub.remove();
    };
  }, [ready, refresh]);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    try {
      for (const [k, v] of Object.entries(patch)) await kvSet(SETTING_PREFIX + k, JSON.stringify(v));
    } catch {
      // non-fatal: the value still applies for this launch
    }
  }, []);

  const testBuild = __DEV__ || sandbox;

  const setActFree = useCallback(
    async (v: boolean) => {
      if (!testBuild) return;
      setActFreeState(v);
      await kvSet(ACT_FREE_KEY, v ? '1' : '0').catch(() => {});
    },
    [testBuild]
  );

  const isPro = storePro && !(testBuild && actFree);
  const active = useMemo(() => activeMeds(meds, isPro), [meds, isPro]);

  // Reminders follow the schedule: rescheduled whenever shots, medications, Pro or the settings change.
  useEffect(() => {
    if (!ready) return;
    syncShotReminders(active, shots, settings).catch(() => {});
  }, [ready, active, shots, settings]);

  const showPaywall = useCallback((reason: PaywallReason, onboarding = false) => {
    setPaywallThisLaunch(true);
    setPaywall({ reason, onboarding });
  }, []);

  const value = useMemo<AppState>(
    () => ({
      settings,
      updateSettings,
      isPro,
      setIsPro,
      testBuild,
      actFree: testBuild && actFree,
      setActFree,
      paywall,
      showPaywall,
      hidePaywall: () => setPaywall(null),
      paywallThisLaunch,
      ready,
      meds,
      active,
      shots,
      weights,
      feelings,
      intake,
      refresh,
      notice,
      say,
    }),
    [settings, updateSettings, isPro, testBuild, actFree, setActFree, paywall, showPaywall, paywallThisLaunch, ready, meds, active, shots, weights, feelings, intake, refresh, notice, say]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
