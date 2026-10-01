import { Stack, useLocalSearchParams } from 'expo-router';

import { SleepForm } from '@/features/sleep';
import { isDateKey } from '@/lib/dates';

/** /log/sleep logs last night; /log/sleep?date=2026-09-28 edits that wake-up date. */
export default function LogSleepScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const valid = date !== undefined && isDateKey(date);

  return (
    <>
      <Stack.Screen options={{ title: valid ? 'Edit sleep' : 'Log sleep' }} />
      <SleepForm date={valid ? date : undefined} />
    </>
  );
}
