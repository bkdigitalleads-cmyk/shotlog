// Drives the web copy of the app (see README.md in this folder) through
// every screen in the design renders and saves them at 393x852 points, @3x.
// node store/render/render.mjs [url] [only-name-prefix]
process.env.TZ = 'America/New_York';
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed, TODAY } from './seed.mjs';
import { atTime } from '../../src/days.ts';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const URL = process.argv[2] || 'http://localhost:8723/';
const ONLY = process.argv[3] || '';
const OUT = path.join(here, 'out');
mkdirSync(OUT, { recursive: true });

const settings = (o = {}) => {
  const s = { track: 'glp1', weightUnit: 'lb', weightGoal: 180, proteinGoal: 100, waterGoal: 2366, reminders: true, reminderMinutes: 540, showIntake: true, patientName: '', ...o };
  return Object.fromEntries(Object.entries(s).map(([k, v]) => [`setting.${k}`, JSON.stringify(v)]));
};
const onboardedKv = (o = {}) => ({ 'flag.onboarded': '1', 'flag.reminderAsked': '1', 'flow.afterFirstShot': 'done', 'flow.paywallSecondChance': 'done', 'review.installDay': '2026-08-13', ...settings(o) });

const full = seed();
const stack = seed({ stack: true });
const firstMed = { ...full.meds[0], startDay: TODAY, doses: [{ id: 1, medId: 1, fromDay: TODAY, amount: '0.25', unit: 'mg' }] };
const empty = { meds: [firstMed], shots: [], weights: [], feelings: [], intake: [] };
const newInstallKv = { 'flag.onboarded': '1', 'flow.afterFirstShot': 'pending', ...settings({ reminders: false, weightGoal: null, proteinGoal: null, waterGoal: null }) };

const label = (page, l) => page.locator(`[aria-label="${l}"]`).first();
const labelStarts = (page, l) => page.locator(`[aria-label^="${l}"]`).first();
const text = (page, t) => page.getByText(t, { exact: true }).first();
const pause = (page, ms = 450) => page.waitForTimeout(ms);
const scrollText = async (page, t) => {
  await text(page, t).scrollIntoViewIfNeeded();
  await pause(page, 200);
};

/** name, scenario, colour scheme, and the taps that reach the screen. */
const SHOTS = [
  ['01-onboarding-log', { data: { meds: [] }, kv: settings() }, 'light', async () => {}],
  ['02-onboarding-next', { data: { meds: [] }, kv: settings() }, 'light', async (p) => { await text(p, 'Continue').click(); }],
  ['03-onboarding-report', { data: { meds: [] }, kv: settings() }, 'light', async (p) => { await text(p, 'Continue').click(); await pause(p, 200); await text(p, 'Continue').click(); }],
  ['04-onboarding-tracking', { data: { meds: [] }, kv: settings() }, 'light', async (p) => { for (let i = 0; i < 3; i++) { await text(p, 'Continue').click(); await pause(p, 200); } }],
  ['05-onboarding-medication', { data: { meds: [] }, kv: settings() }, 'light', async (p) => {
    for (let i = 0; i < 4; i++) { await text(p, 'Continue').click(); await pause(p, 200); }
    await label(p, 'Name').fill('Semaglutide');
    await label(p, 'Dose').fill('0.25');
    await p.keyboard.press('Tab');
  }],
  ['06-home-empty', { data: empty, kv: newInstallKv }, 'light', async () => {}],
  ['07-home', { data: full, kv: onboardedKv() }, 'light', async () => {}],
  ['08-home-stack', { data: stack, kv: onboardedKv(), pro: true }, 'light', async () => {}],
  ['09-log-sheet', { data: full, kv: onboardedKv() }, 'light', async (p) => { await labelStarts(p, 'Log shot').click(); }],
  ['10-log-sheet-site', { data: full, kv: onboardedKv() }, 'light', async (p) => { await labelStarts(p, 'Log shot').click(); await pause(p); await scrollText(p, 'Left and right are your own.'); }],
  ['11-reminder-question', { data: empty, kv: newInstallKv }, 'light', async (p) => { await labelStarts(p, 'Log shot').click(); await pause(p); await text(p, 'Save').click(); await pause(p, 900); }],
  ['12-trial', { data: empty, kv: newInstallKv }, 'light', async (p) => { await labelStarts(p, 'Log shot').click(); await pause(p); await text(p, 'Save').click(); await pause(p, 900); await text(p, 'Not now').click(); await pause(p, 900); }],
  ['13-trial-reminder', { data: empty, kv: newInstallKv }, 'light', async (p) => { await labelStarts(p, 'Log shot').click(); await pause(p); await text(p, 'Save').click(); await pause(p, 900); await text(p, 'Not now').click(); await pause(p, 900); await text(p, 'Continue').click(); }],
  ['14-paywall-onboarding', { data: empty, kv: newInstallKv }, 'light', async (p) => { await labelStarts(p, 'Log shot').click(); await pause(p); await text(p, 'Save').click(); await pause(p, 900); await text(p, 'Not now').click(); await pause(p, 900); await text(p, 'Continue').click(); await pause(p); await text(p, 'Continue').click(); await pause(p, 3400); }],
  ['15-paywall-in-app', { data: full, kv: onboardedKv() }, 'light', async (p) => { await label(p, 'Insights').click(); await pause(p); await text(p, 'See my trends').click(); }],
  ['16-medications', { data: stack, kv: onboardedKv(), pro: true }, 'light', async (p) => { await label(p, 'Settings').click(); await pause(p); await labelStarts(p, 'My medications').click(); }],
  ['17-medication', { data: full, kv: onboardedKv() }, 'light', async (p) => { await label(p, 'Settings').click(); await pause(p); await labelStarts(p, 'My medications').click(); await pause(p); await labelStarts(p, 'Semaglutide').click(); await pause(p); await scrollText(p, 'Change the dose'); }],
  ['18-weight-chart', { data: full, kv: onboardedKv(), pro: true }, 'light', async (p) => { await label(p, 'Insights').click(); }],
  ['19-patterns', { data: full, kv: onboardedKv(), pro: true }, 'light', async (p) => { await label(p, 'Insights').click(); await pause(p); await label(p, 'Patterns').click(); }],
  ['20-site-history', { data: full, kv: onboardedKv(), pro: true }, 'light', async (p) => { await label(p, 'Insights').click(); await pause(p); await label(p, 'Sites').click(); }],
  ['21-history', { data: full, kv: onboardedKv() }, 'light', async (p) => { await label(p, 'History').click(); }],
  ['22-weight', { data: full, kv: onboardedKv() }, 'light', async (p) => { await labelStarts(p, 'Weight,').click(); }],
  ['23-how-i-feel', { data: full, kv: onboardedKv() }, 'light', async (p) => { await labelStarts(p, 'How I feel').click(); await pause(p); await label(p, 'Nausea').click(); await label(p, 'Fatigue').click(); }],
  ['24-report', { data: full, kv: onboardedKv({ patientName: 'Sam Rivera' }) }, 'light', async (p) => { await label(p, 'Report').click(); }],
  ['25-report-preview-free', { data: full, kv: onboardedKv({ patientName: 'Sam Rivera' }) }, 'light', async (p) => { await label(p, 'Report').click(); await pause(p); await label(p, 'Preview the report').click(); }],
  ['26-report-preview-pro', { data: full, kv: onboardedKv({ patientName: 'Sam Rivera' }), pro: true }, 'light', async (p) => { await label(p, 'Report').click(); await pause(p); await label(p, 'Preview the report').click(); }],
  ['27-settings', { data: full, kv: onboardedKv() }, 'light', async (p) => { await label(p, 'Settings').click(); }],
  ['28-home-dark', { data: full, kv: onboardedKv() }, 'dark', async () => {}],
  ['29-log-sheet-dark', { data: full, kv: onboardedKv() }, 'dark', async (p) => { await labelStarts(p, 'Log shot').click(); }],
  ['30-weight-chart-dark', { data: full, kv: onboardedKv(), pro: true }, 'dark', async (p) => { await label(p, 'Insights').click(); }],
  ['31-paywall-in-app-dark', { data: full, kv: onboardedKv() }, 'dark', async (p) => { await label(p, 'Report').click(); await pause(p); await labelStarts(p, 'Share PDF').click(); }],
];

