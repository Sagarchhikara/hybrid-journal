import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme, type ColorToken } from '@/theme';

/**
 * Hand-rolled stroke icons on react-native-svg. Avoids pulling in an icon font for
 * the handful of glyphs the shell needs, and exercises the SVG dependency the
 * heatmap will rely on later.
 */
export type IconName =
  | 'home'
  | 'history'
  | 'stats'
  | 'you'
  | 'plus'
  | 'gym'
  | 'run'
  | 'sleep'
  | 'steps'
  | 'weight'
  | 'chevron'
  | 'chevron-up'
  | 'chevron-down'
  | 'trash'
  | 'copy'
  | 'minus'
  | 'search'
  | 'close'
  | 'check';

/** Matches the weight of the type beside it; thinner looks broken at small sizes. */
const STROKE_WIDTH = 1.8;

const PATHS: Record<IconName, string[]> = {
  home: ['M3 10.5 12 3l9 7.5', 'M5.5 9.5V20h13V9.5', 'M9.5 20v-6h5v6'],
  history: ['M3.5 7h17', 'M3.5 12h17', 'M3.5 17h11'],
  stats: ['M4 20V11', 'M10 20V5', 'M16 20v-6', 'M22 20H2'],
  you: ['M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 21c0-4.1 3.4-6.5 7.5-6.5s7.5 2.4 7.5 6.5'],
  plus: ['M12 5v14', 'M5 12h14'],
  gym: ['M4 9v6', 'M7 6v12', 'M17 6v12', 'M20 9v6', 'M7 12h10'],
  run: [
    'M13.5 4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
    'M7 22l3-6-3-3 2-6 3 3h3',
    'M12 13l4 3 1 6',
  ],
  sleep: ['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z'],
  steps: [
    'M7 3c1.7 0 2.5 1.6 2.5 4S9 12 7 12s-2.5-1.3-2.5-3S5.3 3 7 3Z',
    'M17 9c1.7 0 2.5 1.6 2.5 4S19 18 17 18s-2.5-1.3-2.5-3S15.3 9 17 9Z',
    'M4.5 14.5c0 3 .5 6 2.5 6s2.5-1.5 2.5-3',
    'M14.5 20.5c0 .8.5 1.5 2.5 1.5s2.5-1 2.5-2',
  ],
  weight: ['M12 7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z', 'M9.5 7 5 21h14L14.5 7Z', 'M12 11v4'],
  chevron: ['M9 6l6 6-6 6'],
  'chevron-up': ['M6 15l6-6 6 6'],
  'chevron-down': ['M6 9l6 6 6-6'],
  trash: ['M4 7h16', 'M10 4h4', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  copy: ['M9 9h10v10H9z', 'M15 9V5H5v10h4'],
  minus: ['M5 12h14'],
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z', 'M16.5 16.5 21 21'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  check: ['M5 13l4 4L19 7'],
};

export interface IconProps {
  name: IconName;
  /** A value from the theme's `icons` scale. Defaults to `icons.xl`. */
  size?: number;
  color?: ColorToken;
}

export function Icon({ name, size, color = 'text' }: IconProps) {
  const { colors, icons } = useTheme();
  const side = size ?? icons.xl;

  return (
    <Svg width={side} height={side} viewBox="0 0 24 24" fill="none">
      {PATHS[name].map((d) => (
        <Path
          key={d}
          d={d}
          stroke={colors[color]}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

/** A filled dot in an activity colour, for legends and list rows. */
export function ActivityDot({ color, size = 8 }: { color: ColorToken; size?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 8 8">
      <Circle cx={4} cy={4} r={4} fill={colors[color]} />
    </Svg>
  );
}
