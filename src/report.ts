/**
 * The report for a prescriber and the CSV, as pure functions checked by
 * `npm test`. buildReport() makes one model; the PDF (reportHtml, printed by
 * expo-print) and the in-app preview (screens/ReportPreview) both draw it,
 * so they always show the same numbers.
 *
 * Page 1 reads in 20 seconds: the dates, the shots logged, the weight at
 * the start and the end with the change and the average per week, the
 * medication and dose history with dates, and side-effect counts. Then the
 * weight chart with the shots marked, and every shot with its site.
 * Doses are printed exactly as the person typed them; nothing is
 * calculated from them. Each part ends with the footer line.
 */
import type { FeelingEntry, Med, Shot, Weight, WeightUnit } from './model';
import { addDays, dayKey, shortDate, time24, timeLabel } from './days.ts';
import { doseLabel, scheduleLabel } from './schedule.ts';
import { siteLabel } from './sites.ts';
import { FEELINGS, feelingLabel, levelLabel, waistUnit } from './labels.ts';
import { changeSinceFirstShot, convertWeight, dailyWeights, fmt1, patterns, signed1, sinceShort, weeklyChange, type WeightPoint } from './insights.ts';

export const REPORT_RANGES = [30, 90, 180] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

export const REPORT_FOOTER = 'Logged by the patient with Shot Log. Not medical advice.';

export interface ReportShot {
  date: string;
  time: string;
  med: string;
  dose: string;
  site: string;
  later: boolean;
}

export interface ReportMed {
  name: string;
  schedule: string;
  start: string;
  doses: { from: string; dose: string }[];
}

export interface ReportModel {
  patient: string;
  from: string;
  to: string;
  rangeDays: number;
  unit: WeightUnit;
  meds: ReportMed[];
  /** Oldest first, as a clinic reads a log. */
  shots: ReportShot[];
  /** The shots' days, for the chart's marks. */
  shotDays: string[];
  weights: WeightPoint[];
  weightStart: WeightPoint | null;
  weightEnd: WeightPoint | null;
  /** End minus start inside the range. */
  weightChange: number | null;
  perWeek: number | null;
  /** Since the very first logged shot (may be before the range). */
  sinceFirstShot: { change: number; fromDay: string } | null;
  latestWaist: string | null;
  feelings: { kind: string; label: string; mild: number; moderate: number; strong: number; total: number }[];
  feelingTotal: number;
  /** Side-effect entries by days since the last shot (day of the shot ... 7+). */
  byDaysSince: number[];
}

export function buildReport(input: {
  meds: Med[];
  shots: Shot[];
  weights: Weight[];
  feelings: FeelingEntry[];
  unit: WeightUnit;
  rangeDays: number;
  now: number;
  patient: string;
}): ReportModel {
  const to = dayKey(input.now);
  const from = addDays(to, -(input.rangeDays - 1));
  const inRange = (at: number) => {
    const d = dayKey(at);
    return d >= from && d <= to;
  };
  const shots = input.shots.filter((s) => inRange(s.at)).sort((a, b) => a.at - b.at);
  const allPoints = dailyWeights(input.weights, input.unit);
  const points = allPoints.filter((p) => p.day >= from && p.day <= to);
  const feelings = input.feelings.filter((f) => inRange(f.at));
  const latest = [...input.weights].filter((w) => inRange(w.at) && w.waist != null).sort((a, b) => b.at - a.at)[0];
  const since = changeSinceFirstShot(allPoints.filter((p) => p.day <= to), input.shots);

  const counts = FEELINGS.map((f) => {
    const list = feelings.filter((x) => x.kind === f.id);
    return {
      kind: f.id,
      label: f.label,
      mild: list.filter((x) => x.level === 'mild').length,
      moderate: list.filter((x) => x.level === 'moderate').length,
      strong: list.filter((x) => x.level === 'strong').length,
      total: list.length,
    };
  }).filter((c) => c.total > 0);

  const medIds = new Set(shots.map((s) => s.medId));
  const meds = input.meds
    .filter((m) => medIds.has(m.id) || m.startDay <= to)
    .map((m) => ({
      name: m.name,
      schedule: scheduleLabel(m.schedule),
      start: shortDate(m.startDay, true),
      doses: [...m.doses].sort((a, b) => (a.fromDay < b.fromDay ? -1 : 1)).map((d) => ({ from: shortDate(d.fromDay, true), dose: doseLabel(d) || 'Not typed' })),
    }));

  return {
    patient: input.patient.trim(),
    from,
    to,
    rangeDays: input.rangeDays,
    unit: input.unit,
    meds,
    shots: shots.map((s) => ({
      date: shortDate(dayKey(s.at), true),
      time: timeLabel(s.at),
      med: s.medName || 'Shot',
      dose: doseLabel(s),
      site: s.site ? siteLabel(s.site) : '',
      later: s.backfilled,
    })),
    shotDays: shots.map((s) => dayKey(s.at)),
    weights: points,
    weightStart: points[0] ?? null,
    weightEnd: points.length > 1 ? points[points.length - 1] : null,
    weightChange: points.length > 1 ? points[points.length - 1].value - points[0].value : null,
    perWeek: weeklyChange(points),
    sinceFirstShot: since ? { change: since.change, fromDay: since.fromDay } : null,
    latestWaist: latest ? `${latest.waist} ${waistUnit(latest.unit)}` : null,
    feelings: counts,
    feelingTotal: feelings.length,
    byDaysSince: patterns(feelings, input.shots).buckets,
  };
}

