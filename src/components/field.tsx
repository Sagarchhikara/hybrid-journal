import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './text';

export interface FieldProps {
  label: string;
  children: ReactNode;
  /** Shown in place of the hint when present. */
  error?: string;
  hint?: string;
}

/** Label above, control, then one line of hint or error. Keeps forms visually regular. */
export function Field({ label, children, error, hint }: FieldProps) {
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" color="muted">
        {label.toUpperCase()}
      </Text>
      {children}
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
