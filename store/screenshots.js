const sharp = require('sharp');
const opentype = require('opentype.js');
const fs = require('fs');
const path = require('path');

// App Store screenshots at 1206x2622 (the size App Store Connect asks for),
// built from the app's real screens (docs/design/after, or a folder of the
// same names at full colour: `node screenshots.js render/out`). Each is the
// app's warm paper, a caption at the top in the app's serif (Source Serif 4
// SemiBold, drawn as outlines so it looks the same anywhere) carrying the
// search words, and under it the real screen with rounded corners and a
// hairline edge. No device frames, no gradients, no emoji.
// Writes store/screenshots/01-....png to 06-....png.

const ROOT = path.join(__dirname, '..');
const SRC = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'docs/design/after');
const OUT = path.join(__dirname, 'screenshots');
const SERIF = opentype.loadSync(path.join(ROOT, 'assets/fonts/SourceSerif4_600SemiBold.ttf'));
const PAPER = '#F4F1EA';
const INK = '#1D232B';
const MARGIN = '#DDA89A';
const W = 1206;
const H = 2622;

const SHOTS = [
  { file: '09-log-sheet', caption: 'Log Every GLP-1 Shot in Seconds' },
  { file: '07-home', caption: 'Next Dose and Injection Site' },
  { file: '18-weight-chart', caption: 'Weight Tracker With Every Shot Marked' },
  { file: '19-patterns', caption: 'Side Effects by Day After Your Shot' },
  { file: '26-report-preview-pro', caption: 'A Clean Report for Your Prescriber' },
  { file: '32-settings-private', caption: 'Private Peptide Log, Works Offline' },
];

/** The caption as one or two centred lines, as large as fits; a long one breaks at the word nearest the middle. */
function caption(text, top, maxSize) {
  const maxW = W * 0.84;
  const width = (t, s) => SERIF.getAdvanceWidth(t, s);
  let lines = [text];
  let size = maxSize;
  if (width(text, size) > maxW) {
    const words = text.split(' ');
    let best = 1;
    let diff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const d = Math.abs(width(words.slice(0, i).join(' '), size) - width(words.slice(i).join(' '), size));
      if (d < diff) {
        diff = d;
        best = i;
      }
    }
    lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
    while (lines.some((l) => width(l, size) > maxW)) size -= 2;
  }
  const lh = size * 1.14;
  const paths = lines.map((l, i) => SERIF.getPath(l, (W - width(l, size)) / 2, top + size + i * lh, size).toPathData(2));
  return { svg: paths.map((d) => `<path d="${d}" fill="${INK}"/>`).join(''), bottom: top + size + (lines.length - 1) * lh };
}

async function one(shot, i) {
  const file = path.join(SRC, `${shot.file}.png`);
  if (!fs.existsSync(file)) throw new Error(`missing render ${file}`);
  const cap = caption(shot.caption, 150, 104);
  const screenW = 940;
  const screenH = Math.round((screenW * 852) / 393);
  const top = Math.round(cap.bottom + 110);
  const r = 64;
  const screen = await sharp(file)
    .resize(screenW, screenH)
    .composite([{ input: Buffer.from(`<svg width="${screenW}" height="${screenH}"><rect width="${screenW}" height="${screenH}" rx="${r}" fill="#fff"/></svg>`), blend: 'dest-in' }])
    .png()
    .toBuffer();
  const left = Math.round((W - screenW) / 2);
  const frame = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${PAPER}"/>
    <line x1="96" y1="0" x2="96" y2="${H}" stroke="${MARGIN}" stroke-width="4"/>
    ${cap.svg}
    <rect x="${left - 2}" y="${top - 2}" width="${screenW + 4}" height="${screenH + 4}" rx="${r + 2}" fill="rgba(29,35,43,0.14)"/>
  </svg>`;
  const name = `${String(i + 1).padStart(2, '0')}-${shot.file.replace(/^\d+-/, '')}.png`;
  await sharp(Buffer.from(frame)).composite([{ input: screen, left, top }]).png({ palette: true, colours: 200 }).toFile(path.join(OUT, name));
  return name;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));
  for (let i = 0; i < SHOTS.length; i++) {
    const name = await one(SHOTS[i], i);
    const m = await sharp(path.join(OUT, name)).metadata();
    console.log(name, `${m.width}x${m.height}`);
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
