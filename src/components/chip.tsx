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

/**
 * Selection is carried by three things at once: the fill, the border, and the label's
 * weight. Colour alone would leave the selected filter invisible to anyone who cannot
 * separate lime from grey, and these rows are how the library and history get narrowed.
 */
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
      <Text variant={selected ? 'labelStrong' : 'label'} color={selected ? 'accentText' : 'muted'}>
        {label}
      </Text>
    </Pressable>
  );
}
