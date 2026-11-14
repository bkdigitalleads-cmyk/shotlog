import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Theme } from '../theme';
import { daysBetween, shortDate } from '../days';
import { fmt1, sinceShort, type WeightPoint } from '../insights';

/**
 * The weight line over a range of days, in ink, with each shot as a short
 * blue tick on the baseline and a faint guide up through the line, and the
 * person's goal as a dashed rule when it falls inside the chart. Drawn
 * with react-native-svg (already in the engine; no chart library).
 */
export function WeightChart({
  theme,
  width,
  height = 200,
  points,
  shotDays,
  from,
  to,
  goal,
  unit,
}: {
  theme: Theme;
  width: number;
  height?: number;
  points: WeightPoint[];
  shotDays: string[];
  from: string;
  to: string;
  goal: number | null;
  unit: string;
}) {
  const pad = { l: 44, r: 8, t: 12, b: 30 };
  const span = Math.max(1, daysBetween(from, to));
  const x = (day: string) => pad.l + (daysBetween(from, day) / span) * (width - pad.l - pad.r);
  const vals = points.map((p) => p.value);
  const showGoal = goal != null && vals.length > 0 && goal >= Math.min(...vals) - 6 && goal <= Math.max(...vals) + 6;
  const all = showGoal && goal != null ? [...vals, goal] : vals;
  const lo = all.length ? Math.floor(Math.min(...all) - 1) : 0;
  const hi = all.length ? Math.ceil(Math.max(...all) + 1) : 1;
  const y = (v: number) => pad.t + (1 - (v - lo) / Math.max(1, hi - lo)) * (height - pad.t - pad.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.day).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const base = height - pad.b;
  const label = `Weight from ${shortDate(from)} to ${shortDate(to)}: ${points.length} days weighed${points.length ? `, ${fmt1(points[0].value)} to ${fmt1(points[points.length - 1].value)} ${unit}` : ''}, ${shotDays.length} shots marked`;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={width} height={height}>
        {[lo, (lo + hi) / 2, hi].map((v, i) => (
          <React.Fragment key={i}>
            <Line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke={theme.rule} strokeWidth={1} />
            <SvgText x={pad.l - 6} y={y(v) + 4} fontSize={11} fill={theme.inkSoft} textAnchor="end">
              {fmt1(v)}
            </SvgText>
          </React.Fragment>
        ))}
        {shotDays.map((day, i) => (
          <React.Fragment key={`${day}-${i}`}>
            <Line x1={x(day)} x2={x(day)} y1={pad.t} y2={base} stroke={theme.live} strokeOpacity={0.14} strokeWidth={1} />
            <Line x1={x(day)} x2={x(day)} y1={base + 4} y2={base + 12} stroke={theme.live} strokeWidth={2.2} strokeLinecap="round" />
          </React.Fragment>
        ))}
        <Line x1={pad.l} x2={width - pad.r} y1={base + 8} y2={base + 8} stroke={theme.rule} strokeWidth={1} />
        {showGoal && goal != null && <Line x1={pad.l} x2={width - pad.r} y1={y(goal)} y2={y(goal)} stroke={theme.inkSoft} strokeDasharray="4 4" strokeWidth={1} />}
        {points.length > 1 && <Path d={d} stroke={theme.chart} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((p) => (
          <Circle key={p.day} cx={x(p.day)} cy={y(p.value)} r={points.length > 40 ? 1.8 : 3} fill={theme.chart} />
        ))}
        <SvgText x={pad.l} y={height - 2} fontSize={11} fill={theme.inkSoft}>
          {shortDate(from)}
        </SvgText>
        <SvgText x={width - pad.r} y={height - 2} fontSize={11} fill={theme.inkSoft} textAnchor="end">
          {shortDate(to)}
        </SvgText>
      </Svg>
    </View>
  );
}

/** Counts by days since the last shot, as plain ink bars with the count on top. */
export function SinceBars({ theme, width, height = 168, buckets }: { theme: Theme; width: number; height?: number; buckets: number[] }) {
  const pad = { l: 4, r: 4, t: 20, b: 24 };
  const n = buckets.length;
  const slot = (width - pad.l - pad.r) / n;
  const bw = Math.min(28, slot * 0.6);
  const max = Math.max(1, ...buckets);
  const base = height - pad.b;
  const label = buckets.map((c, i) => `${i === 0 ? 'Day of the shot' : `${sinceShort(i)} days after`}: ${c}`).join(', ');
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Entries by days since the last shot. ${label}`}>
      <Svg width={width} height={height}>
        <Line x1={pad.l} x2={width - pad.r} y1={base} y2={base} stroke={theme.rule} strokeWidth={1} />
        {buckets.map((c, i) => {
          const h = (c / max) * (base - pad.t);
          const cx = pad.l + slot * i + slot / 2;
          return (
            <React.Fragment key={i}>
              {c > 0 && <Rect x={cx - bw / 2} y={base - h} width={bw} height={h} rx={3} fill={theme.chart} />}
              <SvgText x={cx} y={base - h - 6} fontSize={12} fontWeight="600" fill={c > 0 ? theme.ink : theme.inkFaint} textAnchor="middle">
                {String(c)}
              </SvgText>
              <SvgText x={cx} y={height - 6} fontSize={11} fill={theme.inkSoft} textAnchor="middle">
                {sinceShort(i)}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
