import { Stack, useLocalSearchParams } from 'expo-router';

import { RunForm } from '@/features/runs';

/**
 * One route for both logging and editing: /log/run creates, /log/run?runId=3 edits.
 * Same form, same modal, no duplicate screen.
 */
export default function LogRunScreen() {
  const { runId } = useLocalSearchParams<{ runId?: string }>();
  const parsed = runId === undefined ? undefined : Number(runId);
  const editing = parsed !== undefined && Number.isInteger(parsed);

  return (
    <>
      <Stack.Screen options={{ title: editing ? 'Edit run' : 'Log a run' }} />
      <RunForm runId={editing ? parsed : undefined} />
    </>
  );
}
