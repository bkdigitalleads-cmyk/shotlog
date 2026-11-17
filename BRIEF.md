# Shot Log 1.0.0 brief

You are working in bkdigitalleads-cmyk/shotlog (new, README only). Clone the public repos bkdigitalleads-cmyk/migrainelog, bkdigitalleads-cmyk/pumping and bkdigitalleads-cmyk/signaturemaker read-only as references; do not change them. Work on branch claude/shotlog-1.0.0, open a PR to main, do not merge, no EAS build, no spend. Deliver in this order, committing after each part: 1 scaffold and engine port, 2 logging, 3 insights and report, 4 onboarding and paywalls, 5 design renders and icon options, 6 store metadata and docs site, 7 checks and the PR. If a step needs a permission prompt, keep going on the parts that do not. First, save this whole message as docs/BRIEF.md with its sections on separate lines.

## THE BRIEF

Build app #15, "Shot Log". Fork the engine from migrainelog (main): project layout, TypeScript, expo-sqlite, purchases.ts with the Pro re-check, trial.ts, reminder.ts, reviews.ts, the PDF engine and PdfPreview, the EAS workflows with the same path filters, plugins/withoutPushEntitlement.js listed last in app.json plugins, CLAUDE.md, AGENTS.md, NOTES.md conventions and the docs/ GitHub Pages site. Take the onboarding and paywall order from pumping 1.0.1 (first real action before any paywall). Take the startup guard from signaturemaker (index.ts loads App in a try and shows a StartupFailure screen; App.tsx opens after 6 seconds if fonts never resolve; error boundary around the tree). Read each repo's CLAUDE.md and docs/design/NOTES.md first so the quality bar is the same. Keep tsc clean, write unit checks for the pure logic, and make sure npx expo export bundles.

## Native library rule

(from the Signature Maker build 1 failure): do not add a native library unless you have checked its iOS module does not use the legacy bridge on React Native 0.86. Use what migrainelog already ships for drawing and charts. If you need Skia, it must be 2.14.0 or later. Run expo doctor and fix what it reports.

## Why this app

The Nov 14 keyword sweep (934 App Store phrases) found "glp 1 tracker" at Apple popularity 51 and "peptide tracker" at 50, with shot tracker 33, injection tracker 29 and protein tracker 49 alongside. Half the "peptide tracker" top 10 has under 650 ratings. It is the only niche we have measured where an app under 200 days old shows real revenue. New entrants arrive weekly, so the app has to look and feel like the careful one, not another clone.

## Who it is for

People on a weekly or daily injectable, mostly GLP-1 medication for weight or diabetes, and people who take prescribed or self-directed peptides. They need to (a) log a shot in a few seconds with the dose and the site, (b) know when the next one is due and where it should go, (c) see weight and side effects against the shot schedule, and (d) hand a prescriber a clean record.

## 1. IDENTITY

app.json name "Shot Log", slug shotlog, bundle id com.bwk.shotlog, version 1.0.0, ios.buildNumber 1, owner bkdeveloper123. eas.json ascAppId is 6834850120. Leave extra.eas.projectId and extra.revenueCatApiKeyIos as clearly marked placeholders (TODO_COWORK_EXPO_PROJECT_ID, TODO_COWORK_REVENUECAT_PUBLIC_IOS_KEY); Cowork fills them before the first build. Store name "Peptide Tracker: GLP-1 Shots" (28). Subtitle "Shot, Protein & Weight Log" (26). Keywords draft (98): glp1,glp,injection,site,dose,reminder,semaglutide,tirzepatide,retatrutide,peptides,loss,medication. Cowork may revise the keywords after an ASOMobile pass. No brand drug names anywhere in the metadata or the app's own copy (Ozempic, Wegovy, Mounjaro, Zepbound are trademarks). A person can type any name for their own medication. Support email everywhere: bkdigitalleads@gmail.com. No personal email in the app, the site or the store notes.

## 2. LOGGING (the product)

Home is one screen: the next shot ("Due Thursday" or "Due in 2 days"), where it goes next in the person's own rotation, and one large button, "Log shot". One tap opens a sheet prefilled with the medication, the last dose and the next site; Save is the only required tap.

My medications: the person's own list. Each has a name (free text, with generic names offered as suggestions), a dose as amount plus unit (mg, mcg, mL, units) typed by the person, a schedule (every N days, or chosen weekdays), and a start date. Dose changes are logged with a date so the history shows them. No suggested doses, no titration schedules, no mixing or unit-conversion math, no compound library, no links to sellers.

Site: a simple drawn body map with tap targets (abdomen, thighs, upper arms, glutes, left and right). The app remembers the order the person uses and shows the next one. Wording stays neutral: "Last: left abdomen. Next in your rotation: right abdomen."

Reminders: local notifications on the schedule ("Shot due today"), asked for after the first shot is saved, with a snooze. No push entitlement.

Weight: quick entry, goal, chart. Optional waist measurement.

How I feel: one-tap chips (nausea, constipation, heartburn, fatigue, headache, low appetite, site reaction, other) with mild, moderate, strong. Shown against days since the last shot.

Protein and water: optional daily tap-to-add counters against a goal the person sets. No recommended targets.

