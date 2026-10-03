import {
  borderWidths,
  card,
  icons,
  palette,
  radii,
  shadows,
  sizes,
  spacing,
  typography,
  type Palette,
} from './tokens';

export interface Theme {
  colors: Palette;
  spacing: typeof spacing;
  radii: typeof radii;
  sizes: typeof sizes;
  icons: typeof icons;
  borderWidths: typeof borderWidths;
  typography: typeof typography;
  card: typeof card;
  shadows: typeof shadows;
}

/**
 * The theme is a constant: the app is dark only, so there is nothing to subscribe to and
 * nothing to recompute. It stays a hook so that call sites read the same as they always
 * have, and so a future preference (a true-black mode, say) can be added here without
 * touching every screen.
 */
const theme: Theme = {
  colors: palette,
  spacing,
  radii,
  sizes,
  icons,
  borderWidths,
  typography,
  card,
  shadows,
};

export function useTheme(): Theme {
  return theme;
}
