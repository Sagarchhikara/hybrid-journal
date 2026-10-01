import { Stack, useLocalSearchParams } from 'expo-router';

import { StepsForm } from '@/features/metrics';
import { isDateKey } from '@/lib/dates';

export default function LogStepsScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const valid = date !== undefined && isDateKey(date);

  return (
    <>
      <Stack.Screen options={{ title: valid ? 'Edit steps' : 'Log steps' }} />
      <StepsForm date={valid ? date : undefined} />
    </>
  );
}