const statusBar = (dark) => `
  (() => {
    const c = ${dark ? "'#E9E5DC'" : "'#1D232B'"};
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:0;right:0;top:0;height:54px;z-index:99999;pointer-events:none;font:600 17px -apple-system,system-ui,sans-serif;color:' + c;
    d.innerHTML = '<span style="position:absolute;left:51px;top:17px;letter-spacing:-0.2px">9:41</span>' +
      '<svg style="position:absolute;right:30px;top:19px" width="80" height="14" viewBox="0 0 80 14">' +
      '<rect x="0" y="9" width="3" height="4" rx="1" fill="' + c + '"/><rect x="5" y="6.5" width="3" height="6.5" rx="1" fill="' + c + '"/><rect x="10" y="4" width="3" height="9" rx="1" fill="' + c + '"/><rect x="15" y="1.5" width="3" height="11.5" rx="1" fill="' + c + '"/>' +
      '<path d="M31 4.5a10 10 0 0 1 13 0l-1.6 1.7a7.6 7.6 0 0 0-9.8 0zM33.6 7.4a6.2 6.2 0 0 1 7.8 0l-1.6 1.7a3.9 3.9 0 0 0-4.6 0zM36.2 10.3a2.3 2.3 0 0 1 2.6 0L37.5 12z" fill="' + c + '"/>' +
      '<rect x="51" y="1" width="24" height="12" rx="3.5" fill="none" stroke="' + c + '" stroke-opacity="0.4"/><rect x="53" y="3" width="20" height="8" rx="2" fill="' + c + '"/><rect x="76" y="5" width="1.6" height="4" rx="0.8" fill="' + c + '" fill-opacity="0.45"/></svg>';
    document.body.appendChild(d);
    const h = document.createElement('div');
    h.style.cssText = 'position:fixed;left:50%;bottom:8px;width:134px;height:5px;margin-left:-67px;border-radius:3px;z-index:99999;pointer-events:none;background:' + c;
    document.body.appendChild(h);
  })();`;

const browser = await chromium.launch();
let ok = 0;
for (const [name, scenario, scheme, go] of SHOTS) {
  if (ONLY && !name.startsWith(ONLY)) continue;
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, colorScheme: scheme, timezoneId: 'America/New_York', locale: 'en-US' });
  await ctx.addInitScript((sc) => {
    window.__SCENARIO__ = sc;
  }, scenario);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  try {
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await go(page);
    await page.waitForTimeout(700);
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.evaluate(statusBar(scheme === 'dark'));
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    ok++;
    console.log('ok', name, errors.length ? `(page errors: ${errors.join(' | ').slice(0, 200)})` : '');
  } catch (e) {
    console.log('FAIL', name, String(e.message).split('\n')[0], errors.join(' | ').slice(0, 300));
    await page.screenshot({ path: path.join(OUT, `${name}-FAILED.png`) }).catch(() => {});
  }
  await ctx.close();
}
await browser.close();
console.log(`${ok} rendered to ${OUT}`);
