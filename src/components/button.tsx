import { ActivityIndicator, Pressable, type ViewStyle } from 'react-native';

import { useTheme, type ColorToken } from '@/theme';

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

/**
 * Three weights of intent, told apart by fill as well as colour.
 *
 * Primary is the only solid lime in a screen, so there is never a question about which
 * button is the one you came for. Destructive is a dark red wash with a red label rather
 * than a solid red block: a solid red button is as loud as a primary one, and "discard"
 * sitting next to "finish" at equal volume is how work gets thrown away by accident.
 */
const VARIANTS: Record<
  ButtonVariant,
  { background: ColorToken | 'transparent'; label: ColorToken; border: ColorToken | null }
> = {
  primary: { background: 'accent', label: 'accentText', border: null },
  secondary: { background: 'surfaceRaised', label: 'text', border: 'border' },
  danger: { background: 'dangerSurface', label: 'danger', border: 'danger' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const { colors, radii, spacing, sizes, borderWidths } = useTheme();
  const isInert = disabled || loading;
  const { background, label: labelColor, border } = VARIANTS[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInert, busy: loading }}
      disabled={isInert}
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor: background === 'transparent' ? 'transparent' : colors[background],
          borderRadius: radii.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: sizes.control,
          borderWidth: border === null ? 0 : borderWidths.hairline,
          borderColor: border === null ? undefined : colors[border],
          opacity: isInert ? 0.4 : pressed ? 0.75 : 1,
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
