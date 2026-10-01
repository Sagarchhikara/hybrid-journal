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
  const { colors, radii, spacing } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radii.lg,
          padding: spacing.lg,
          gap: spacing.sm,
        },
        accent && { borderLeftColor: colors[accent], borderLeftWidth: 3 },
        style,
      ]}>
      {children}
    </View>
  );
}
