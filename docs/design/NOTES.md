# Shot Log design notes (1.0.0, Nov 14, 2026)

## Concept: a calm clinic notebook

The person opening this app is managing a medication on a schedule, often for months. They are not in a crisis; they want to be careful, and they want the record to look careful when a prescriber reads it. So the app is a good notebook from a calm clinic: warm paper (#F4F1EA), ink that is nearly black with a little blue in it (#1D232B), ruled hairlines between rows, a thin warm margin rule down the next-shot leaf, and printed-form eyebrows in small spaced capitals ("NEXT SHOT", "DOSE", "SITE").

One confident colour, a fountain-pen blue (#2747C9; #8EA4FF in dark mode), means one thing only: the live action. Log shot, Save, Continue, Preview the report, and on the body map the next site in the person's rotation. Picked tags and choices get an ink outline on a well, never the blue. Charts are ink; the only blue in a chart is the shots marked on the weight line, which are the actions the person took.

It looks nothing like Migraine Log on purpose (Apple 4.3, and our own bar): that app is a dark room with a rounded sans and an amber accent; this one is light paper, a book serif and a blue pen. Different kit names, different glyphs, different corners, a different icon.

Light by default. A proper dark mode follows the phone: the same notebook at night, a deep slate page (#16191D), leaves one step lighter (#1E2227), chalk-coloured ink (#E9E5DC) and the lighter blue. The report page in the preview is white paper in light mode and a softened paper (#E9E5DC) in dark mode, so it never glares.

## The system

- Type: Source Serif 4 (SIL OFL, `assets/fonts/OFL-SourceSerif4.txt`), SemiBold and Regular, from the @expo-google-fonts/source-serif-4 package. A book serif with a printed, clinical calm. Serif for titles, the due line, the main action and every number (doses, weights, counts), always with tabular figures (`tabular`), so "0.25 mg" and "195.6" line up and never jitter. Body text is the system font. Picked over Newsreader (Signature Maker's) and over a rounded sans (Migraine Log's Nunito), so the three apps stay apart.
- One type scale (`type` in `src/theme.ts`): display 30 (screen titles, the due line, big figures), title 20 (leaf headings, tray titles, the main action, dose figures), body 17, small 13 (secondary lines, eyebrows, the tab rail). The paywall's legal lines (11 and 12) and the report preview's printed page keep their own sizes.
- One spacing scale (`space`): 4, 8, 12, 16, 24, 32, 48. Screens sit 16 in from the edge; groups are 24 or 32 apart.
- Two corners: leaf 14 (cards, trays, the main action, the plans) and tab 8 (tags, choices, inputs, plain buttons). Circles stay circles (glyph buttons, radio dots, site marks).
- Depth: the page, leaves one step lighter with a 1 px edge at low opacity, and wells one step darker for inputs and choice tracks. Rows inside a leaf are ruled with hairlines.
- Glyphs (`src/ui/Glyph.tsx`), drawn for this app on a 24 grid with a 1.6 stroke and round ends: the pen (a capped injector pen seen whole, never a needle), the vial, the ring (what comes next; the Today tab), the ruled page (History), the chart (Insights), the folded report, sliders (Settings), the scale, the pulse (how I feel), the drop and the bowl (water and protein), the figure, and the small ones. No icon pack, no syringe, no pharmacy cross.
- Kit (`src/ui/`), all new names: Tap (the only way something becomes tappable, always with a pressed state), MainAction, Button, GlyphButton, LinkText, TopBar, PageTitle, Eyebrow, Leaf (with the optional margin rule), Rows and Row, Tag and Tags, Choice, Figure, ProMark, Toast, Field, SwitchRow, Radio, Tray (the bottom sheet), TabRail, When (the date pickers), BodyMap, WeightChart, SinceBars.
- The body map (`src/ui/BodyMap.tsx`): front and back figures, each one smooth ink line (points through a Catmull-Rom curve, so it reads drawn by hand rather than clip art), a few quiet inner lines (navel, hips, spine, seat). Eight sites. Marks: a dotted ring for a site, a filled ink dot for the last one used, the blue ring for the next in the rotation, an ink disc with a check for the one picked, and in site history a disc shaded by count with the count on it. "Left and right are your own." under it.
- Sizes: the main action fills the width and is 64 pt; every other target is at least 44 pt, except the body map's site targets, which are as large as the drawing allows without overlapping (about 31 pt on a 393 pt phone); each has a VoiceOver label ("Right abdomen, next in your rotation").
- Accessibility: every control has a VoiceOver label; charts are single images with a sentence for VoiceOver (the range, how many days weighed, the first and last weight, how many shots); the steppers and choices use adjustable and radio roles. Display text caps at 1.3 to 1.4x for Dynamic Type so nothing clips; body text scales freely. Motion is quiet: trays and modals fade.
- Copy: plain, short, kind; no weight-loss promises, no before-and-after, no "great job". Change figures are signed numbers ("-1.2 lb a week"), never praise.

## Renders

`after/` holds the screens at 393x852 points, @3x (1179x2556), reduced to 160 colours. They come from a throwaway web copy of the app (`store/render/setup.sh` builds it outside the repo; `store/render/render.mjs` drives it with Playwright): the real screens on react-native-web, an in-memory SQLite (sql.js) seeded with made-up data (`store/render/seed.mjs`: a weekly medication since Aug 13 with three dose steps, a weekly B12 shot for the Pro stack, most mornings weighed, side effects in the days after shots), a stubbed store with the planned prices ($6.99 weekly with 3 days free, $39.99 yearly, $79.99 lifetime), fixed iPhone safe areas with a drawn status bar, and a fixed clock (Sat Nov 14, 2026, 10:00 am). Fonts and layout are the app's. Not shown truthfully: the switches are the browser's (teal), the date pickers are drawn stand-ins for the iOS compact pickers, and SVG labels in the charts use the browser's default font instead of the system font. Haptics, Dynamic Type and VoiceOver are not visible in them.

- Onboarding: `01-onboarding-log`, `02-onboarding-next`, `03-onboarding-report` (each shows the real component it promises), `04-onboarding-tracking`, `05-onboarding-medication`.
- Home: `06-home-empty` (a medication, no shots: "Due today", "Pick a site on the map. The app learns your rotation as you go."), `07-home` (with history), `08-home-stack` (Pro: two medications, the soonest leads, the other below it with Log).
- Log sheet: `09-log-sheet` (filled in: medication, dose, next site picked), `10-log-sheet-site` (the body map: last site dot, picked site, the rotation line).
- The first-shot moment: `11-reminder-question`, `12-trial`, `13-trial-reminder`, `14-paywall-onboarding` (X visible after 3 seconds).
- `15-paywall-in-app` (from Trends; Yearly preselected, the Weekly row names the trial when this Apple ID can get it), `35-paywall-in-app-weekly` (Weekly picked: "No payment now"), `31-paywall-in-app-dark` (from Share PDF), `34-paywall-lifetime` (Switch to lifetime: only the Lifetime plan).
- `16-medications` (Pro stack), `17-medication` (the editor's dose history and Change the dose).
- Insights: `18-weight-chart`, `19-patterns`, `20-site-history`.
- `21-history`, `22-weight`, `23-how-i-feel`.
- Report: `24-report`, `25-report-preview-free` (SAMPLE, one button to the paywall), `26-report-preview-pro`, `36-report-preview-shots` (Every shot, oldest first, as in the PDF).
- `27-settings` (Settings is the fifth tab, with the sliders glyph; no Back bar), `32-settings-private` (Your data, Help and About: store shot 6), `33-settings-subscriber` (Pro through a yearly subscription: Switch to lifetime and Manage subscription), `39-plan-changed` (the toast after a change in Apple's sheet: "Your plan is now Yearly.").
- At 320 pt wide (the smallest iPhone width): `37-today-320`, `38-settings-320`. The five tab labels fit; the mini body map on Today is narrower below 375 pt so the medication's name keeps its line.
- Dark: `28-home-dark`, `29-log-sheet-dark`, `30-weight-chart-dark`.

Looked at every render; fixed from that: "Due Thursday" wrapped beside the mini map (the due line now has the full width); the unit choice cut "units" (the amount field is now a fixed width); text fields squeezed their unit suffix; the weight line was too long with its goal; the trial reminder screen was empty (it now shows the notification it promises); shot guides in the weight chart were too busy (now faint, the ticks carry it); the site rotation mixed medications (a B12 shot in the arm moved a weekly shot's rotation), now each medication keeps its own.

## Icon

The icon is the injector pen (picked Nov 15, 2026, replacing the figure). Four options are in `icon-options.png`, each big and at 60 and 40 px on a light and a dark wallpaper, drawn by `store/icon.js` (`node icon.js options`; `node icon.js` writes `assets/` and the website images). The pen itself lives in `store/icon-pen.svg`, so its artwork can be replaced in one step and everything redrawn from it.

1. pen (picked): an injector pen seen whole, with no needle, turned 45 degrees. It has a white body with a blue dose window and a soft coral cap, tip, neck and dose button, on a blue tile. Why:
   - It says injection at a glance, without a needle, a syringe or a pharmacy cross.
   - A solid blue tile stands out at small sizes and on both wallpapers; at 60 px it is still a white-and-coral pen on blue.
   - The coral cap gives it a second colour of its own, so it does not look like another blue health app.
2. figure (the 1.0.0 build 1 pick): the app's body map figure in ink on paper, the next site as a blue ring. Calm and true to the app, but at 60 px it reads as a person, close to a profile avatar.
3. rotation: four sites around a dotted circle, the next as the blue ring. Abstract; reads as a spinner or a dial.
4. page: a ruled notebook page with the next line ringed. True to the concept, but it is any notes app at 60 px.

The splash shows the pen alone, without the tile, at the size of the earlier mark, with the soft coral cap on both: on the paper an ink body with a paper-coloured window (#F4F1EA) so the window shows (`assets/splash-icon.png`), and on the dark slate the white body with its blue window (`assets/splash-icon-dark.png`). Android: the gradient tile as the background layer (flat #2F4BCB as the background colour), the white pen inside the safe zone, and a white silhouette for themed icons. Inside the app the icon appears once, in the trial's day-before notification on onboarding (`src/ui/AppMark.tsx`, re-rendered as `after/13-trial-reminder.png`).

The pen's shapes and colours are Brian's (Nov 15, 2026):
- the tile: a gradient from #4263EE at the top left to #1C34A6 at the bottom right, with a white glow (opacity 0.13 fading to 0) centred 22% across and 16% down, radius 75%
- the body: #FFFFFF to 0.55, then #D5DDFF across the pen's width
- the cap, tip, neck and dose button: #FFC2A8 to 0.5, then #F39A7A
- the window: #1B2F97 to #27409F, top to bottom, with the #FFC2A8 level and a white highlight at 0.55
- a drop shadow on the pen: dx 26, dy 44, blur 24, #0B1650 at 0.34

In the app (`AppMark`, `ICON_COLORS`) the tile is flat #2F4BCB at that small size, and there is no shadow.

## The report

`report-sample.pdf` is a 90-day report from the same made-up data, printed in Chromium from the same HTML the app prints with expo-print (the phone uses WebKit; page breaks may differ slightly). Page 1 reads in 20 seconds: four boxes (shots logged, latest weight, the change with the weekly average, side-effect entries), the change since the first shot and the latest waist, the medication and dose history with dates, the weight line with the shots as blue ticks, side effects by kind and strength and by days since the shot. Then every shot with time, dose and site. Black on white, Georgia headings: a document for a clinic. "Logged by the patient with Shot Log. Not medical advice." ends each part.

## Checklist

- [x] Concept and tokens in `src/theme.ts`; light by default; dark follows the phone; the splash and the root view are the page colour, so launch never flashes.
- [x] One serif, bundled, OFL, tabular figures for every dose, weight and count.
- [x] Own glyph set and component kit; nothing reused from Migraine Log's kit.
- [x] One accent, for the live action only; two corners; one type scale; one spacing scale.
- [x] Hand-drawn body map with labelled tap targets.
- [x] VoiceOver labels on every control; Dynamic Type caps on display text. Designed for, not yet checked on a device.
- [x] Copy voice grep-checked; no brand drug names.
- [x] `after/*.png` for Home (empty, with history, stack), the log sheet, the body map, medications, the weight chart, patterns, site history, the report preview (free and Pro), both paywalls, settings, onboarding, the first-shot moment, history, weight, how I feel, and three dark screens.
- [x] Icon options drawn; the pen picked (Nov 15) and written to `assets/`, both splash images, the Android layers and the website images.
