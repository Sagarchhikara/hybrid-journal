import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useTheme, type ActivityType } from '@/theme';

export interface CardProps {
  children: ReactNode;
  /** Draws a left edge in that activity's colour. */
  accent?: ActivityType;
  style?: ViewStyle;
}

export function Card({ children, accent, style }: CardProps) {
  const { colors, spacing, card, borderWidths } = useTheme();

  return (
    <View
      style={[
        card,
        { gap: spacing.sm },
        accent && { borderLeftColor: colors[accent], borderLeftWidth: borderWidths.accent },
        style,
      ]}>
      {children}
    </View>
  );
}
