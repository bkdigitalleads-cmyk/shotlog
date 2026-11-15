const sharp = require('sharp');
const opentype = require('opentype.js');
const fs = require('fs');
const path = require('path');

// Shot Log's icon, drawn here so it can be redrawn exactly.
//   node icon.js options  -> docs/design/icon-options.png (three options, big and at 60 px on light and dark wallpapers)
//   node icon.js          -> assets/ (icon, splash, Android, favicon) and docs/ (icon-512, apple-touch-icon, og-image)
// The picked icon is the injector pen in store/icon-pen.svg (no needle, no pharmacy cross): the whole
// tile for the app icon, and the pen alone for the splash (an ink body on the paper, the white body on
// the dark slate, the coral cap on both). The figure, rotation and page are the earlier options.

const ROOT = path.join(__dirname, '..');
const SERIF = opentype.loadSync(path.join(ROOT, 'assets/fonts/SourceSerif4_600SemiBold.ttf'));
const PAPER = '#F4F1EA';
const INK = '#1D232B';
const BLUE = '#2747C9';
const MARGIN = '#DDA89A';
const CHOSEN = 'pen';
// The flat tile colour, where a single colour is needed (Android's background colour, flattening).
const BLUE_TILE = '#2F4BCB';

// The pen, from its own SVG file, so Brian's original artwork can replace it in one step.
const PEN_SVG = fs.readFileSync(path.join(__dirname, 'icon-pen.svg'), 'utf8');
const inner = (svgText) => svgText.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<!--[\s\S]*?-->/g, '');
// The tile is every full-size rect (the gradient and the glow over it).
const TILE_RE = /<rect[^>]*width="1024"[^>]*height="1024"[^>]*\/>/g;
const BODY_RE = /<(linear|radial)Gradient id="body"[\s\S]*?<\/(linear|radial)Gradient>/;
const WIN_RE = /<(linear|radial)Gradient id="win"[\s\S]*?<\/(linear|radial)Gradient>/;
/**
 * The pen alone (no tile). 'white' keeps the artwork as it is (the dark splash). 'ink' paints the body
 * in the app's ink and the window in the paper colour #F4F1EA, so the window shows on the ink body
 * (the paper splash). The soft coral cap stays on both.
 */
function penOnly(body) {
  let s = inner(PEN_SVG).replace(TILE_RE, '');
  if (body === 'ink') {
    s = s.replace(BODY_RE, '<linearGradient id="body" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3A4452"/><stop offset=".55" stop-color="#1D232B"/><stop offset="1" stop-color="#12161B"/></linearGradient>');
    s = s.replace(WIN_RE, '<linearGradient id="win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F1EA"/><stop offset="1" stop-color="#F4F1EA"/></linearGradient>');
  }
  return s;
}

/** The tile alone (its gradient and glow, no pen): Android's adaptive background layer. */
function tileOnly() {
  const defs = (inner(PEN_SVG).match(/<defs>[\s\S]*?<\/defs>/) || [''])[0];
  return defs + (inner(PEN_SVG).match(TILE_RE) || []).join('');
}

// The body map's half outline (src/ui/BodyMap.tsx), smoothed the same way.
const HALF = [
  [5, 42], [6, 50], [17, 53], [27, 57], [32, 65], [34, 81], [36, 99], [38, 116], [39, 127], [37, 134], [33, 131],
  [31, 116], [29, 99], [27, 84], [25, 75], [25, 91], [25, 106], [27, 120], [29, 134], [28, 150], [25, 175], [22, 200],
  [20, 222], [19, 231], [11, 233], [9, 224], [8, 200], [6, 175], [3, 157], [0, 152],
];
function smooth(pts) {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
}
function figure(cx, k, oy) {
  const r = HALF.map(([x, y]) => [cx + x * k, oy + y * k]);
  const l = HALF.slice(0, -1).reverse().map(([x, y]) => [cx - x * k, oy + y * k]);
  return smooth([...r, ...l.slice(0, -1)]);
}

const OPTIONS = {
  // 1. The pen (picked): an injector pen seen whole, no needle, white body with a coral cap on solid blue.
  pen: () => inner(PEN_SVG),
  // 2. The figure: the app's own body map line, filled in ink and cropped at the knees, the next site as the blue ring.
  figure: (bg = PAPER) => `
    <rect width="1024" height="1024" fill="${bg}"/>
    <line x1="196" y1="0" x2="196" y2="1024" stroke="${MARGIN}" stroke-width="10"/>
    <circle cx="560" cy="214" r="100" fill="${INK}"/>
    <path d="${figure(560, 7.4, -20)}" fill="${INK}"/>
    <circle cx="650" cy="792" r="104" fill="${PAPER}" stroke="${BLUE}" stroke-width="50"/>`,
  // 3. The rotation: four sites around a circle, three logged in ink, the next one as the blue ring.
  rotation: (bg = PAPER) => `
    <rect width="1024" height="1024" fill="${bg}"/>
    <line x1="218" y1="0" x2="218" y2="1024" stroke="${MARGIN}" stroke-width="10"/>
    <circle cx="560" cy="512" r="250" fill="none" stroke="${INK}" stroke-opacity="0.18" stroke-width="18" stroke-dasharray="6 36" stroke-linecap="round"/>
    <circle cx="560" cy="262" r="86" fill="${INK}"/>
    <circle cx="310" cy="512" r="86" fill="${INK}" fill-opacity="0.55"/>
    <circle cx="560" cy="762" r="86" fill="${INK}" fill-opacity="0.3"/>
    <circle cx="810" cy="512" r="78" fill="none" stroke="${BLUE}" stroke-width="40"/>`,
  // 4. The page: a ruled notebook page with a logged line and the next one ringed.
  page: (bg = PAPER) => `
    <rect width="1024" height="1024" fill="${bg}"/>
    <rect x="232" y="150" width="600" height="724" rx="44" fill="#FFFFFF" stroke="${INK}" stroke-width="22"/>
    <line x1="352" y1="150" x2="352" y2="874" stroke="${MARGIN}" stroke-width="10"/>
    <line x1="410" y1="330" x2="740" y2="330" stroke="${INK}" stroke-width="34" stroke-linecap="round"/>
    <line x1="410" y1="470" x2="690" y2="470" stroke="${INK}" stroke-width="34" stroke-linecap="round"/>
    <line x1="410" y1="610" x2="600" y2="610" stroke="${INK}" stroke-width="34" stroke-linecap="round" stroke-opacity="0.35"/>
    <circle cx="690" cy="610" r="58" fill="none" stroke="${BLUE}" stroke-width="34"/>`,
};

