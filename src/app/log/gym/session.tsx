import { Stack, useLocalSearchParams } from 'expo-router';

import { SessionScreen } from '@/features/gym/session-screen';

/**
 * /log/gym/session logs the stored draft; /log/gym/session?workoutId=3 edits a finished
 * workout in the same editor.
 */
export default function GymSessionScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const parsed = workoutId === undefined ? undefined : Number(workoutId);
  const editing = parsed !== undefined && Number.isInteger(parsed);

  return (
    <>
      <Stack.Screen options={{ title: editing ? 'Edit workout' : 'Logging' }} />
      <SessionScreen workoutId={editing ? parsed : undefined} />
    </>
  );
}
