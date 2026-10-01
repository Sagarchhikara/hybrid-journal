import { Screen, Text } from '@/components';
import { useTheme } from '@/theme';

export default function StatsScreen() {
  const { spacing } = useTheme();

  return (
    <Screen>
      <Text variant="display">Stats</Text>
      <Text color="muted" style={{ marginTop: spacing.sm }}>
        Your activity heatmap and weekly rollups will live here.
      </Text>
    </Screen>
  );
}
