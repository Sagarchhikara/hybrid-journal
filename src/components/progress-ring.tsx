import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { useTheme, type ColorToken } from '@/theme';

import { Text } from './text';

export interface ProgressRingProps {
  /** How many of `max`. Clamped into range, so a bad number cannot draw a bad ring. */
  value: number;
  max: number;
  /** Outer diameter. */
  size?: number;
  tint?: ColorToken;
  /** Small caps under the fraction, e.g. "nights". */
  caption?: string;
  /** Spoken in place of the fraction, which reads as a date otherwise. */
  accessibilityLabel: string;
}

const STROKE_RATIO = 0.12;

/**
 * A ring is a fraction drawn, so it is only honest where there is a real denominator.
 *
 * Here that denominator is the week itself — seven nights — not a goal anyone set. The
 * app stores no targets, so nothing else on the Home card gets a ring: a ring against an
 * invented target would be a progress bar towards a number the user never chose.
 */
export function ProgressRing({
  value,
  max,
  size = 76,
  tint = 'accent',
  caption,
  accessibilityLabel,
}: ProgressRingProps) {
  const { colors, spacing } = useTheme();

  const stroke = Math.round(size * STROKE_RATIO);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const safeMax = max > 0 ? max : 1;
  const filled = Math.min(Math.max(value, 0), safeMax) / safeMax;

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Rotated so the ring starts at twelve o'clock rather than three. */}
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.surfaceRaised}
            strokeWidth={stroke}
            fill="none"
          />
          {filled > 0 ? (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors[tint]}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - filled)}
              fill="none"
            />
          ) : null}
        </G>
      </Svg>

      <View style={{ alignItems: 'center', gap: spacing.xxs }}>
        {/* The fraction is written out rather than drawn as a percentage: five of seven
            nights is a thing you can check against your week; 71% is not. */}
        <Text variant="heading" color={value > 0 ? 'text' : 'muted'}>
          {value}/{max}
        </Text>
        {caption ? (
          <Text variant="caption" color="muted">
            {caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
