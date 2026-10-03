import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Screen, Text } from '@/components';
import { useDatabase, useDataFreshness } from '@/db';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { scheme, colors } = useTheme();
  const { ready, error } = useDatabase();

  // Refetch on foreground and when the local date rolls over, so "this week" and
  // "today" never go stale while the app sits open overnight.
  useDataFreshness();

  useEffect(() => {
    // Hold the splash until migrations finish, so no screen queries an empty db.
    if (ready || error) SplashScreen.hideAsync();
  }, [ready, error]);

  const navigationTheme: Theme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.accent,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {error ? <DatabaseError error={error} /> : ready ? <RootStack /> : <Booting />}
    </ThemeProvider>
  );
}

function RootStack() {
  const { colors, typography } = useTheme();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="log" options={{ presentation: 'modal' }} />
      {/* Pushed from You, so it needs the back button a header gives it. */}
      <Stack.Screen
        name="library"
        options={{
          headerShown: true,
          title: 'Exercise library',
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { ...typography.heading, color: colors.text },
          headerTintColor: colors.accent,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
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
