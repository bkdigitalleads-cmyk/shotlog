// Unit checks for the pure logic: next-due dates on both schedule types and
// across dose changes, site rotation, weights and side effects, the free
// gates, the report and CSV, trial and plan rules, the first-run paywall
// flow and the rating guard. Run with `npm test` (Node 22+ strips the
// TypeScript types itself). Times are on the New York clock, which has a
// daylight saving change on Nov 1, 2026.
process.env.TZ = 'America/New_York';

import { test } from 'node:test';
import assert from 'node:assert/strict';

const D = await import('../src/days.ts');
const S = await import('../src/schedule.ts');
const T = await import('../src/sites.ts');
const G = await import('../src/gates.ts');
const O = await import('../src/offer.ts');
const F = await import('../src/flow.ts');

/** Local time on a day: at('2026-11-14', 9, 30). */
const at = (day, h = 12, m = 0) => D.atTime(day, h, m);
// "Now" for most checks: Saturday Nov 14, 2026, 10 am in New York.
const NOW = at('2026-11-14', 10);
const TODAY = '2026-11-14';

let nextId = 1;
const shot = (day, o = {}) => ({ id: nextId++, medId: 1, medName: 'Semaglutide', at: at(day, o.h ?? 9), amount: '0.5', unit: 'mg', site: null, note: '', backfilled: false, createdAt: 0, ...o });
const change = (fromDay, amount, unit = 'mg') => ({ id: nextId++, medId: 1, fromDay, amount, unit });

// ---------- next due ----------

test('every N days: due N days after the last shot, from the start day before any shot', () => {
  const weekly = { kind: 'interval', everyDays: 7 };
  assert.equal(S.nextDueDay(weekly, '2026-11-12', null), '2026-11-12');
  assert.equal(S.nextDueDay(weekly, '2026-11-01', '2026-11-12'), '2026-11-19');
  // A late shot moves the next one with it.
  assert.equal(S.nextDueDay(weekly, '2026-11-01', '2026-11-14'), '2026-11-21');
  // Across the daylight saving change (Nov 1): still the same weekday.
  assert.equal(S.nextDueDay(weekly, '2026-10-01', '2026-10-29'), '2026-11-05');
  assert.equal(S.nextDueDay({ kind: 'interval', everyDays: 1 }, '2026-11-01', '2026-11-14'), '2026-11-15');
  assert.equal(S.nextDueDay({ kind: 'interval', everyDays: 3 }, '2026-11-01', '2026-11-30'), '2026-12-03');
});

test('chosen weekdays: the next chosen day, and an early or late shot counts for the nearest one', () => {
  const thu = { kind: 'weekdays', days: [3] }; // Monday = 0
  // Before any shot: the first Thursday on or after the start (Nov 12, 2026 is a Thursday).
  assert.equal(S.nextDueDay(thu, '2026-11-10', null), '2026-11-12');
  assert.equal(S.nextDueDay(thu, '2026-11-12', null), '2026-11-12');
  // On time.
  assert.equal(S.nextDueDay(thu, '2026-11-01', '2026-11-12'), '2026-11-19');
  // A day early (Wednesday) still counts for Thursday.
  assert.equal(S.nextDueDay(thu, '2026-11-01', '2026-11-11'), '2026-11-19');
  // Two days late (Saturday) counts for the Thursday before.
  assert.equal(S.nextDueDay(thu, '2026-11-01', '2026-11-14'), '2026-11-19');
  const monThu = { kind: 'weekdays', days: [0, 3] };
  assert.equal(S.nextDueDay(monThu, '2026-11-01', '2026-11-09'), '2026-11-12'); // Mon -> Thu
  assert.equal(S.nextDueDay(monThu, '2026-11-01', '2026-11-12'), '2026-11-16'); // Thu -> Mon
  assert.equal(S.nextDueDay(monThu, '2026-11-01', '2026-11-10'), '2026-11-12'); // Tue counts for Mon
  assert.equal(S.nextDueDay({ kind: 'weekdays', days: [] }, '2026-11-01', null), null);
  assert.equal(S.coveredDay('2026-11-11', [3]), '2026-11-12');
});