Backfill: add or edit any past shot, weight or entry by date.

## 3. INSIGHTS AND THE REPORT (Pro)

Trends: weight over 30, 90 and 180 days with shots marked on the line, average weekly change, total change since the first shot.

Patterns: which days after a shot side effects cluster on, counts only, no advice.

Site history: the last 12 shots on the body map.

Doctor report (PDF through the PDF engine): medication and dose history with dates, every shot with site, weight trend, side-effect counts, optional name. Footer: "Logged by the patient with Shot Log. Not medical advice." Free users see a preview with a SAMPLE watermark and no share or print. CSV export.

## 4. MONETIZATION

Free forever: logging shots for one medication, the next-due line, one reminder, weight entry, the last 30 days of history.

Pro, entitlement "pro", RevenueCat offering "default": $rc_weekly = shot_pro_weekly ($6.99, 3-day free trial, preselected on the onboarding paywall), $rc_annual = shot_pro_yearly ($39.99, no trial, preselected on the in-app paywall as "Yearly, best value"), $rc_lifetime = shot_pro_lifetime ($79.99, non-consumable, "Lifetime, pay once"). Prices and trial text always from StoreKit; these numbers appear only as fallbacks and in store notes.

Pro unlocks more than one medication (the stack), trends, patterns, site history, protein and water, the report and CSV, and history older than 30 days.

Paywall timing, as in pumping 1.0.1: nothing before the first saved shot. After it: the reminder question, then "Try it free" and the day-before reminder screen when trial-eligible, then the paywall with the X after 3 seconds, once ever. One second chance on a later day. Never two paywalls in one launch. No trial on in-app paywalls. Trial label and "No payment now" on the trial tier.

After a lifetime purchase, if a subscription is still active, say so and open Apple's Manage Subscriptions sheet (RevenueCat showManageSubscriptions).

Rating prompt: after the second logged shot or the first report preview, on a later-day launch, at most one per launch, never in onboarding.

## 5. DESIGN

It must look like a studio built it, and nothing like Migraine Log (Apple 4.3 and our own bar). Concept: "a calm clinic notebook". Light by default with a proper dark mode, one confident accent used only for the live action, tabular numerals for doses and weights, a hand-drawn body map and a small glyph set of its own, two corner radii, one type scale and one spacing scale. Dynamic Type and VoiceOver labels on every control. Build a component kit with its own names.

Commit docs/design/after/*.png at 393x852 for Home (empty, with history), log sheet, body map, medications, weight chart, patterns, report preview, both paywalls, settings and onboarding.

Icon: 3 options in docs/design/icon-options.png, readable at 60 px, no needle close-ups and no pharmacy cross; pick one and say why.

## 6. ONBOARDING

3 short value screens that show the real product and are written for the reader's outcome (log a shot in seconds; always know when and where the next one goes; bring your prescriber a clean record), then "What are you tracking?" (GLP-1 medication, peptides, other injections; labels only), then "Add your first medication", then Home.

## 7. COPY VOICE

Plain, short, kind. No "Unlock", "Premium", "Seamless", "Effortless", "Welcome", "Let's", exclamation marks or em dashes. No weight-loss promises and no before-and-after language.

## 8. MEDICAL AND REVIEW SAFETY

The App Review note and an About line say the app is a personal log that does not diagnose, treat, calculate doses or give medical advice, and that the person should follow their prescriber. No estimated drug-level curves in 1.0.0 (note for later, with care). No HealthKit in 1.0.0 (note Apple Health weight sync for 1.0.1). Data never leaves the device; no account; privacy label Purchases (purchase history), used for App Functionality, not linked to identity, not used for tracking, because RevenueCat stores the purchase history (updated Nov 16, 2026; it was Data Not Collected).

## 9. store/metadata.md

Name, subtitle and keywords above; promotional text; a description that leads with outcomes and includes a "Not medical advice" line; What's New for 1.0.0; App Review note (free logging, what Pro adds, paywall after the first shot with the X after 3 seconds, no account, no dose calculator); screenshot plan (6 keyword-captioned shots: log a shot, next due and site, weight with shots marked, side-effect patterns, doctor report, private and offline) and a screenshots script that emits 1206x2622 (the size App Store Connect requires) from real renders; category Health & Fitness, secondary Medical; age rating answered honestly.

## 10. docs/ landing page

Like migrainelog's, with FAQ (how do I log a shot, does it remind me, does it rotate sites, is my data uploaded anywhere, what does Pro cost), privacy.html, support.html, sitemap.xml, robots.txt. Pages URL will be https://bkdigitalleads-cmyk.github.io/shotlog/.

## 11. CHECKS BEFORE THE PR

tsc clean; unit checks for next-due dates on both schedule types and across dose changes, site rotation order, weight averages and change since first shot, side effects by days since shot, the one-medication free gate and the 30-day history gate, trial and paywall-once logic, the lifetime-with-active-subscription case; npx expo export bundles; npx expo config --type introspect shows ios.entitlements {} and no camera, location or health usage strings; expo doctor clean.

Say in the PR what cannot be verified without a device. Include a TestFlight checklist built around a real week: add a medication, log a shot, get the reminder, log weight and a side effect, backfill a shot, open the report preview, see both paywalls.
