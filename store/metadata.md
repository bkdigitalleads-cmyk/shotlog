# Shot Log, App Store metadata (1.0.0)

Everything here is pasted into App Store Connect by Brian and Cowork. No em dashes anywhere, no brand drug names (the brands of these medications are trademarks; only generic names appear), no "Unlock", "Premium", "Seamless", "Effortless", "Welcome", "Let's" or exclamation marks, no weight-loss promises and no before-and-after language. Support email: bkdigitalleads@gmail.com.

App record: bundle id com.bwk.shotlog, ASC app id 6834850120 (https://apps.apple.com/app/id6834850120, eas.json `ascAppId`), Expo project bkdeveloper123/shotlog (projectId 0cdea6c0-e329-4f94-979a-5c9d8fdffc37, app.json `extra.eas.projectId`), RevenueCat public iOS key in app.json `extra.revenueCatApiKeyIos` (set; purchases are on). The three products are live in App Store Connect and attached to entitlement `pro`, offering `default`.

## Name (28/30)
Peptide Tracker: GLP-1 Shots

Home screen name and in-app name (app.json `name`): Shot Log.

## Subtitle (26/30)
Shot, Protein & Weight Log

## Keywords (98/100, draft; Cowork may revise after an ASOMobile pass)
glp1,glp,injection,site,dose,reminder,semaglutide,tirzepatide,retatrutide,peptides,loss,medication

Rule: no brand or trademark. The three drug words are generic (INN) names, not brands. Apple combines words across the name, subtitle and keywords, so "glp 1 tracker", "peptide tracker", "shot tracker", "injection tracker", "protein tracker", "weight log", "injection site", "dose reminder" and "medication log" are covered.

Research behind them (the Nov 14 sweep, 934 phrases): "glp 1 tracker" popularity 51, "peptide tracker" 50, "protein tracker" 49, "shot tracker" 33, "injection tracker" 29. Half the "peptide tracker" top 10 has under 650 ratings, and it is the only niche measured where an app under 200 days old shows real revenue.

Notes for the ASOMobile pass: "peptides" is the plural of a name word (Apple matches plurals on its own), so it could go to a new word; "glp" may be redundant next to "glp1" and the name's "GLP-1"; "loss" is there for "weight loss" searches, which is a search phrase, not a promise the app makes; "retatrutide" is investigational, keep it only if Apple accepts it in review.

## Promotional text (167/170)
Log a shot in seconds with the dose and the site. Know when the next one is due and where it goes. See weight and side effects against your shots. Nothing is uploaded.

## Description
Log a shot in a few seconds with the dose and the injection site, always know when the next one is due and where it goes in your own rotation, and bring your prescriber a clean record. Shot Log is a GLP-1 and peptide shot tracker with a protein and weight log, for anyone on a weekly or daily injectable. It works offline, and nothing you log leaves your iPhone.

LOG A SHOT IN SECONDS
• One tap on Log shot opens the sheet already filled in: your medication, its current dose and the next site
• Save is the only tap needed; change the dose, the site or the time if you like
• Add or edit any past shot, weight or entry by date

KNOW WHEN AND WHERE
• The next shot on the first screen: Due Thursday, or Due in 2 days
• A simple body map: abdomen, thighs, upper arms and glutes, left and right
• The app learns your own rotation and shows the next site: Last: left abdomen. Next in your rotation: right abdomen.
• A reminder on the due day, with a button to snooze for an hour

YOUR MEDICATIONS, YOUR DOSES
• Any name you use; your dose as an amount and a unit (mg, mcg, mL or units)
• Every few days, or chosen weekdays
• Dose changes logged with a date, so your history shows them
• No suggested doses, no titration schedules and no dose math, ever

WEIGHT AND HOW YOU FEEL, AGAINST YOUR SHOTS
• Quick weight entry with an optional waist, and a goal you set
• How I feel in one tap: nausea, constipation, heartburn, fatigue, headache, low appetite, site reaction, other, each mild, moderate or strong
• Protein and water counters against goals you set
• Trends: your weight over 30, 90 or 180 days with every shot marked on the line
• Patterns: which days after a shot your side effects cluster on, counted
• Site history: your last 12 shots on the body map

A CLEAN RECORD FOR YOUR PRESCRIBER
• Medication and dose history with dates, every shot with its site, the weight trend and side-effect counts
• Share it as a PDF or print it; export everything as a CSV

PRIVATE BY DESIGN
• Everything stays on your iPhone
• No account, no sign-in, no ads, no tracking
• Works in airplane mode

NOT MEDICAL ADVICE
Shot Log is a personal log. It does not diagnose, treat, calculate doses or give medical advice. Follow your prescriber about your medication and your doses.

SHOT LOG PRO
Free, always: logging shots for one medication, the next-due line, one reminder, weight entry, how you feel and the last 30 days of history. Pro adds more than one medication, trends, patterns, site history, protein and water, the report for your prescriber with the CSV, and your whole history. Choose weekly (with a free trial for new subscribers), yearly, or lifetime once.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://bkdigitalleads-cmyk.github.io/shotlog/privacy.html

## What's New (1.0.0)
First version. Log a shot with the dose and the site, see when the next one is due and where it goes, track weight and how you feel, and make a report for your prescriber, all on your iPhone.

## Category
Primary: Health & Fitness. Secondary: Medical.

## Age rating (answer honestly)
Every content question is None, except:
- Medical or treatment information: the app is about the person's own medication and injections, and shows their own doses, schedules and side effects. It gives no advice, no doses and no instructions. That is mild, infrequent medical information: answering "Infrequent/Mild" is the honest answer, and App Store Connect then computes a rating above 4+ (13+ in the current scheme, as far as we know; ASC shows the result before saving).
- Health or wellness topics (the newer questionnaire): Yes.
- References to drugs: the medications are prescription or self-directed injections the person names themselves; no recreational drug references. Answer None.
- No user-generated content shared with others, no web access, no gambling, no contests.

Same reasoning as Migraine Log: the honest answer and 13+ is what we recommend; ask Brian before choosing.

## App Privacy (nutrition label)
Data Not Collected. Everything the person logs stays in the app's storage on the device and is never uploaded; there is no account and no analytics. RevenueCat validates purchases with an anonymous app user id and purchase history; answer the purchase questions the same way as for the other apps.

## Pricing and RevenueCat
- Subscription group "Shot Log Pro".
- `shot_pro_weekly`: auto-renewing weekly, $6.99/week, 3-day free trial (introductory offer). RevenueCat package `$rc_weekly`. Preselected and listed first on the onboarding paywall. On every paywall (the in-app ones too) the Weekly row, the legal lines and "No payment now" name the free trial whenever StoreKit says this Apple ID can still get it, because Apple grants it wherever weekly is bought.
- `shot_pro_yearly`: auto-renewing yearly, $39.99/year, no trial. Package `$rc_annual`. Preselected and listed first on the in-app paywall as "Yearly, best value".
- `shot_pro_lifetime`: non-consumable, $79.99. Package `$rc_lifetime`, "Lifetime, pay once". After it is bought, if a weekly or yearly subscription is still renewing, the app says so and opens Apple's Manage Subscriptions sheet. Subscribers reach it from Settings, Switch to lifetime ("Pay once, then cancel the subscription"), which opens the paywall with only the Lifetime plan.
- RevenueCat: entitlement `pro` on all three products, offering `default` with the three packages.
- Prices and trial text in the app always come from StoreKit; the figures here are the planned store prices only.

## App Review note (paste into ASC, Notes)
Shot Log is a personal log for people who take a medication by injection on a schedule. It does not diagnose, treat, calculate doses or give medical advice, and tells the person to follow their prescriber (Settings, About, and the website say so). There is no dose calculator, no suggested doses, no titration schedules, no unit conversion for doses and no links to sellers: the person types their own medication name and dose. No account or sign-in, no network features, and nothing the user logs is sent anywhere. No HealthKit.

Free use, always: adding one medication, logging shots for it (with the dose and the injection site), the next-due line, one reminder, weight entry, how I feel, editing and adding past entries, and the last 30 days of history. Logging a shot is never behind the paywall.

Pro adds more than one medication, weight trends with the shots marked, side-effect patterns, site history, protein and water counters, the report as a PDF to share or print (free users can open a preview marked SAMPLE that cannot be shared or printed), the CSV export, and history older than 30 days. Products: weekly with a 3-day free trial (named on every paywall whenever the Apple ID can still get it), yearly, and lifetime. A subscriber can switch to lifetime from Settings, Switch to lifetime; after that purchase the app offers Apple's Manage Subscriptions sheet to cancel the subscription.

On first launch: three short intro screens, "What are you tracking?" (a label only), and "Add your first medication" (Skip is fine). No paywall during onboarding. After the first shot is saved, the app asks once whether to turn on reminders (local notifications on the due day). Then, if the Apple ID can still get the free trial, two screens explain the trial and the day-before reminder, and the paywall opens. The close button (X, top right) appears after 3 seconds; tap it to keep using the app for free. This paywall shows once; on a later day it may show once more.

To test: add a medication (any name, for example "Test", dose 1 mg, every 7 days), tap Log shot on Today, tap Save. Then History, the plus, A shot, to add a past one. Report, Preview the report.

## Screenshot plan (6 shots, 1206x2622, from the real renders)
`node store/screenshots.js` builds them from docs/design/after (or from a folder of full-colour renders: `node store/screenshots.js store/render/out`) into store/screenshots/. Each is the app's paper, a caption in the app's serif at the top carrying the search words, and the real screen under it with rounded corners. No device frames, no gradients.
1. Log a shot: the log sheet with the dose and the next site filled in: "Log Every GLP-1 Shot in Seconds"
2. Next due and site: Today with "Due Thursday", the body map and Log shot: "Next Dose and Injection Site"
3. Weight with shots marked: Trends over 90 days: "Weight Tracker With Every Shot Marked"
4. Side-effect patterns: counts by days after a shot: "Side Effects by Day After Your Shot"
5. Doctor report: the report preview (Pro): "A Clean Report for Your Prescriber"
6. Private and offline: Settings, Your data and About: "Private Peptide Log, Works Offline"

The same screens can be captured on a device from a TestFlight build if Brian prefers real device pixels; the renders' switches and date pickers are web stand-ins, and none of them appear in these six.
