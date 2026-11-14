/**
 * Injection sites and the person's own rotation, as pure functions checked
 * by `npm test`. The app learns the order from the shots logged and shows
 * the next site in it. It never says a site is right or wrong: the wording
 * stays "Last: left abdomen. Next in your rotation: right abdomen."
 */
import type { Site } from './model';

/** The body map's order, used only until the person has a rotation of their own. */
export const SITES: Site[] = ['abdomen-left', 'abdomen-right', 'thigh-left', 'thigh-right', 'arm-left', 'arm-right', 'glute-left', 'glute-right'];

const AREA: Record<string, string> = { abdomen: 'abdomen', thigh: 'thigh', arm: 'upper arm', glute: 'glute' };

export function isSite(v: unknown): v is Site {
  return typeof v === 'string' && (SITES as string[]).includes(v);
}

/** "left abdomen", "right upper arm" (lower case, for the middle of a sentence). */
export function siteName(site: Site): string {
  const [area, side] = site.split('-');
  return `${side} ${AREA[area]}`;
}

/** "Left abdomen" */
export function siteLabel(site: Site | null): string {
  if (!site) return 'No site';
  const s = siteName(site);
  return s[0].toUpperCase() + s.slice(1);
}

/**
 * The next site in the person's own rotation, from the sites of their shots
 * oldest first (nulls skipped):
 *  1. the site that followed the last site the previous time it was used
 *  2. else the next one among the sites they have used, in the order they first used them
 *  3. else the next on the body map's order
 * Null before any shot with a site.
 */
export function nextSite(history: (Site | null)[]): Site | null {
  const h = history.filter(isSite);
  if (h.length === 0) return null;
  const last = h[h.length - 1];
  for (let i = h.length - 2; i >= 0; i--) {
    if (h[i] === last && h[i + 1] !== last) return h[i + 1];
  }
  const used: Site[] = [];
  for (const s of h) if (!used.includes(s)) used.push(s);
  if (used.length > 1) return used[(used.indexOf(last) + 1) % used.length];
  return SITES[(SITES.indexOf(last) + 1) % SITES.length];
}

/** The rotation line on Home and on the log sheet. */
export function rotationLine(last: Site | null, next: Site | null): string {
  if (!last) return 'Pick a site on the map. The app learns your rotation as you go.';
  if (!next || next === last) return `Last: ${siteName(last)}.`;
  return `Last: ${siteName(last)}. Next in your rotation: ${siteName(next)}.`;
}

/** The last `n` shots with a site, newest first, with how recent each is (0 = newest). */
export function recentSites(history: { site: Site | null; at: number }[], n = 12): { site: Site; at: number; rank: number }[] {
  return history
    .filter((s): s is { site: Site; at: number } => isSite(s.site))
    .sort((a, b) => b.at - a.at)
    .slice(0, n)
    .map((s, rank) => ({ site: s.site, at: s.at, rank }));
}
