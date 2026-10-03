import { useLocalSearchParams } from 'expo-router';

import { Screen, Text } from '@/components';
import { WorkoutDetailScreen } from '@/features/history';

/** /workout/3 — a finished workout, read-only, reached from History. */
export default function Workout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);

  if (!Number.isInteger(workoutId)) {
    return (
      <Screen edgeToEdgeTop={false}>
        <Text variant="heading">Not a workout</Text>
      </Screen>
    );
  }

  return <WorkoutDetailScreen workoutId={workoutId} />;
}
