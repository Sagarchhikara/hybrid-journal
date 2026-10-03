import { useRouter, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Icon, Screen, Text, type IconName } from '@/components';
import { useTheme, type ColorToken } from '@/theme';

const OPTIONS: { route: Href; label: string; hint: string; icon: IconName; color: ColorToken }[] = [
  { route: '/log/gym', label: 'Gym', hint: 'Exercises, sets and reps', icon: 'gym', color: 'gym' },
  { route: '/log/run', label: 'Run', hint: 'Distance and time', icon: 'run', color: 'run' },
  { route: '/log/sleep', label: 'Sleep', hint: 'Hours slept', icon: 'sleep', color: 'sleep' },
  { route: '/log/steps', label: 'Steps', hint: 'Daily step count', icon: 'steps', color: 'muted' },
  { route: '/log/weight', label: 'Weight', hint: 'Bodyweight', icon: 'weight', color: 'muted' },
];

export default function LogPickerScreen() {
  const { spacing } = useTheme();

  return (
    <Screen scroll edgeToEdgeTop={false}>
      <Text color="muted" style={{ marginBottom: spacing.lg }}>
        What do you want to log?
      </Text>
      <View style={{ gap: spacing.sm }}>
        {OPTIONS.map((option) => (
          <LogOption key={option.label} {...option} />
        ))}
      </View>
    </Screen>
  );
}

function LogOption({ route, label, hint, icon, color }: (typeof OPTIONS)[number]) {
  const { colors, radii, spacing, sizes, icons, borderWidths } = useTheme();
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Log ${label}`}
      onPress={() => router.push(route)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
        borderColor: colors.border,
        borderWidth: borderWidths.hairline,
        borderRadius: radii.lg,
        padding: spacing.lg,
        minHeight: sizes.rowTall,
      })}>
      <Icon name={icon} size={icons.xl} color={color} />
      <View style={{ flex: 1 }}>
        <Text variant="heading">{label}</Text>
        <Text variant="caption" color="muted">
          {hint}
        </Text>
      </View>
      <Icon name="chevron" size={icons.sm} color="muted" />
    </Pressable>
  );
}
