import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  /** What to do about it. An empty state without a next step is a dead end. */
  body?: string;
  /** Usually one button. */
  action?: ReactNode;
  /** Fills the space it is given and centres vertically. For a whole-screen empty list. */
  fill?: boolean;
  style?: ViewStyle;
}

export function EmptyState({ icon, title, body, action, fill = false, style }: EmptyStateProps) {
  const { spacing, icons } = useTheme();

  return (
    <View
      style={[
        {
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.xxl,
          paddingHorizontal: spacing.xl,
        },
        fill && { flex: 1, justifyContent: 'center' },
        style,
      ]}>
      <Icon name={icon} size={icons.empty} color="muted" />
      <Text variant="title" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {body ? (
        <Text color="textSecondary" style={{ textAlign: 'center' }}>
          {body}
        </Text>
      ) : null}
      {action ? (
        <View style={{ alignSelf: 'stretch', marginTop: spacing.sm }}>{action}</View>
      ) : null}
    </View>
  );
}
