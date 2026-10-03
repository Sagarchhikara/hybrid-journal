import { Platform } from 'react-native';

/**
 * The app is dark only.
 *
 * Every surface is a step up from near-black, and the whole palette is tuned against
 * that assumption: the lime accent and the activity colours are chosen for their
 * contrast on a dark ground and would be unreadable on white. A light palette would be
 * a separate design rather than a recolour, so rather than ship a half-considered one,
 * `userInterfaceStyle` is pinned to `dark` in app.json and the system chrome is told to
 * match. See `useTheme`.
 */
export interface Palette {
  /** The window behind everything. Near-black, not pure black: pure black bloats on OLED. */
  background: string;
  /** Cards and inputs sit one step up from the background. */
  surface: string;
  /** A card on a card, a pressed row, a stepper button. */
  surfaceRaised: string;
  /** Card and input outlines. Deliberately low contrast — it shapes, it does not shout. */
  border: string;
  /** Hairlines inside a surface, quieter than `border`. */
  divider: string;

  /** Headings and anything you read word by word. */
  text: string;
  /** Supporting copy that still has to be legible. */
  textSecondary: string;
  /** Labels, captions, units. The quietest text that still clears 4.5:1 on every surface. */
  muted: string;

  /** The lime. Primary actions, the active tab, the thing you are meant to tap. */
  accent: string;
  /** Text and icons drawn on top of an `accent` fill. */
  accentText: string;
  /** A lime wash for selected states that must not be a solid lime block. */
  accentSurface: string;

  /** The purple. A second series in a chart, a secondary emphasis — never an action. */
  secondary: string;
  secondaryText: string;

  /** Destructive text, invalid input, error copy. */
  danger: string;
  /** Fill behind `danger` text on a destructive button. */
  dangerSurface: string;
  /** Confirmation and "you did the thing" states. */
  success: string;

  /** Cast by the floating Log button. Pure black: a shadow is an absence of light. */
  shadow: string;

  /** One accent per activity type, so an activity reads the same colour everywhere. */
  gym: string;
  run: string;
  sleep: string;
}

/**
 * Activity accents.
 *
 * Gym deliberately shares the lime: it is the activity this app is built around and the
 * one the accent was picked for. Run and sleep take the mint and the purple so the three
 * stay separable, including for the most common colour-vision deficiencies — they differ
 * in lightness as well as hue, and every place they appear also carries an icon.
 */
const activity = {
  gym: '#C6F432',
  run: '#3DE0C4',
  sleep: '#A78BFA',
} as const;

/**
 * Contrast ratios against the three surface levels, all AA or better for body text:
 * text 17.9/16.5/14.9, textSecondary 9.6/8.8/8.0, muted 5.9/5.5/4.9, danger 7.1/6.5/5.9.
 * accentText on accent is 15.4; danger on dangerSurface is 6.2.
 */
export const palette: Palette = {
  background: '#0A0B0D',
  surface: '#141619',
  surfaceRaised: '#1D2024',
  border: '#282C32',
  divider: '#1E2226',

  text: '#F2F5F7',
  textSecondary: '#AEB6C0',
  muted: '#858E9A',

  accent: '#C6F432',
  accentText: '#0A0B0D',
  accentSurface: '#1E2A0E',

  secondary: '#A78BFA',
  secondaryText: '#0A0B0D',

  danger: '#FF6B6B',
  dangerSurface: '#2B1618',
  success: '#3DD68C',

  shadow: '#000000',

  ...activity,
};

export type ColorToken = keyof Palette;
export type ActivityType = keyof typeof activity;

export const ACTIVITY_TYPES = Object.keys(activity) as ActivityType[];

/** 4pt scale. `xxs` exists because a label stacked under a number wants 2, not 4. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;
export type Spacing = keyof typeof spacing;

/** Cards are noticeably rounded; `sm` is for the small controls inside them. */
export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;
export type Radius = keyof typeof radii;

/**
 * Control geometry. These are tap targets before they are sizes, so they are named for
 * what they are tapped as — nothing here should be nudged to make a layout fit.
 */
export const sizes = {
  /** The floor for anything tapped with a thumb. Never go under this. */
  tapTarget: 44,
  /** Buttons. */
  control: 48,
  /** Text and number inputs. */
  field: 52,
  /** A chip in a filter row. */
  chip: 40,
  /** A row in a list. */
  row: 60,
  /** A row with an icon and two lines of text. */
  rowTall: 68,
  /** An icon-only button inside a card header. */
  iconButton: 40,
  /** The tab bar, before the bottom safe-area inset is added. */
  tabBar: 60,
} as const;
export type Size = keyof typeof sizes;

export const icons = {
  xs: 16,
  sm: 18,
  md: 20,
  lg: 22,
  xl: 26,
  /** The large glyph in an empty state. */
  empty: 40,
} as const;
export type IconSize = keyof typeof icons;

export const borderWidths = {
  hairline: 1,
  /** The activity-coloured left edge on a card or row. */
  accent: 3,
} as const;

const sans = Platform.select({ ios: 'system-ui', default: undefined });
const mono = Platform.select({ ios: 'ui-monospace', default: 'monospace' });

/**
 * `stat` and `statLarge` are the big numbers on a summary card. They are tracked tight
 * and set in a heavier weight than `display`, because a number read at a glance wants
 * to be one shape rather than a row of digits.
 */
export const typography = {
  display: {
    fontFamily: sans,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  statLarge: {
    fontFamily: sans,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '700',
    letterSpacing: -1,
  },
  stat: { fontFamily: sans, fontSize: 28, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontFamily: sans, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontFamily: sans, fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontFamily: sans, fontSize: 15, lineHeight: 21, fontWeight: '400' },
  label: { fontFamily: sans, fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: 0.4 },
  /** Same metrics as `label`, heavier. For a selected state that must not resize. */
  labelStrong: {
    fontFamily: sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  caption: { fontFamily: sans, fontSize: 12, lineHeight: 16, fontWeight: '400' },
  mono: { fontFamily: mono, fontSize: 14, lineHeight: 20, fontWeight: '400' },
} as const;
export type TypographyVariant = keyof typeof typography;

/**
 * The one card. Every card-shaped thing in the app composes this rather than restating
 * a background, a radius and a border — so changing what a card looks like is one edit.
 */
export const card = {
  backgroundColor: palette.surface,
  borderColor: palette.border,
  borderWidth: borderWidths.hairline,
  borderRadius: radii.lg,
  padding: spacing.lg,
} as const;

/**
 * The one lift. Only the floating Log button uses it: on a near-black ground a drop
 * shadow is almost invisible, so this is less about depth than about keeping the button
 * from sitting flat on whatever scrolls underneath it.
 */
export const shadows = {
  floating: Platform.select({
    ios: {
      shadowColor: palette.shadow,
      shadowOpacity: 0.5,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;
