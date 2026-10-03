import { Pressable } from 'react-native';

import { useTheme, type ColorToken } from '@/theme';

import { Text } from './text';

export interface ChipProps {
  label: string;
  onPress: () => void;
  selected?: boolean;
  /** Tint used when selected. Defaults to the accent colour. */
  tint?: ColorToken;
}

export function Chip({ label, onPress, selected = false, tint = 'accent' }: ChipProps) {
  const { colors, radii, spacing, sizes, borderWidths } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: selected ? colors[tint] : colors.surface,
        borderColor: selected ? colors[tint] : colors.border,
        borderWidth: borderWidths.hairline,
        borderRadius: radii.pill,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        minHeight: sizes.chip,
        justifyContent: 'center',
        opacity: pressed ? 0.75 : 1,
      })}>
      <Text variant="label" color={selected ? 'accentText' : 'text'}>
        {label}
      </Text>
    </Pressable>
  );
}
