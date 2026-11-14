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
const I = await import('../src/insights.ts');
const R = await import('../src/report.ts');

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

// ---------- weight ----------

const weight = (day, value, o = {}) => ({ id: nextId++, at: at(day, o.h ?? 8), value, unit: o.unit ?? 'lb', waist: null, createdAt: 0 });

test('weights: one point per day (the average), units converted, a weekly change from the best-fit line', () => {
  const ws = [weight('2026-11-02', 200), weight('2026-11-02', 201, { h: 20 }), weight('2026-11-09', 198), weight('2026-11-16', 196.5)];
  const pts = I.dailyWeights(ws, 'lb');
  assert.deepEqual(pts.map((p) => p.day), ['2026-11-02', '2026-11-09', '2026-11-16']);
  assert.equal(pts[0].value, 200.5);
  // Best fit through (0, 200.5), (7, 198), (14, 196.5): -2 lb a week.
  assert.equal(I.round1(I.weeklyChange(pts)), -2);
  // Kilograms in, pounds out.
  assert.equal(I.round1(I.dailyWeights([weight('2026-11-02', 90, { unit: 'kg' })], 'lb')[0].value), 198.4);
  assert.equal(I.round1(I.convertWeight(198.4, 'lb', 'kg')), 90);
  // Under a week apart: too short to say per week.
  assert.equal(I.weeklyChange(pts.slice(0, 1)), null);
  assert.equal(I.weeklyChange([{ day: '2026-11-02', value: 200 }, { day: '2026-11-06', value: 199 }]), null);
  assert.equal(I.signed1(-2.04), '-2.0');
  assert.equal(I.signed1(1.25), '+1.3');
  assert.equal(I.fmt1(182), '182.0');
  assert.deepEqual(I.inLastDays(pts, 7, '2026-11-16').map((p) => p.day), ['2026-11-16']);
  assert.deepEqual(I.inLastDays(pts, 8, '2026-11-16').map((p) => p.day), ['2026-11-09', '2026-11-16']);
});

test('change since the first shot: from the weight on or before that day, else the first after it', () => {
  const pts = [
    { day: '2026-10-20', value: 210 },
    { day: '2026-10-28', value: 208 },
    { day: '2026-11-04', value: 205 },
    { day: '2026-11-14', value: 201.5 },
  ];
  const shots = [shot('2026-11-12'), shot('2026-10-29'), shot('2026-11-05')];
  assert.deepEqual(I.changeSinceFirstShot(pts, shots), { from: 208, fromDay: '2026-10-28', to: 201.5, toDay: '2026-11-14', change: -6.5 });
  // No weight before the first shot: the first one after it.
  assert.equal(I.changeSinceFirstShot(pts.slice(2), shots).fromDay, '2026-11-04');
  assert.equal(I.changeSinceFirstShot(pts, []), null);
  assert.equal(I.changeSinceFirstShot(pts.slice(3), shots), null); // one day only
});

// ---------- how I feel ----------

const feel = (day, kind, h = 12, level = 'mild') => ({ id: nextId++, at: at(day, h), kind, level, note: '', createdAt: 0 });

test('side effects by days since the last shot: counts per day after, 7+ together, nothing before the first shot', () => {
  const shots = [shot('2026-11-05', { h: 20 }), shot('2026-10-29', { h: 20 })];
  const feelings = [
    feel('2026-10-28', 'nausea'), // before the first shot
    feel('2026-10-29', 'nausea', 21), // day of the shot, after it
    feel('2026-10-30', 'nausea'), // 1 day after
    feel('2026-10-31', 'fatigue'), // 2 days after
    feel('2026-11-06', 'nausea'), // 1 day after the second shot
    feel('2026-11-05', 'headache', 8), // before the 8 pm shot: 7 days after the first
    feel('2026-11-14', 'heartburn'), // 9 days after
  ];
  assert.equal(I.daysSinceShot(at('2026-11-05', 8), shots), 7);
  assert.equal(I.daysSinceShot(at('2026-11-05', 21), shots), 0);
  assert.equal(I.daysSinceShot(at('2026-10-01'), shots), null);
  const p = I.patterns(feelings, shots);
  assert.deepEqual(p.buckets, [1, 2, 1, 0, 0, 0, 0, 2]);
  assert.deepEqual(p.byKind.nausea, [1, 2, 0, 0, 0, 0, 0, 0]);
  assert.equal(p.total, 6);
  assert.equal(p.beforeFirstShot, 1);
  assert.deepEqual(p.peaks, [1, 7]);
  assert.equal(I.patternLine(p), 'Most entries: 1 day after and 7+ days after (2 of 6).');
  assert.equal(I.patternLine(I.patterns([], shots)), 'Nothing logged after a shot yet.');
  assert.equal(I.sinceLabel(0), 'Day of the shot');
  assert.equal(I.sinceLabel(3), '3 days after');
  assert.deepEqual(I.feelingCounts(feelings.slice(0, 3))[0], { kind: 'nausea', count: 3, strong: 0 });
});