test('dose changes: the dose on a day is the newest change on or before it, and never moves the schedule', () => {
  const doses = [change('2026-10-01', '0.25'), change('2026-10-29', '0.5'), change('2026-11-26', '1')];
  assert.deepEqual(S.doseOn(doses, '2026-10-15'), { amount: '0.25', unit: 'mg' });
  assert.deepEqual(S.doseOn(doses, '2026-10-29'), { amount: '0.5', unit: 'mg' });
  assert.deepEqual(S.doseOn(doses, TODAY), { amount: '0.5', unit: 'mg' });
  assert.deepEqual(S.doseOn(doses, '2026-12-01'), { amount: '1', unit: 'mg' });
  // Before the first change: the first dose.
  assert.deepEqual(S.doseOn(doses, '2026-09-01'), { amount: '0.25', unit: 'mg' });
  assert.equal(S.doseOn([], TODAY), null);
  assert.equal(S.doseLabel({ amount: ' 2.5 ', unit: 'mg' }), '2.5 mg');
  // The schedule ignores the dose: same due day before and after a change.
  const med = { id: 1, schedule: { kind: 'interval', everyDays: 7 }, startDay: '2026-10-01', doses };
  const shots = [shot('2026-10-22', { amount: '0.25' }), shot('2026-10-29', { amount: '0.5' }), shot('2026-11-05', { amount: '0.5' }), shot('2026-11-12', { amount: '0.5' })];
  assert.equal(S.medDueDay(med, shots), '2026-11-19');
  assert.equal(S.medDueDay(med, shots.slice(0, 2)), '2026-11-05');
  // Other medications' shots do not count.
  assert.equal(S.medDueDay(med, [...shots, shot('2026-11-14', { medId: 2 })]), '2026-11-19');
});

test('the due line: today, tomorrow, a weekday, a date, and missed days in plain words', () => {
  assert.equal(S.dueText('2026-11-14', TODAY).title, 'Due today');
  assert.equal(S.dueText('2026-11-15', TODAY).title, 'Due tomorrow');
  assert.deepEqual(S.dueText('2026-11-19', TODAY), { title: 'Due Thursday', sub: 'In 5 days, Nov 19', overdue: false, days: 5 });
  assert.equal(S.dueText('2026-11-16', TODAY).sub, 'In 2 days, Nov 16');
  assert.equal(S.dueText('2026-11-21', TODAY).title, 'Due Nov 21');
  assert.equal(S.dueText('2026-11-13', TODAY).title, 'Was due yesterday');
  assert.equal(S.dueText('2026-11-11', TODAY).title, 'Was due 3 days ago');
  assert.equal(S.scheduleLabel({ kind: 'interval', everyDays: 7 }), 'Every 7 days');
  assert.equal(S.scheduleLabel({ kind: 'interval', everyDays: 1 }), 'Every day');
  assert.equal(S.scheduleLabel({ kind: 'weekdays', days: [3] }), 'Every Thursday');
  assert.equal(S.scheduleLabel({ kind: 'weekdays', days: [3, 0] }), 'Mon and Thu');
});

test('reminders: the due day at the chosen time, nothing for a moment already past', () => {
  assert.equal(S.reminderAt('2026-11-19', 9 * 60, NOW), at('2026-11-19', 9));
  assert.equal(S.reminderAt('2026-11-14', 9 * 60, NOW), null); // 9 am today has passed
  assert.equal(S.reminderAt('2026-11-14', 18 * 60 + 30, NOW), at('2026-11-14', 18, 30));
  assert.equal(S.reminderAt(null, 540, NOW), null);
});

// ---------- sites ----------

