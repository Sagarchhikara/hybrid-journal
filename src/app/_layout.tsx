import { DarkTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Screen, Text } from '@/components';
import { useDatabase, useDataFreshness } from '@/db';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors } = useTheme();
  const { ready, error } = useDatabase();

  // Refetch on foreground and when the local date rolls over, so "this week" and
  // "today" never go stale while the app sits open overnight.
  useDataFreshness();

  useEffect(() => {
    // Hold the splash until migrations finish, so no screen queries an empty db.
    if (ready || error) SplashScreen.hideAsync();
  }, [ready, error]);

  // The app is dark only, so the navigator always gets the dark base theme with our
  // own colours layered over it. This is what paints the gap between screens during a
  // push, which is why it has to agree with the Screen background exactly.
  const navigationTheme: Theme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.accent,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      {/* Light glyphs on our near-black bar. The Android navigation bar follows
          `userInterfaceStyle: "dark"` in app.json, which expo-system-ui applies. */}
      <StatusBar style="light" />
      {error ? <DatabaseError error={error} /> : ready ? <RootStack /> : <Booting />}
    </ThemeProvider>
  );
}

function RootStack() {
  const { colors, typography } = useTheme();

  const pushedScreen = {
    headerShown: true,
    headerStyle: { backgroundColor: colors.background },
    headerTitleStyle: { ...typography.heading, color: colors.text },
    headerTintColor: colors.accent,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
  } as const;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="log" options={{ presentation: 'modal' }} />
      {/* Pushed from a tab, so these need the back button a header gives them. */}
      <Stack.Screen name="library" options={{ ...pushedScreen, title: 'Exercise library' }} />
      <Stack.Screen name="workout/[id]" options={{ ...pushedScreen, title: 'Workout' }} />
    </Stack>
  );
}

function Booting() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

function DatabaseError({ error }: { error: Error }) {
  return (
    <Screen>
      <Text variant="title">Could not open your journal</Text>
      <Text color="muted">{error.message}</Text>
    </Screen>
  );
}