test('protein and water: counters against the person\'s own goal, no goal means no progress', () => {
  assert.deepEqual(I.intakeOn([{ day: TODAY, protein: 40, water: 500 }], TODAY), { day: TODAY, protein: 40, water: 500 });
  assert.deepEqual(I.intakeOn([], TODAY), { day: TODAY, protein: 0, water: 0 });
  assert.equal(I.progress(40, 100), 0.4);
  assert.equal(I.progress(140, 100), 1);
  assert.equal(I.progress(40, null), null);
  assert.equal(Math.round(I.waterShown(I.waterStored(8, "lb"), "lb")), 8);
  assert.equal(Math.round(I.waterStored(8, "lb")), 237);
  assert.equal(I.waterShown(500, "kg"), 500);
});

// ---------- the report and the CSV ----------

test('report: shots in range oldest first, dose history with dates, weight change, side-effect counts, the footer', () => {
  const med = { id: 1, name: 'Semaglutide', schedule: { kind: 'interval', everyDays: 7 }, startDay: '2026-09-03', doses: [change('2026-09-03', '0.25'), change('2026-10-01', '0.5')], remind: true, position: 0, createdAt: 0 };
  const shots = [shot('2026-11-12', { site: 'abdomen-left' }), shot('2026-11-05', { site: 'abdomen-right', backfilled: true }), shot('2026-09-03', { amount: '0.25' })];
  const weights = [weight('2026-09-02', 214), weight('2026-10-20', 206), weight('2026-11-13', 201.2), weight('2026-11-13', 201.6, { h: 20 })];
  const feelings = [feel('2026-11-06', 'nausea', 12, 'moderate'), feel('2026-11-13', 'nausea'), feel('2026-11-13', 'fatigue', 12, 'strong')];
  const r = R.buildReport({ meds: [med], shots, weights, feelings, unit: 'lb', rangeDays: 30, now: NOW, patient: '  Sam  ' });
  assert.equal(r.patient, 'Sam');
  assert.equal(r.from, '2026-10-16');
  assert.deepEqual(r.shots.map((s) => s.date), ['Nov 5, 2026', 'Nov 12, 2026']);
  assert.equal(r.shots[0].site, 'Right abdomen');
  assert.equal(r.shots[0].later, true);
  assert.equal(r.shots[1].dose, '0.5 mg');
  assert.deepEqual(r.meds[0].doses, [{ from: 'Sep 3, 2026', dose: '0.25 mg' }, { from: 'Oct 1, 2026', dose: '0.5 mg' }]);
  assert.equal(r.weightStart.value, 206);
  assert.equal(I.round1(r.weightEnd.value), 201.4);
  assert.equal(I.round1(r.weightChange), -4.6);
  // Since the weight on the first shot's day eve (Sep 2), across the whole log.
  assert.equal(I.round1(r.sinceFirstShot.change), -12.6);
  assert.deepEqual(r.feelings.map((f) => [f.label, f.mild, f.moderate, f.strong, f.total]), [['Nausea', 1, 1, 0, 2], ['Fatigue', 0, 0, 1, 1]]);
  assert.equal(r.feelingTotal, 3);
  assert.deepEqual(r.byDaysSince, [0, 3, 0, 0, 0, 0, 0, 0]);
  const html = R.reportHtml(r);
  assert.ok(html.includes('Logged by the patient with Shot Log. Not medical advice.'));
  assert.ok(html.includes('0.25 mg from Sep 3, 2026'));
  assert.ok(html.includes('<svg'));
  assert.ok(!html.includes('SAMPLE'));
  assert.ok(R.reportHtml(r, { sample: true }).includes('SAMPLE'));
  assert.ok(!/[!\u2014]/.test(html.replace(/<!doctype html>/i, '')), 'no exclamation marks or em dashes');
  // An empty range still prints.
  const empty = R.buildReport({ meds: [], shots: [], weights: [], feelings: [], unit: 'kg', rangeDays: 90, now: NOW, patient: '' });
  assert.ok(R.reportHtml(empty).includes('No shots in this range.'));
  assert.equal(R.rangeText(empty), 'Aug 17, 2026 to Nov 14, 2026 (90 days)');
});

