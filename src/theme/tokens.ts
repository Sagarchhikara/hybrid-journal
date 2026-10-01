import { Platform } from 'react-native';

export interface Palette {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  danger: string;
  /** One accent per activity type. */
  gym: string;
  run: string;
  sleep: string;
}

/** Activity accents are shared across both schemes so an activity reads the same colour everywhere. */
const activity = {
  gym: '#F0803C',
  run: '#3DBE8B',
  sleep: '#7C7CF0',
} as const;

const dark: Palette = {
  background: '#0B0B0F',
  surface: '#16161C',
  surfaceRaised: '#1F1F27',
  border: '#2A2A33',
  text: '#F4F4F6',
  muted: '#8E8E9A',
  accent: '#4C9AFF',
  accentText: '#FFFFFF',
  danger: '#F05C5C',
  ...activity,
};

const light: Palette = {
  background: '#FFFFFF',
  surface: '#F4F4F6',
  surfaceRaised: '#EAEAEE',
  border: '#DCDCE3',
  text: '#11111A',
  muted: '#61616E',
  accent: '#1B6EF3',
  accentText: '#FFFFFF',
  danger: '#D33A3A',
  ...activity,
};

export const palettes = { dark, light } as const;

export type ColorScheme = keyof typeof palettes;
export type ColorToken = keyof Palette;
export type ActivityType = keyof typeof activity;

export const ACTIVITY_TYPES = Object.keys(activity) as ActivityType[];

/** 4pt scale. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
export type Spacing = keyof typeof spacing;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;
export type Radius = keyof typeof radii;

const sans = Platform.select({ ios: 'system-ui', default: undefined });
const mono = Platform.select({ ios: 'ui-monospace', default: 'monospace' });

export const typography = {
  display: { fontFamily: sans, fontSize: 32, lineHeight: 38, fontWeight: '700' },
  title: { fontFamily: sans, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontFamily: sans, fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontFamily: sans, fontSize: 15, lineHeight: 21, fontWeight: '400' },
  label: { fontFamily: sans, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  caption: { fontFamily: sans, fontSize: 12, lineHeight: 16, fontWeight: '400' },
  mono: { fontFamily: mono, fontSize: 14, lineHeight: 20, fontWeight: '400' },
} as const;
export type TypographyVariant = keyof typeof typography;