test('site rotation: follows the order the person uses', () => {
  assert.equal(T.nextSite([]), null);
  // One shot: the next on the map.
  assert.equal(T.nextSite(['abdomen-left']), 'abdomen-right');
  // Their own four-site rotation, learned from the history.
  const own = ['abdomen-left', 'thigh-left', 'abdomen-right', 'thigh-right', 'abdomen-left', 'thigh-left', 'abdomen-right'];
  assert.equal(T.nextSite(own), 'thigh-right');
  assert.equal(T.nextSite([...own, 'thigh-right']), 'abdomen-left');
  // Only some sites used so far: cycles among them in first-use order.
  assert.equal(T.nextSite(['arm-left', 'glute-right']), 'arm-left');
  // A change of habit wins: the most recent time the last site was used decides.
  assert.equal(T.nextSite(['abdomen-left', 'abdomen-right', 'thigh-left', 'abdomen-left', 'thigh-right', 'thigh-left']), 'abdomen-left');
  // Shots without a site are skipped.
  assert.equal(T.nextSite([null, 'abdomen-left', null]), 'abdomen-right');
  assert.equal(T.rotationLine('abdomen-left', 'abdomen-right'), 'Last: left abdomen. Next in your rotation: right abdomen.');
  assert.equal(T.siteLabel('arm-right'), 'Right upper arm');
  const recent = T.recentSites(Array.from({ length: 15 }, (_, i) => ({ site: T.SITES[i % 8], at: i })), 12);
  assert.equal(recent.length, 12);
  assert.equal(recent[0].at, 14);
  assert.equal(recent[0].rank, 0);
});

// ---------- free and Pro ----------

test('free gates: one medication, the last 30 days, logging never gated', () => {
  assert.equal(G.canAddMed(0, false), true);
  assert.equal(G.canAddMed(1, false), false);
  assert.equal(G.canAddMed(1, true), true);
  assert.equal(G.canAddMed(5, true), true);
  const meds = [{ id: 2, position: 1 }, { id: 1, position: 0 }, { id: 3, position: 2 }];
  assert.deepEqual(G.activeMeds(meds, false).map((m) => m.id), [1]);
  assert.deepEqual(G.activeMeds(meds, true).map((m) => m.id), [1, 2, 3]);
  assert.equal(G.canLogShot(false), true);
  // History: today and the 29 days before it; the 30th day back is Pro.
  assert.equal(D.dayKey(G.historyCutoff(NOW)), '2026-10-16');
  const items = [{ at: at('2026-11-14') }, { at: at('2026-10-16', 0, 0) }, { at: at('2026-10-15', 23, 59) }, { at: at('2026-08-01') }];
  assert.deepEqual(G.visibleEntries(items, NOW, false), { shown: items.slice(0, 2), hidden: 2 });
  assert.deepEqual(G.visibleEntries(items, NOW, true), { shown: items, hidden: 0 });
  assert.equal(G.canSeeDay('2026-10-16', NOW, false), true);
  assert.equal(G.canSeeDay('2026-10-15', NOW, false), false);
  assert.equal(G.gate('report', false), 'report');
  assert.equal(G.gate('report', true), null);
  assert.deepEqual(G.reportAccess(false), { preview: true, share: false, sample: true });
  assert.deepEqual(G.reportAccess(true), { preview: true, share: true, sample: false });
});

// ---------- plans and trial ----------

test('plans: order, preselection, titles and the trial only on the onboarding weekly plan', () => {
  assert.deepEqual(O.planOrder(true), ['WEEKLY', 'ANNUAL', 'LIFETIME']);
  assert.deepEqual(O.planOrder(false), ['ANNUAL', 'WEEKLY', 'LIFETIME']);
  assert.equal(O.preselect(['ANNUAL', 'WEEKLY', 'LIFETIME'], true), 'WEEKLY');
  assert.equal(O.preselect(['ANNUAL', 'WEEKLY', 'LIFETIME'], false), 'ANNUAL');
  assert.equal(O.preselect(['LIFETIME'], false), 'LIFETIME');
  assert.equal(O.preselect([], true), null);
  assert.equal(O.planTitle('ANNUAL', false), 'Yearly, best value');
  assert.equal(O.planTitle('ANNUAL', true), 'Yearly');
  assert.equal(O.planTitle('LIFETIME', false), 'Lifetime, pay once');
  assert.equal(O.planTypeOf('MONTHLY'), null);
  assert.equal(O.showsTrial('WEEKLY', true, '3 days free'), '3 days free');
  assert.equal(O.showsTrial('WEEKLY', false, '3 days free'), null);
  assert.equal(O.showsTrial('ANNUAL', true, '3 days free'), null);
  const intro = { price: 0, periodNumberOfUnits: 3, periodUnit: 'DAY' };
  assert.equal(O.trialLength(intro), '3 days');
  assert.equal(O.trialLabelFrom(intro, true), '3 days free');
  assert.equal(O.trialLabelFrom(intro, false), null);
  assert.equal(O.trialLabelFrom({ ...intro, price: 0.99 }, true), null);
  const end = at('2026-11-17', 10);
  assert.equal(O.trialReminderAt(end, NOW), end - 86_400_000);
  assert.equal(O.trialReminderAt(NOW + 60_000, NOW), NOW + 2 * 86_400_000);
  assert.equal(O.yearlySavingPct(6.99, 39.99), 88);
});

