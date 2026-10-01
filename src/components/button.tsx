import { ActivityIndicator, Pressable, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const { colors, radii, spacing } = useTheme();
  const isInert = disabled || loading;

  const background =
    variant === 'primary' ? colors.accent : variant === 'danger' ? colors.danger : colors.surface;
  const labelColor = variant === 'secondary' ? 'text' : 'accentText';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInert, busy: loading }}
      disabled={isInert}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: background,
          borderRadius: radii.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 48,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: colors.border,
          opacity: isInert ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={colors[labelColor]} />
      ) : (
        <Text variant="heading" color={labelColor}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
