import { useColorScheme } from '@/hooks/use-color-scheme';

import { palettes, radii, spacing, typography, type ColorScheme, type Palette } from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
}

/** Dark-first: anything other than an explicit 'light' preference gets the dark palette. */
export function useTheme(): Theme {
  const scheme: ColorScheme = useColorScheme() === 'light' ? 'light' : 'dark';
  return { scheme, colors: palettes[scheme], spacing, radii, typography };
}