test('lifetime with an active subscription: name the renewing ones so the app can open Manage Subscriptions', () => {
  const renewing = (id) => id !== 'shot_pro_yearly_cancelled';
  assert.deepEqual(O.subscriptionsToCancel(['shot_pro_weekly'], renewing), ['shot_pro_weekly']);
  assert.deepEqual(O.subscriptionsToCancel(['shot_pro_lifetime'], renewing), []);
  assert.deepEqual(O.subscriptionsToCancel([], renewing), []);
  // One already cancelled ends on its own; nothing to say.
  assert.deepEqual(O.subscriptionsToCancel(['shot_pro_yearly_cancelled'], renewing), []);
  assert.deepEqual(O.subscriptionsToCancel(['shot_pro_yearly', 'shot_pro_weekly'], () => true), ['shot_pro_yearly', 'shot_pro_weekly']);
});

// ---------- first run and paywall timing ----------

test('paywall once: nothing before the first shot, then once ever, never for Pro', () => {
  assert.equal(F.firstFlowStep(null, 3, false), 'none'); // never pending: an older install
  assert.equal(F.firstFlowStep('pending', 0, false), 'wait');
  assert.equal(F.firstFlowStep('pending', 1, false), 'run');
  assert.equal(F.firstFlowStep('pending', 1, true), 'skip');
  assert.equal(F.firstFlowStep('done', 1, false), 'none');
  // The second chance: a later calendar day only, once.
  assert.equal(F.secondChanceDue('2026-11-14', TODAY), false);
  assert.equal(F.secondChanceDue('2026-11-13', TODAY), true);
  assert.equal(F.secondChanceDue('done', TODAY), false);
  assert.equal(F.secondChanceDue(null, TODAY), false);
  // Never two in one launch, never for Pro.
  assert.equal(F.autoPaywallAllowed({ isPro: false, shownThisLaunch: false }), true);
  assert.equal(F.autoPaywallAllowed({ isPro: false, shownThisLaunch: true }), false);
  assert.equal(F.autoPaywallAllowed({ isPro: true, shownThisLaunch: false }), false);
  assert.equal(F.ONBOARDING_CLOSE_DELAY_MS, 3000);
});

test('rating guard: later day, not in onboarding, one per launch, not after a paywall, each trigger once', () => {
  const ok = { installDay: '2026-11-13', today: TODAY, onboarding: false, askedThisLaunch: false, paywallThisLaunch: false, triggerUsed: false };
  assert.equal(F.reviewAllowed(ok), true);
  assert.equal(F.reviewAllowed({ ...ok, installDay: TODAY }), false);
  assert.equal(F.reviewAllowed({ ...ok, installDay: null }), false);
  assert.equal(F.reviewAllowed({ ...ok, onboarding: true }), false);
  assert.equal(F.reviewAllowed({ ...ok, askedThisLaunch: true }), false);
  assert.equal(F.reviewAllowed({ ...ok, paywallThisLaunch: true }), false);
  assert.equal(F.reviewAllowed({ ...ok, triggerUsed: true }), false);
  assert.equal(F.secondShotMet(1), false);
  assert.equal(F.secondShotMet(2), true);
});
