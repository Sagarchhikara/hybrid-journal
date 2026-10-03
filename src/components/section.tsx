import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './text';

export interface SectionProps {
  /** Rendered upper-case; pass it in normal case. */
  title?: string;
  /** One line under the title, for the rule the section is obeying. */
  hint?: string;
  /** Right-aligned against the title — a count, a range, a quiet action. */
  trailing?: ReactNode;
  children: ReactNode;
  style?: ViewStyle;
}

/**
 * A titled block. The library, the picker and History each grew their own near-identical
 * version of this; they now share one so a change to how a section reads is a single edit.
 */
export function Section({ title, hint, trailing, children, style }: SectionProps) {
  const { spacing } = useTheme();

  return (
    <View style={[{ gap: spacing.sm }, style]}>
      {title || trailing ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}>
          {title ? (
            <Text variant="label" color="muted">
              {title.toUpperCase()}
            </Text>
          ) : null}
          {trailing}
        </View>
      ) : null}

      {hint ? (
        <Text variant="caption" color="muted">
          {hint}
        </Text>
      ) : null}

      {children}
    </View>
  );
}
