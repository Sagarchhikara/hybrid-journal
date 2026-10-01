import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components';
import { clearAllData, seedDevData, useLogCounts } from '@/db';
import { UnitsSection } from '@/features/settings';
import { useTheme } from '@/theme';

export default function YouScreen() {
  const { spacing } = useTheme();

  return (
    <Screen scroll>
      <Text variant="display" style={{ marginBottom: spacing.xl }}>
        You
      </Text>

      <UnitsSection />

      <Text color="muted" style={{ marginTop: spacing.xxl }}>
        Reminders and data export will live here.
      </Text>

      {__DEV__ ? <DevTools /> : null}
    </Screen>
  );
}

/**
 * Dev-only fixtures. Gated on __DEV__ at the call site above so the whole subtree is
 * dropped from release bundles.
 */
function DevTools() {
  const { spacing } = useTheme();
  const counts = useLogCounts();
  const [busy, setBusy] = useState<'seed' | 'clear' | null>(null);

  async function run(action: 'seed' | 'clear'): Promise<void> {
    setBusy(action);
    try {
      if (action === 'seed') {
        const result = await seedDevData();
        Alert.alert(
          'Seeded',
          `${result.workouts} workouts, ${result.runs} runs, ${result.sleepEntries} sleep entries, ${result.dailyMetrics} daily metrics.`,
        );
      } else {
        await clearAllData();
        Alert.alert('Cleared', 'All logged data removed. Exercise library restored.');
      }
    } catch (cause) {
      Alert.alert('Failed', cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ marginTop: spacing.xxl, gap: spacing.md }}>
      <Text variant="heading">Developer</Text>

      <Card>
        <Text color="muted">
          {counts.workouts} workouts · {counts.runs} runs · {counts.sleepEntries} sleep ·{' '}
          {counts.exercises} exercises
        </Text>
      </Card>

      <Button
        label="Seed 3 weeks of sample data"
        onPress={() => void run('seed')}
        loading={busy === 'seed'}
        disabled={busy !== null}
      />
      <Button
        label="Clear all data"
        variant="danger"
        onPress={() =>
          Alert.alert('Clear all data?', 'This removes every logged workout, run and night.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: () => void run('clear') },
          ])
        }
        loading={busy === 'clear'}
        disabled={busy !== null}
      />
    </View>
  );
}
