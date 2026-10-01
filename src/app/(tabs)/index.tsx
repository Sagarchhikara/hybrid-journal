import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { WeekCard } from '@/features/home';
import { formatDateKeyLong, todayLocal } from '@/lib/dates';
import { useTheme } from '@/theme';

export default function HomeScreen() {
  const { spacing } = useTheme();
  const router = useRouter();

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xs, marginBottom: spacing.xl }}>
        <Text variant="display">Today</Text>
        <Text color="muted">{formatDateKeyLong(todayLocal())}</Text>
      </View>

      <WeekCard />

      <Button
        label="Log something"
        variant="secondary"
        onPress={() => router.push('/log')}
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}
