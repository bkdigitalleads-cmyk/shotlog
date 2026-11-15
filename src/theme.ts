import { useColorScheme } from 'react-native';

/**
 * "A calm clinic notebook." Warm paper by default, ink that is nearly
 * black with a little blue in it, ruled hairlines, and one confident
 * fountain-pen blue that means one thing only: the live action on a screen
 * (Log shot, Save, Continue, the next site on the map). Everything else is
 * paper and ink. Dark mode follows the phone: the same notebook at night,
 * a deep slate page with chalk-coloured ink and a lighter blue.
 *
 * Tokens only: screens never use a colour, size, gap or corner that is not
 * in here.
 */
export interface Theme {
  /** The page: the screen background. */
  bg: string;
  /** Leaves: cards, grouped rows, trays. */
  surface: string;
  /** One step down from the page: wells, unpicked tags, pressed rows, inputs. */
  well: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  /** Ruled hairlines between rows. */
  rule: string;
  /** The 1 px edge around leaves. */
  edge: string;
  /** The live action. Nothing else uses it. */
  live: string;
  /** Text and glyphs on the live action. */
  onLive: string;
  /** A picked tag or choice: ink outline on a well, never the accent. */
  picked: string;
  pickedEdge: string;
  /** The notebook's margin rule, a quiet warm line on the next-shot leaf and the report. Decoration only. */
  margin: string;
  /** Delete and other things that cannot be undone. */
  danger: string;
  /** Chart line and points (ink), and the shot marks under it. */
  chart: string;
  chartSoft: string;
  /** Behind trays. */
  scrim: string;
  isDark: boolean;
}

export const lightTheme: Theme = {
  bg: '#F4F1EA',
  surface: '#FBFAF6',
  well: '#EAE6DC',
  ink: '#1D232B',
  inkSoft: '#4E5661',
  inkFaint: '#7C838C',
  rule: '#E1DCD0',
  edge: 'rgba(29, 35, 43, 0.10)',
  live: '#2747C9',
  onLive: '#FFFFFF',
  picked: '#E2DED3',
  pickedEdge: '#1D232B',
  margin: '#DDA89A',
  danger: '#A8382B',
  chart: '#1D232B',
  chartSoft: '#B9B4A8',
  scrim: 'rgba(29, 35, 43, 0.38)',
  isDark: false,
};

export const darkTheme: Theme = {
  bg: '#16191D',
  surface: '#1E2227',
  well: '#272C32',
  ink: '#E9E5DC',
  inkSoft: '#B2B3B0',
  inkFaint: '#848990',
  rule: '#2F343B',
  edge: 'rgba(255, 255, 255, 0.08)',
  live: '#8EA4FF',
  onLive: '#0F1424',
  picked: '#323840',
  pickedEdge: '#E9E5DC',
  margin: '#6E4B44',
  danger: '#E39486',
  chart: '#E9E5DC',
  chartSoft: '#4B5159',
  scrim: 'rgba(5, 6, 8, 0.6)',
  isDark: true,
};

/** Light unless the phone is in dark mode. */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}

/**
 * Two corners, on purpose:
 *  - leaf 14: cards, trays and the main action
 *  - tab 8: tags, choices, inputs and plain buttons
 * (round is only for circles: glyph buttons, radio dots, the site marks.)
 */
export const radius = { leaf: 14, tab: 8, round: 999 };

/** The spacing scale. Every margin, padding and gap is one of these. */
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48 };

/**
 * Source Serif 4 (SIL OFL, assets/fonts/OFL-SourceSerif4.txt): a book
 * serif with a printed, clinical calm. SemiBold for titles, the due line
 * and every number (doses, weights, counts) with tabular figures, so
 * columns line up and values never jitter. Body text is the system font.
 * Never combine with fontWeight: the weight is in the file.
 */
export const fonts = {
  serif: 'SourceSerif4-SemiBold',
  serifRegular: 'SourceSerif4-Regular',
};

/**
 * One type scale, four steps:
 *  - display 30: screen titles, the due line, the big numbers (serif)
 *  - title 20: leaf headings, tray titles, the main action (serif)
 *  - body 17: everything you read (system), and plain buttons
 *  - small 13: secondary lines, eyebrows, the tab rail (system)
 */
export const type = {
  display: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 36 },
  title: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 26 },
  body: { fontSize: 17, lineHeight: 24 },
  small: { fontSize: 13, lineHeight: 18 },
};

/** Spread into a Text style for doses, weights and counts. */
export const tabular = { fontVariant: ['tabular-nums' as const] };

/** The eyebrow above a group: small, spaced capitals, like a printed form. */
export const eyebrow = { ...type.small, letterSpacing: 1.1, textTransform: 'uppercase' as const, fontWeight: '600' as const };

/** The main action is at least this tall. */
export const MAIN_ACTION = 64;

/** Font files for useFonts in App.tsx. */
export const FONT_FILES = {
  [fonts.serif]: require('../assets/fonts/SourceSerif4_600SemiBold.ttf'),
  [fonts.serifRegular]: require('../assets/fonts/SourceSerif4_400Regular.ttf'),
};

/** The app icon's own colours (store/icon-pen.svg), for the few places the app draws its icon. Not UI tokens. */
export const ICON_COLORS = { tile: '#2747C9', cap: '#F2714F', body: '#FFFFFF', bodyShade: '#DCE2EE', window: '#1F2840', level: '#FFC2A8' };
