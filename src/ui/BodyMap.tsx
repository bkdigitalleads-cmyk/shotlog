import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Text as SvgText } from 'react-native-svg';
import type { Site } from '../model';
import { SITES, siteLabel } from '../sites';
import { Theme, space, type } from '../theme';
import { Tap } from './Kit';
import { tick } from './motion';

/**
 * The body map: a front and a back figure drawn as one calm ink line each,
 * with the eight sites as marks. Left and right are the person's own (on
 * the front figure their left is on the right of the screen, as in a
 * mirror held by someone else; the caption says so).
 *
 * Marks: an empty dotted ring for a site, a filled ink dot for the last
 * one used, the fountain-pen blue ring for the next in the rotation (the
 * live action), a filled ink disc with a check for the one picked, and in
 * history mode a disc shaded by how many of the recent shots went there.
 * Every mark is a real button with a VoiceOver label.
 */

const VB_W = 300;
const VB_H = 250;
const FRONT = 82;
const BACK = 218;

/** Half of the silhouette, from the neck to the middle of the legs (x from the centre line, y down). */
const HALF: [number, number][] = [
  [5, 42], [6, 50], [17, 53], [27, 57], [32, 65], [34, 81], [36, 99], [38, 116], [39, 127], [37, 134], [33, 131],
  [31, 116], [29, 99], [27, 84], [25, 75], [25, 91], [25, 106], [27, 120], [29, 134], [28, 150], [25, 175], [22, 200],
  [20, 222], [19, 231], [11, 233], [9, 224], [8, 200], [6, 175], [3, 157], [0, 152],
];

/** A smooth closed path through points (Catmull-Rom as cubic Béziers), so the line reads as drawn by hand. */
function smooth(points: [number, number][]): string {
  const n = points.length;
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + ' Z';
}

function silhouette(cx: number): string {
  const right = HALF.map(([x, y]) => [cx + x, y] as [number, number]);
  const left = HALF.slice(0, -1)
    .reverse()
    .map(([x, y]) => [cx - x, y] as [number, number]);
  return smooth([...right, ...left.slice(0, -1)]);
}

const FRONT_PATH = silhouette(FRONT);
const BACK_PATH = silhouette(BACK);

/** Where each site sits in the drawing. Front: the person's left is to the right. Back: their left is to the left. */
export const SITE_SPOTS: Record<Site, { x: number; y: number }> = {
  'abdomen-left': { x: FRONT + 13, y: 110 },
  'abdomen-right': { x: FRONT - 13, y: 110 },
  'thigh-left': { x: FRONT + 15, y: 172 },
  'thigh-right': { x: FRONT - 15, y: 172 },
  'arm-left': { x: FRONT + 33, y: 86 },
  'arm-right': { x: FRONT - 33, y: 86 },
  'glute-left': { x: BACK - 13, y: 140 },
  'glute-right': { x: BACK + 13, y: 140 },
};

export interface SiteUse {
  /** How many of the recent shots went here. */
  count: number;
  /** The newest one's date, for VoiceOver ("last used Nov 12"). */
  lastLabel?: string;
}

