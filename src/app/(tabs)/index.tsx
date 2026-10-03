import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { ResumeBanner, WeekCard } from '@/features/home';
import { formatDateKeyLong, todayLocal } from '@/lib/dates';
import { useTheme } from '@/theme';

export default function HomeScreen() {
  const { spacing } = useTheme();
  const router = useRouter();

  return (
    <Screen scroll>
      <View style={{ gap: spacing.xxs, marginBottom: spacing.xl }}>
        <Text variant="label" color="muted">
          {formatDateKeyLong(todayLocal()).toUpperCase()}
        </Text>
        <Text variant="display">Today</Text>
      </View>

      <ResumeBanner />

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
