// Prints the sample report (made-up data) the way the app prints it, but
// in Chromium: node store/render/report-pdf.mjs -> docs/design/report-sample.pdf
process.env.TZ = 'America/New_York';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { seed, NOW } from './seed.mjs';
const { buildReport, reportHtml } = await import('../../src/report.ts');

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, '../../docs/design/report-sample.pdf');
const data = seed();
const model = buildReport({ ...data, unit: 'lb', rangeDays: 90, now: NOW, patient: 'Sample Patient' });
const html = reportHtml(model);
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({ path: out, format: 'Letter', printBackground: true });
await page.screenshot({ path: path.join(here, '.report-page1.png'), fullPage: true });
await browser.close();
writeFileSync(path.join(here, '.report.html'), html);
console.log('wrote', out, model.shots.length, 'shots', model.weights.length, 'weight days');