test('CSV: every entry oldest first, quoted fields, a byte order mark, days since the shot', () => {
  const csv = R.entriesCsv({
    shots: [shot('2026-11-12', { site: 'thigh-left', note: 'after dinner, "late"' })],
    weights: [weight('2026-11-13', 201.4)],
    feelings: [feel('2026-11-14', 'heartburn', 9, 'mild')],
  });
  assert.ok(csv.startsWith('\uFEFFDate,Time,Type,'));
  const rows = csv.trim().split('\r\n');
  assert.equal(rows.length, 4);
  assert.ok(rows[1].startsWith('2026-11-12,09:00,Shot,Semaglutide,0.5,mg,Left thigh,'));
  assert.ok(rows[1].includes('"after dinner, ""late"""'));
  assert.ok(rows[2].startsWith('2026-11-13,08:00,Weight,,,,,201.4,lb'));
  assert.ok(rows[3].includes('Heartburn,Mild,2,'));
  assert.equal(R.exportName('report', NOW), 'shot-log-report-2026-11-14');
});

// ---------- identity and copy ----------

import { readFileSync, readdirSync } from 'node:fs';

test('identity: app.json and eas.json as the brief sets them, the push plugin last, the real Expo and RevenueCat ids', () => {
  const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url))).expo;
  const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url)));
  assert.equal(app.name, 'Shot Log');
  assert.equal(app.slug, 'shotlog');
  assert.equal(app.version, '1.0.0');
  assert.equal(app.ios.bundleIdentifier, 'com.bwk.shotlog');
  assert.equal(app.ios.buildNumber, '1');
  assert.equal(app.owner, 'bkdeveloper123');
  assert.equal(app.extra.eas.projectId, '0cdea6c0-e329-4f94-979a-5c9d8fdffc37');
  // The public RevenueCat SDK key: purchases run only when it starts with appl_ (src/purchases.ts).
  assert.equal(app.extra.revenueCatApiKeyIos, 'appl_QBzGUZCfiySzpdMHDTeVNbspBew');
  assert.ok(app.extra.revenueCatApiKeyIos.startsWith('appl_'));
  assert.equal(app.plugins[app.plugins.length - 1], './plugins/withoutPushEntitlement');
  assert.equal(eas.submit.production.ios.ascAppId, '6834850120');
  assert.equal(JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version, '1.0.0');
});

test('copy voice: no banned words, exclamation marks, em dashes or brand drug names in the app\'s strings', () => {
  const files = ['../App.tsx', '../index.ts', ...readdirSync(new URL('../src/', import.meta.url), { recursive: true }).filter((f) => /\.tsx?$/.test(f)).map((f) => `../src/${f}`)];
  const banned = /\b(Unlock|Premium|Seamless|Effortless|Welcome|Let's|Let’s|Ozempic|Wegovy|Mounjaro|Zepbound|Saxenda|Rybelsus|Trulicity|Victoza)\b|—/;
  for (const f of files) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    // String literals only (quotes, backticks and JSX text between tags).
    const strings = [...src.matchAll(/'([^'\n]*)'|`([^`]*)`|>([^<>{}\n]+)</g)].map((m) => m[1] ?? m[2] ?? m[3]);
    for (const s of strings.filter((x) => !/^\.\.?\//.test(x))) {
      assert.ok(!banned.test(s), `${f}: "${s}"`);
      assert.ok(!/[A-Za-z]!(\s|$)/.test(s), `${f}: exclamation in "${s}"`);
    }
  }
});
