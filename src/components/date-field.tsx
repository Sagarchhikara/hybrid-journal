import { Pressable, View } from 'react-native';

import { formatDateKeyShort, shiftDateKey, todayLocal, type DateKey } from '@/lib/dates';
import { useTheme } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

export interface DateFieldProps {
  value: DateKey;
  onChange: (date: DateKey) => void;
  /** Future dates are refused — you cannot have trained tomorrow. */
  maxDate?: DateKey;
}

/**
 * A day stepper rather than a calendar. Logging is overwhelmingly "today" or
 * "yesterday", and no date picker ships inside Expo Go, so two arrows plus a Today
 * reset beats pulling in a native dependency for Phase 1.
 */
export function DateField({ value, onChange, maxDate = todayLocal() }: DateFieldProps) {
  const { colors, radii, spacing } = useTheme();

  const today = todayLocal();
  const canGoForward = value < maxDate;
  const label =
    value === today
      ? 'Today'
      : value === shiftDateKey(today, -1)
        ? 'Yesterday'
        : formatDateKeyShort(value);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radii.md,
        minHeight: 52,
      }}>
      <Step
        direction="back"
        onPress={() => onChange(shiftDateKey(value, -1))}
        enabled
        label="Previous day"
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Date: ${label}. Tap to reset to today.`}
        onPress={() => onChange(today)}
        style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md }}>
        <Text variant="heading">{label}</Text>
        {value === today ? null : (
          <Text variant="caption" color="muted">
            {formatDateKeyShort(value)}
          </Text>
        )}
      </Pressable>

      <Step
        direction="forward"
        onPress={() => onChange(shiftDateKey(value, 1))}
        enabled={canGoForward}
        label="Next day"
      />
    </View>
  );
}

function Step({
  direction,
  onPress,
  enabled,
  label,
}: {
  direction: 'back' | 'forward';
  onPress: () => void;
  enabled: boolean;
  label: string;
}) {
  const { spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      hitSlop={spacing.sm}
      style={({ pressed }) => ({
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        opacity: enabled ? (pressed ? 0.5 : 1) : 0.25,
        transform: [{ scaleX: direction === 'back' ? -1 : 1 }],
      })}>
      <Icon name="chevron" size={22} color="muted" />
    </Pressable>
  );
}