export function htmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** "Aug 17, 2026 to Nov 14, 2026 (90 days)" */
export function rangeText(r: { from: string; to: string; rangeDays: number }): string {
  return `${shortDate(r.from, true)} to ${shortDate(r.to, true)} (${r.rangeDays} days)`;
}

/** The weight line as an SVG for the PDF: the day's weights, the shots as ticks along the bottom. */
export function weightSvg(r: ReportModel, w = 640, h = 180): string {
  const pts = r.weights;
  if (pts.length < 2) return '';
  const pad = { l: 44, r: 10, t: 10, b: 26 };
  const days = r.rangeDays - 1;
  const xOf = (day: string) => {
    const i = Math.round((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${r.from}T12:00:00Z`)) / 86_400_000);
    return pad.l + (i / Math.max(1, days)) * (w - pad.l - pad.r);
  };
  const vals = pts.map((p) => p.value);
  const lo = Math.floor(Math.min(...vals) - 1);
  const hi = Math.ceil(Math.max(...vals) + 1);
  const yOf = (v: number) => pad.t + (1 - (v - lo) / Math.max(1, hi - lo)) * (h - pad.t - pad.b);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${xOf(p.day).toFixed(1)} ${yOf(p.value).toFixed(1)}`).join(' ');
  const ticks = r.shotDays.map((d) => `<line x1="${xOf(d).toFixed(1)}" y1="${h - pad.b + 4}" x2="${xOf(d).toFixed(1)}" y2="${h - pad.b + 12}" stroke="#2747C9" stroke-width="2"/>`).join('');
  const grid = [lo, (lo + hi) / 2, hi]
    .map((v) => `<line x1="${pad.l}" x2="${w - pad.r}" y1="${yOf(v).toFixed(1)}" y2="${yOf(v).toFixed(1)}" stroke="#ddd"/><text x="${pad.l - 6}" y="${(yOf(v) + 4).toFixed(1)}" font-size="10" text-anchor="end" fill="#555">${fmt1(v)}</text>`)
    .join('');
  const dots = pts.map((p) => `<circle cx="${xOf(p.day).toFixed(1)}" cy="${yOf(p.value).toFixed(1)}" r="2.2" fill="#111"/>`).join('');
  return `<svg width="100%" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${grid}<path d="${line}" fill="none" stroke="#111" stroke-width="1.6"/>${dots}<line x1="${pad.l}" x2="${w - pad.r}" y1="${h - pad.b + 8}" y2="${h - pad.b + 8}" stroke="#bbb"/>${ticks}<text x="${pad.l}" y="${h - 2}" font-size="10" fill="#555">${htmlEscape(shortDate(r.from))}</text><text x="${w - pad.r}" y="${h - 2}" font-size="10" text-anchor="end" fill="#555">${htmlEscape(shortDate(r.to))}</text></svg>`;
}

/** The printable report. `sample` adds the SAMPLE watermark (never used for a share; the preview draws its own). */
export function reportHtml(r: ReportModel, opts: { sample?: boolean } = {}): string {
  const e = htmlEscape;
  const u = r.unit;
  const box = (n: string, l: string) => `<div class="box"><div class="n">${e(n)}</div><div class="l">${e(l)}</div></div>`;
  const footer = `<p class="foot">${e(REPORT_FOOTER)}</p>`;
  const medsRows = r.meds
    .map((m) => `<tr><td><b>${e(m.name)}</b><br><span class="soft">${e(m.schedule)}, first shot ${e(m.start)}</span></td><td>${m.doses.map((d) => `${e(d.dose)} from ${e(d.from)}`).join('<br>')}</td></tr>`)
    .join('');
  const feelRows = r.feelings.map((f) => `<tr><td>${e(f.label)}</td><td class="num">${f.mild}</td><td class="num">${f.moderate}</td><td class="num">${f.strong}</td><td class="num"><b>${f.total}</b></td></tr>`).join('');
  const sinceRow = r.byDaysSince.map((n) => `<td class="num">${n}</td>`).join('');
  const sinceHead = r.byDaysSince.map((_, i) => `<th class="num">${i === 0 ? 'Day of' : sinceShort(i)}</th>`).join('');
  const shotRows = r.shots
    .map((s) => `<tr><td>${e(s.date)}${s.later ? ' *' : ''}</td><td>${e(s.time)}</td><td>${e(s.med)}</td><td class="num">${e(s.dose)}</td><td>${e(s.site)}</td></tr>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Injection log</title><style>
  @page { margin: 16mm 14mm; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; font-size: 11pt; line-height: 1.35; position: relative; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 20pt; margin: 0 0 2pt; }
  h2 { font-family: Georgia, 'Times New Roman', serif; font-size: 13pt; margin: 16pt 0 6pt; border-bottom: 1px solid #999; padding-bottom: 3pt; }
  .meta { color: #333; margin: 0 0 10pt; }
  .soft { color: #555; font-size: 9.5pt; }
  .boxes { display: flex; gap: 8pt; margin: 8pt 0; }
  .box { flex: 1; border: 1px solid #999; border-radius: 6pt; padding: 7pt 8pt; }
  .box .n { font-family: Georgia, serif; font-size: 17pt; font-variant-numeric: tabular-nums; }
  .box .l { font-size: 9pt; color: #333; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th, td { text-align: left; padding: 3pt 5pt; border-bottom: 1px solid #ddd; vertical-align: top; }
  th { font-weight: 600; color: #333; border-bottom: 1px solid #999; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  tr { page-break-inside: avoid; }
  .foot { margin-top: 10pt; font-size: 9pt; color: #444; }
  .break { page-break-before: always; }
  .wm { position: fixed; top: 35%; left: 0; right: 0; text-align: center; font-size: 110pt; color: rgba(0,0,0,0.08); transform: rotate(-24deg); }
  </style></head><body>
  ${opts.sample ? '<div class="wm">SAMPLE</div>' : ''}
  <h1>Injection log</h1>
  <p class="meta">Patient: ${r.patient ? e(r.patient) : '________________________'}<br>Dates: ${e(rangeText(r))}</p>
  <div class="boxes">
    ${box(String(r.shots.length), 'Shots logged')}
    ${box(r.weightEnd ? `${fmt1(r.weightEnd.value)} ${u}` : r.weightStart ? `${fmt1(r.weightStart.value)} ${u}` : 'None', 'Latest weight in range')}
    ${box(r.weightChange != null ? `${signed1(r.weightChange)} ${u}` : 'None', r.perWeek != null ? `Change in range (${signed1(r.perWeek)} ${u} a week)` : 'Change in range')}
    ${box(String(r.feelingTotal), 'Side-effect entries')}
  </div>
  ${r.sinceFirstShot ? `<p class="soft">Since the weight on ${e(shortDate(r.sinceFirstShot.fromDay, true))}, around the first logged shot: ${e(signed1(r.sinceFirstShot.change))} ${u}.${r.latestWaist ? ` Latest waist: ${e(r.latestWaist)}.` : ''}</p>` : r.latestWaist ? `<p class="soft">Latest waist: ${e(r.latestWaist)}.</p>` : ''}
  <h2>Medication and dose history</h2>
  ${r.meds.length ? `<table><tr><th>Medication</th><th>Dose, as typed by the patient</th></tr>${medsRows}</table>` : '<p class="soft">No medication on the list.</p>'}
  <h2>Weight</h2>
  ${weightSvg(r) || '<p class="soft">Fewer than two days of weights in this range.</p>'}
  ${r.weights.length > 1 ? '<p class="soft">Daily weight (the average when a day has more than one). Blue marks along the bottom: shots.</p>' : ''}
  <h2>Side effects</h2>
  ${
    r.feelings.length
      ? `<table><tr><th>Logged as</th><th class="num">Mild</th><th class="num">Moderate</th><th class="num">Strong</th><th class="num">All</th></tr>${feelRows}</table>
  <p class="soft" style="margin-top:8pt">By days since the last shot (counts):</p>
  <table><tr>${sinceHead}</tr><tr>${sinceRow}</tr></table>`
      : '<p class="soft">None logged in this range.</p>'
  }
  ${footer}
  <h2 class="break">Every shot</h2>
  ${r.shots.length ? `<table><tr><th>Date</th><th>Time</th><th>Medication</th><th class="num">Dose</th><th>Site</th></tr>${shotRows}</table>${r.shots.some((s) => s.later) ? '<p class="soft">* Entered later by the patient.</p>' : ''}` : '<p class="soft">No shots in this range.</p>'}
  ${footer}
  </body></html>`;
}

/** One CSV field, quoted when needed. */
export function csvField(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADER = ['Date', 'Time', 'Type', 'Medication', 'Dose', 'Unit', 'Site', 'Weight', 'Weight unit', 'Waist', 'Side effect', 'Strength', 'Days since shot', 'Note', 'Entered later'];

/** Every shot, weight and side effect, oldest first, UTF-8 with a byte order mark so spreadsheets read it right. */
export function entriesCsv(input: { shots: Shot[]; weights: Weight[]; feelings: FeelingEntry[] }): string {
  type Line = { at: number; cells: (string | number | null)[] };
  const lines: Line[] = [];
  for (const s of input.shots)
    lines.push({ at: s.at, cells: [dayKey(s.at), time24(s.at), 'Shot', s.medName, s.amount, s.unit, s.site ? siteLabel(s.site) : '', '', '', '', '', '', '', s.note, s.backfilled ? 'yes' : ''] });
  for (const w of input.weights) lines.push({ at: w.at, cells: [dayKey(w.at), time24(w.at), 'Weight', '', '', '', '', w.value, w.unit, w.waist ?? '', '', '', '', '', ''] });
  const p = (at: number) => {
    let last: number | null = null;
    for (const s of input.shots) if (s.at <= at && (last == null || s.at > last)) last = s.at;
    return last == null ? '' : String(Math.round((Date.parse(dayKey(at)) - Date.parse(dayKey(last))) / 86_400_000));
  };
  for (const f of input.feelings) lines.push({ at: f.at, cells: [dayKey(f.at), time24(f.at), 'Side effect', '', '', '', '', '', '', '', feelingLabel(f.kind), levelLabel(f.level), p(f.at), f.note, ''] });
  lines.sort((a, b) => a.at - b.at);
  return '﻿' + [CSV_HEADER, ...lines.map((l) => l.cells)].map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n';
}

/** "shot-log-report-2026-11-14" */
export function exportName(kind: 'report' | 'entries', now: number): string {
  return `shot-log-${kind}-${dayKey(now)}`;
}

/** Weight in the report's unit, for a sentence. */
export function weightText(v: number, from: WeightUnit, to: WeightUnit): string {
  return `${fmt1(convertWeight(v, from, to))} ${to}`;
}
