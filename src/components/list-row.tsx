import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { useTheme, type ColorToken } from '@/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

export interface ListRowProps {
  title: string;
  /** The second line. Kept to one line so rows stay a predictable height. */
  subtitle?: string;
  /** Leading glyph, in `tint`. */
  icon?: IconName;
  /** Colours the icon and the left edge. Omitted leaves the row untinted. */
  tint?: ColorToken;
  /** Draws the activity-coloured left edge. Off for rows that are not an activity. */
  edge?: boolean;
  /** Replaces the default chevron. */
  trailing?: ReactNode;
  /** Shown above the title in small caps — the kind of thing the row is. */
  kicker?: string;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Archived library entries, for instance, read back at lower weight. */
  dimmed?: boolean;
  style?: ViewStyle;
}

/**
 * One tappable row: optional icon, one or two lines, a chevron.
 *
 * History, the log menu, the exercise picker and the library all drew this by hand with
 * slightly different padding and heights. Sharing it is what makes the lists in those
 * four places feel like one app rather than four.
 */
export function ListRow({
  title,
  subtitle,
  icon,
  tint = 'muted',
  edge = false,
  trailing,
  kicker,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  dimmed = false,
  style,
}: ListRowProps) {
  const { colors, radii, spacing, sizes, icons, borderWidths } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${kicker ? `${kicker}. ` : ''}${title}`}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
          borderColor: colors.border,
          borderWidth: borderWidths.hairline,
          borderRadius: radii.lg,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          minHeight: subtitle ? sizes.rowTall : sizes.row,
          opacity: dimmed ? 0.6 : 1,
        },
        edge && { borderLeftColor: colors[tint], borderLeftWidth: borderWidths.accent },
        style,
      ]}>
      {icon ? <Icon name={icon} size={icons.lg} color={tint} /> : null}

      <View style={{ flex: 1, gap: spacing.xxs }}>
        {kicker ? (
          <Text variant="label" color="muted">
            {kicker.toUpperCase()}
          </Text>
        ) : null}
        <Text variant="heading" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing ?? <Icon name="chevron" size={icons.sm} color="muted" />}
    </Pressable>
  );
}
