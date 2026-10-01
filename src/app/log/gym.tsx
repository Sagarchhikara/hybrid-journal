import { Screen, Text } from '@/components';
import { useTheme } from '@/theme';

export default function LogGymScreen() {
  const { spacing } = useTheme();

  return (
    <Screen edgeToEdgeTop={false}>
      <Text variant="title">Log a gym workout</Text>
      <Text color="muted" style={{ marginTop: spacing.sm }}>
        Placeholder. The workout → exercises → sets form arrives in Phase 2.
      </Text>
    </Screen>
  );
}
