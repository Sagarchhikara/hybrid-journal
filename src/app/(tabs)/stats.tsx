import { EmptyState, Screen, Text } from '@/components';
import { useTheme } from '@/theme';

/**
 * A placeholder, deliberately. Phase 3 fills this with the heatmap and the weekly
 * rollups; restyling it now only means Phase 3 builds into the new look rather than
 * being recoloured afterwards.
 */
export default function StatsScreen() {
  const { spacing } = useTheme();

  return (
    <Screen>
      <Text variant="display" style={{ marginBottom: spacing.xl }}>
        Stats
      </Text>

      <EmptyState
        fill
        icon="stats"
        title="Nothing to chart yet"
        body="Your activity heatmap and weekly rollups will live here."
      />
    </Screen>
  );
}