export default function BodyMap({
  theme,
  width,
  picked = null,
  last = null,
  next = null,
  uses,
  onPick,
  caption = true,
}: {
  theme: Theme;
  width: number;
  picked?: Site | null;
  last?: Site | null;
  next?: Site | null;
  /** History mode: how many recent shots went to each site. */
  uses?: Partial<Record<Site, SiteUse>>;
  onPick?: (s: Site) => void;
  caption?: boolean;
}) {
  const scale = width / VB_W;
  const height = VB_H * scale;
  const maxUse = uses ? Math.max(1, ...Object.values(uses).map((u) => u?.count ?? 0)) : 1;
  // Targets: as large as 44 points where the drawing allows, never overlapping their neighbour.
  const target = Math.min(44, 26 * scale);

  return (
    <View>
      <View style={{ width, height }}>
        <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          {[FRONT, BACK].map((cx) => (
            <G key={cx}>
              <Circle cx={cx} cy={27} r={13} fill={theme.surface} stroke={theme.ink} strokeWidth={1.4} />
              <Path d={cx === FRONT ? FRONT_PATH : BACK_PATH} fill={theme.surface} stroke={theme.ink} strokeWidth={1.4} strokeLinejoin="round" />
            </G>
          ))}
          {/* A few quiet inner lines: the navel and the hips on the front, the spine and the seat on the back. */}
          <Circle cx={FRONT} cy={112} r={1.2} fill={theme.inkFaint} />
          <Path d={`M${FRONT - 22} 138 Q${FRONT} 146 ${FRONT + 22} 138`} stroke={theme.chartSoft} strokeWidth={1} fill="none" />
          <Line x1={BACK} y1={58} x2={BACK} y2={124} stroke={theme.chartSoft} strokeWidth={1} strokeDasharray="2 4" />
          <Path d={`M${BACK} 128 L${BACK} 152 M${BACK - 24} 154 Q${BACK - 12} 160 ${BACK} 152 Q${BACK + 12} 160 ${BACK + 24} 154`} stroke={theme.chartSoft} strokeWidth={1} fill="none" />
          <SvgText x={FRONT} y={247} fontSize={11} fill={theme.inkSoft} textAnchor="middle">
            Front
          </SvgText>
          <SvgText x={BACK} y={247} fontSize={11} fill={theme.inkSoft} textAnchor="middle">
            Back
          </SvgText>
          {SITES.map((s) => {
            const { x, y } = SITE_SPOTS[s];
            const use = uses?.[s];
            if (uses) {
              const n = use?.count ?? 0;
              return (
                <G key={s}>
                  <Circle cx={x} cy={y} r={9.5} fill={n > 0 ? theme.ink : 'none'} fillOpacity={n > 0 ? 0.25 + 0.75 * (n / maxUse) : 0} stroke={theme.inkFaint} strokeWidth={1} strokeDasharray={n > 0 ? undefined : '2 2'} />
                  {n > 0 && (
                    <SvgText x={x} y={y + 3.8} fontSize={10.5} fontWeight="600" fill={n / maxUse > 0.45 ? theme.bg : theme.ink} textAnchor="middle">
                      {String(n)}
                    </SvgText>
                  )}
                </G>
              );
            }
            const isPicked = picked === s;
            const isNext = next === s && !isPicked;
            const isLast = last === s && !isPicked;
            return (
              <G key={s}>
                {isPicked ? (
                  <>
                    <Circle cx={x} cy={y} r={10} fill={theme.ink} />
                    <Path d={`M${x - 4.5} ${y + 0.5} l3 3 l6 -6.5`} stroke={theme.bg} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                ) : (
                  <Circle cx={x} cy={y} r={8} fill={theme.surface} stroke={theme.inkFaint} strokeWidth={1} strokeDasharray="2 2" />
                )}
                {isLast && <Circle cx={x} cy={y} r={4.2} fill={theme.ink} />}
                {isNext && <Ellipse cx={x} cy={y} rx={11.5} ry={11.5} fill="none" stroke={theme.live} strokeWidth={2.6} />}
              </G>
            );
          })}
        </Svg>
        {SITES.map((s) => {
          const { x, y } = SITE_SPOTS[s];
          const use = uses?.[s];
          const state = [
            picked === s ? 'picked' : null,
            last === s ? 'last used' : null,
            next === s ? 'next in your rotation' : null,
            use ? `${use.count} of the recent shots${use.lastLabel ? `, last ${use.lastLabel}` : ''}` : null,
          ]
            .filter(Boolean)
            .join(', ');
          const label = `${siteLabel(s)}${state ? `, ${state}` : ''}`;
          if (!onPick) {
            return <View key={s} accessible accessibilityLabel={label} style={[styles.target, { width: target, height: target, left: x * scale - target / 2, top: y * scale - target / 2 }]} />;
          }
          return (
            <Tap
              key={s}
              onPress={() => {
                tick();
                onPick(s);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: picked === s }}
              accessibilityLabel={label}
              style={[styles.target, { width: target, height: target, left: x * scale - target / 2, top: y * scale - target / 2 }]}
              pressedStyle={{ backgroundColor: theme.well, opacity: 0.5 }}
            >
              <View />
            </Tap>
          );
        })}
      </View>
      {caption && (
        <Text style={[type.small, styles.caption, { color: theme.inkFaint }]} maxFontSizeMultiplier={1.6}>
          Left and right are your own.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  target: { position: 'absolute', borderRadius: 999 },
  caption: { textAlign: 'center', marginTop: space.xs },
});
