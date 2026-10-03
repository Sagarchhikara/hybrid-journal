import { Children, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useTheme, type ColorToken } from '@/theme';

import { Text } from './text';

export interface StatProps {
  /** Small caps under the number. */
  label: string;
  value: string;
  /** Colours the number. Defaults to plain text. */
  tint?: ColorToken;
  /** `large` is for a stat that is the point of the card, not one of several. */
  size?: 'medium' | 'large';
  /** Greys the number out — for a dash standing in for "nothing logged". */
  muted?: boolean;
  style?: ViewStyle;
}

/**
 * A number with its label under it.
 *
 * The number is set in the `stat` type: tight tracking, heavy weight, so it reads as one
 * shape at arm's length. The label stays small and quiet — on a summary card you are
 * looking for the figure, and the word is only there to tell you which figure it is.
 */
export function Stat({ label, value, tint = 'text', size = 'medium', muted, style }: StatProps) {
  const { spacing } = useTheme();

  return (
    <View style={[{ gap: spacing.xxs }, style]}>
      <Text
        variant={size === 'large' ? 'statLarge' : 'stat'}
        color={muted ? 'muted' : tint}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}>
        {value}
      </Text>
      <Text variant="label" color="muted" numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

export interface StatRowProps {
  children: ReactNode;
  style?: ViewStyle;
}

/** Stats side by side, each taking an equal share of the width. */
export function StatRow({ children, style }: StatRowProps) {
  const { spacing } = useTheme();

  return (
    <View style={[{ flexDirection: 'row', gap: spacing.lg }, style]}>
      {Children.map(children, (child) => (
        <View style={{ flex: 1, minWidth: 0 }}>{child}</View>
      ))}
    </View>
  );
}