const svg = (body, size = 1024) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${body}</svg>`);

/** The iOS mask (a superellipse, close enough as a rounded square) for previews only; the store gets the square. */
const mask = (size) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.2237}" fill="#fff"/></svg>`);

async function tile(body, size) {
  const png = await sharp(svg(body)).resize(size, size).png().toBuffer();
  return sharp(png).composite([{ input: mask(size), blend: 'dest-in' }]).png().toBuffer();
}

function textPath(text, x, y, size, fill, anchor = 'start') {
  const w = SERIF.getAdvanceWidth(text, size);
  const p = SERIF.getPath(text, anchor === 'middle' ? x - w / 2 : x, y, size);
  return `<path d="${p.toPathData(2)}" fill="${fill}"/>`;
}

async function options() {
  const names = Object.keys(OPTIONS);
  const W = 1980, H = 780;
  const comps = [];
  let bg = `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`;
  names.forEach((n, i) => {
    const x = 60 + i * 480;
    bg += textPath(`${i + 1}. ${n}${n === CHOSEN ? ' (picked)' : ''}`, x, 70, 34, INK);
    bg += `<rect x="${x}" y="500" width="400" height="120" rx="16" fill="#E9E6DF"/><rect x="${x}" y="640" width="400" height="120" rx="16" fill="#1B1E23"/>`;
  });
  for (let i = 0; i < names.length; i++) {
    const x = 60 + i * 480;
    comps.push({ input: await tile(OPTIONS[names[i]](), 380), left: x + 10, top: 100 });
    for (const [row, top] of [[0, 530], [1, 670]]) {
      const small = await tile(OPTIONS[names[i]](), 60);
      comps.push({ input: small, left: x + 30, top });
      comps.push({ input: small, left: x + 110, top });
      comps.push({ input: await tile(OPTIONS[names[i]](), 40), left: x + 190, top: top + 10 });
    }
  }
  const out = path.join(ROOT, 'docs/design/icon-options.png');
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${bg}</svg>`)).composite(comps).png().toFile(out);
  console.log('wrote', out);
}

async function assets() {
  const body = OPTIONS[CHOSEN]();
  const A = (f) => path.join(ROOT, 'assets', f);
  const D = (f) => path.join(ROOT, 'docs', f);
  await sharp(svg(body)).resize(1024, 1024).flatten({ background: BLUE_TILE }).png().toFile(A('icon.png'));
  // Splash: the pen alone, sized like the earlier mark; an ink body on the paper, the white body on the dark slate.
  await sharp(svg(penOnly('ink'))).resize(512, 512).png().toFile(A('splash-icon.png'));
  await sharp(svg(penOnly('white'))).resize(512, 512).png().toFile(A('splash-icon-dark.png'));
  // Android adaptive icon: the white pen on the blue, kept inside the safe zone; a white silhouette for themed icons.
  const safe = (s) => `<g transform="translate(512 512) scale(0.78) translate(-512 -512)">${s}</g>`;
  await sharp(svg(safe(penOnly('white')))).resize(512, 512).png().toFile(A('android-icon-foreground.png'));
  const silhouette = penOnly('white').replace(/fill="url\(#[a-z]+\)"/g, 'fill="#FFFFFF"').replace(/fill="#FFC2A8"/g, 'fill="#FFFFFF"').replace(/ filter="url\(#sh\)"/, '');
  await sharp(svg(safe(silhouette))).resize(512, 512).png().toFile(A('android-icon-monochrome.png'));
  await sharp(svg(tileOnly())).resize(512, 512).png().toFile(A('android-icon-background.png'));
  await sharp(svg(body)).resize(48, 48).png().toFile(A('favicon.png'));
  await sharp(svg(body)).resize(512, 512).png().toFile(D('icon-512.png'));
  await sharp(svg(body)).resize(180, 180).flatten({ background: BLUE_TILE }).png().toFile(D('apple-touch-icon.png'));
  // The social card: the icon, the name, and the two lines under it.
  const og = `<rect width="1200" height="630" fill="${PAPER}"/><line x1="120" y1="0" x2="120" y2="630" stroke="${MARGIN}" stroke-width="4"/>
    ${textPath('Shot Log', 520, 270, 96, INK)}
    ${textPath('Peptide and GLP-1 shot tracker for iPhone', 524, 340, 34, '#4E5661')}
    ${textPath('Log a shot in seconds. Know when and where the next one goes.', 524, 400, 26, '#4E5661')}
    ${textPath('Private and offline. Not medical advice.', 524, 445, 26, '#4E5661')}`;
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">${og}</svg>`))
    .composite([{ input: await tile(body, 300), left: 170, top: 165 }])
    .png()
    .toFile(D('og-image.png'));
  console.log('wrote assets and docs images for', CHOSEN);
}

(process.argv[2] === 'options' ? options() : assets()).catch((e) => {
  console.error(e);
  process.exit(1);
});
