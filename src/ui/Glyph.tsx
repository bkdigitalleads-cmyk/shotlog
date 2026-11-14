import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

/**
 * Shot Log's own glyphs, drawn on a 24 grid with a 1.6 stroke and round
 * ends: the pen (a capped injector pen seen whole, never a needle), the
 * vial, the ring (what comes next), the ruled page, the chart, the folded
 * report, the scale, the pulse (how I feel), the drop and the bowl
 * (water and protein), the figure, and the small ones. No icon pack.
 */
export type GlyphName =
  | 'pen'
  | 'vial'
  | 'ring'
  | 'page'
  | 'chart'
  | 'report'
  | 'sliders'
  | 'scale'
  | 'pulse'
  | 'drop'
  | 'bowl'
  | 'figure'
  | 'calendar'
  | 'bell'
  | 'clock'
  | 'plus'
  | 'minus'
  | 'close'
  | 'check'
  | 'back'
  | 'chevron'
  | 'share'
  | 'print'
  | 'pencil'
  | 'trash'
  | 'table'
  | 'mail'
  | 'shield';

export default function Glyph({ name, size = 24, color, weight = 1.6 }: { name: GlyphName; size?: number; color: string; weight?: number }) {
  const p = { stroke: color, strokeWidth: weight, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  let body: React.ReactNode;
  switch (name) {
    case 'pen':
      body = (
        <>
          <Rect x={9} y={2.5} width={6} height={15} rx={2} {...p} />
          <Line x1={9} y1={7} x2={15} y2={7} {...p} />
          <Line x1={12} y1={10} x2={12} y2={14} {...p} />
          <Path d="M10.5 17.5v2a1.5 1.5 0 0 0 3 0v-2" {...p} />
        </>
      );
      break;
    case 'vial':
      body = (
        <>
          <Rect x={8} y={2.5} width={8} height={3.5} rx={1} {...p} />
          <Path d="M8.5 6h7v13a2.5 2.5 0 0 1-2.5 2.5h-2A2.5 2.5 0 0 1 8.5 19z" {...p} />
          <Line x1={8.5} y1={12} x2={15.5} y2={12} {...p} />
        </>
      );
      break;
    case 'ring':
      body = (
        <>
          <Circle cx={12} cy={12} r={8.5} {...p} />
          <Circle cx={12} cy={12} r={2.6} fill={color} stroke="none" />
        </>
      );
      break;
    case 'page':
      body = (
        <>
          <Rect x={4.5} y={3} width={15} height={18} rx={2} {...p} />
          <Line x1={8} y1={8} x2={16} y2={8} {...p} />
          <Line x1={8} y1={12} x2={16} y2={12} {...p} />
          <Line x1={8} y1={16} x2={13} y2={16} {...p} />
        </>
      );
      break;
    case 'chart':
      body = (
        <>
          <Path d="M3.5 16.5l5-5 4 3 7.5-8" {...p} />
          <Line x1={3.5} y1={20.5} x2={20.5} y2={20.5} {...p} />
          <Line x1={8.5} y1={18.5} x2={8.5} y2={20.5} {...p} />
          <Line x1={15.5} y1={18.5} x2={15.5} y2={20.5} {...p} />
        </>
      );
      break;
    case 'report':
      body = (
        <>
          <Path d="M5.5 3h9l4 4v14h-13z" {...p} />
          <Path d="M14.5 3v4h4" {...p} />
          <Line x1={8.5} y1={12} x2={15.5} y2={12} {...p} />
          <Line x1={8.5} y1={16} x2={13.5} y2={16} {...p} />
        </>
      );
      break;
    case 'sliders':
      body = (
        <>
          <Line x1={4} y1={8} x2={20} y2={8} {...p} />
          <Line x1={4} y1={16} x2={20} y2={16} {...p} />
          <Circle cx={9} cy={8} r={2.3} fill={color} stroke="none" />
          <Circle cx={15} cy={16} r={2.3} fill={color} stroke="none" />
        </>
      );
      break;
    case 'scale':
      body = (
        <>
          <Rect x={3.5} y={4} width={17} height={16} rx={3} {...p} />
          <Path d="M8 10a4 4 0 0 1 8 0" {...p} />
          <Line x1={12} y1={10} x2={13.6} y2={7.8} {...p} />
        </>
      );
      break;
    case 'pulse':
      body = <Path d="M3 12.5h4l2-5 3.5 10 2.5-7 1.5 2H21" {...p} />;
      break;
    case 'drop':
      body = <Path d="M12 3.5c3 4 6 7.2 6 10.5a6 6 0 0 1-12 0c0-3.3 3-6.5 6-10.5z" {...p} />;
      break;
    case 'bowl':
      body = (
        <>
          <Path d="M3.5 11h17a8.5 8.5 0 0 1-17 0z" {...p} />
          <Path d="M9 7.5c0-1.5 1.5-1.5 1.5-3M13.5 7.5c0-1.5 1.5-1.5 1.5-3" {...p} />
        </>
      );
      break;
    case 'figure':
      body = (
        <>
          <Circle cx={12} cy={4.8} r={2.3} {...p} />
          <Path d="M8 9.5h8l-1 6h-2l-.5 5.5h-1L11 15.5H9z" {...p} />
        </>
      );
      break;
    case 'calendar':
      body = (
        <>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={2.5} {...p} />
          <Line x1={3.5} y1={10} x2={20.5} y2={10} {...p} />
          <Line x1={8} y1={3} x2={8} y2={6.5} {...p} />
          <Line x1={16} y1={3} x2={16} y2={6.5} {...p} />
        </>
      );
      break;
    case 'bell':
      body = (
        <>
          <Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" {...p} />
          <Path d="M10 20.5a2 2 0 0 0 4 0" {...p} />
        </>
      );
      break;
    case 'clock':
      body = (
        <>
          <Circle cx={12} cy={12} r={8.5} {...p} />
          <Path d="M12 7.5V12l3 2" {...p} />
        </>
      );
      break;
    case 'plus':
      body = (
        <>
          <Line x1={12} y1={5} x2={12} y2={19} {...p} />
          <Line x1={5} y1={12} x2={19} y2={12} {...p} />
        </>
      );
      break;
    case 'minus':
      body = <Line x1={5} y1={12} x2={19} y2={12} {...p} />;
      break;
    case 'close':
      body = (
        <>
          <Line x1={6} y1={6} x2={18} y2={18} {...p} />
          <Line x1={18} y1={6} x2={6} y2={18} {...p} />
        </>
      );
      break;
    case 'check':
      body = <Path d="M5 12.5l4.5 4.5L19 7.5" {...p} />;
      break;
    case 'back':
      body = <Path d="M15 5l-7 7 7 7" {...p} />;
      break;
    case 'chevron':
      body = <Path d="M9.5 6l6 6-6 6" {...p} />;
      break;
    case 'share':
      body = (
        <>
          <Path d="M8 9H6.5A1.5 1.5 0 0 0 5 10.5v8A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 9H16" {...p} />
          <Path d="M12 14V3.5M8.5 7L12 3.5 15.5 7" {...p} />
        </>
      );
      break;
    case 'print':
      body = (
        <>
          <Path d="M7 9V3.5h10V9" {...p} />
          <Rect x={3.5} y={9} width={17} height={8} rx={2} {...p} />
          <Rect x={7} y={14} width={10} height={6.5} {...p} />
        </>
      );
      break;
    case 'pencil':
      body = <Path d="M4 20l1-4.5L15.5 5l3.5 3.5L8.5 19z M13.5 7l3.5 3.5" {...p} />;
      break;
    case 'trash':
      body = (
        <>
          <Line x1={4.5} y1={6.5} x2={19.5} y2={6.5} {...p} />
          <Path d="M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14" {...p} />
        </>
      );
      break;
    case 'table':
      body = (
        <>
          <Rect x={3.5} y={4.5} width={17} height={15} rx={2} {...p} />
          <Line x1={3.5} y1={9.5} x2={20.5} y2={9.5} {...p} />
          <Line x1={3.5} y1={14.5} x2={20.5} y2={14.5} {...p} />
          <Line x1={10} y1={4.5} x2={10} y2={19.5} {...p} />
        </>
      );
      break;
    case 'mail':
      body = (
        <>
          <Rect x={3.5} y={5.5} width={17} height={13} rx={2} {...p} />
          <Path d="M4 7l8 6 8-6" {...p} />
        </>
      );
      break;
    case 'shield':
      body = <Path d="M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6z" {...p} />;
      break;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {body}
    </Svg>
  );
}
