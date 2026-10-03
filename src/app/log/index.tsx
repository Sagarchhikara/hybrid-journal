import { useRouter, type Href } from 'expo-router';
import { View } from 'react-native';

import { ListRow, Screen, Text, type IconName } from '@/components';
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
  const router = useRouter();

  return (
    <Screen scroll edgeToEdgeTop={false}>
      <Text variant="title" style={{ marginBottom: spacing.lg }}>
        What do you want to log?
      </Text>
      <View style={{ gap: spacing.sm }}>
        {OPTIONS.map((option) => (
          <ListRow
            key={option.label}
            title={option.label}
            subtitle={option.hint}
            icon={option.icon}
            tint={option.color}
            edge
            accessibilityLabel={`Log ${option.label}`}
            onPress={() => router.push(option.route)}
          />
        ))}
      </View>
    </Screen>
  );
}
