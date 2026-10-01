import { Stack, useLocalSearchParams } from 'expo-router';

import { WeightForm } from '@/features/metrics';
import { isDateKey } from '@/lib/dates';

export default function LogWeightScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const valid = date !== undefined && isDateKey(date);

  return (
    <>
      <Stack.Screen options={{ title: valid ? 'Edit weight' : 'Log weight' }} />
      <WeightForm date={valid ? date : undefined} />
    </>
  );
}
