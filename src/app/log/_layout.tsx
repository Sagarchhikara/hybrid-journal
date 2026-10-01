import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { Text } from '@/components';
import { useTheme } from '@/theme';

/** Presented as a modal by the root stack; screens push on top of each other inside it. */
export default function LogLayout() {
  const { colors, typography } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { ...typography.heading, color: colors.text },
        headerTintColor: colors.accent,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      {/* The modal's root screen has no back button, so it needs an explicit way out. */}
      <Stack.Screen name="index" options={{ title: 'Log', headerLeft: () => <CloseButton /> }} />
      <Stack.Screen name="gym" options={{ title: 'Gym' }} />
      <Stack.Screen name="run" options={{ title: 'Log a run' }} />
      <Stack.Screen name="sleep" options={{ title: 'Sleep' }} />
      <Stack.Screen name="steps" options={{ title: 'Steps' }} />
      <Stack.Screen name="weight" options={{ title: 'Weight' }} />
    </Stack>
  );
}

function CloseButton() {
  const router = useRouter();
  const { spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close"
      onPress={() => router.back()}
      hitSlop={spacing.md}>
      <Text color="accent">Close</Text>
    </Pressable>
  );
}
