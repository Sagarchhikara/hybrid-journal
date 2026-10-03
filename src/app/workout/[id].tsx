import { useLocalSearchParams } from 'expo-router';

import { EmptyState, Screen } from '@/components';
import { WorkoutDetailScreen } from '@/features/history';

/** /workout/3 — a finished workout, read-only, reached from History. */
export default function Workout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);

  if (!Number.isInteger(workoutId)) {
    return (
      <Screen edgeToEdgeTop={false}>
        <EmptyState
          icon="history"
          title="Not a workout"
          body="That address does not point at anything we can show."
        />
      </Screen>
    );
  }

  return <WorkoutDetailScreen workoutId={workoutId} />;
}
