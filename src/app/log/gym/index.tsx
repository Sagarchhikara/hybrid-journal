import { Stack } from 'expo-router';

import { GymStartScreen } from '@/features/gym/start-screen';

export default function LogGymScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Gym workout' }} />
      <GymStartScreen />
    </>
  );
}
