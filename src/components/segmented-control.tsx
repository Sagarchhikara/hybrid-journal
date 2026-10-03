import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { Text } from './text';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** One tap per option, all visible at once — no picker modal between you and saving. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors, radii, spacing, sizes, borderWidths } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: borderWidths.hairline,
        borderRadius: radii.md,
        padding: spacing.xxs,
        gap: spacing.xxs,
      }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: sizes.tapTarget,
              paddingHorizontal: spacing.xs,
              borderRadius: radii.sm,
              backgroundColor: selected ? colors.accent : 'transparent',
              opacity: pressed && !selected ? 0.6 : 1,
            })}>
            <Text variant="label" color={selected ? 'accentText' : 'muted'} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
