import { Tabs, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text } from '@/components';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { colors, typography, spacing, sizes, icons } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: typography.caption,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: sizes.tabBar + insets.bottom,
            paddingTop: spacing.xs,
            paddingBottom: insets.bottom,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <Icon name="home" size={icons.lg} color={focused ? 'accent' : 'muted'} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ focused }) => (
              <Icon name="history" size={icons.lg} color={focused ? 'accent' : 'muted'} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ focused }) => (
              <Icon name="stats" size={icons.lg} color={focused ? 'accent' : 'muted'} />
            ),
          }}
        />
        <Tabs.Screen
          name="you"
          options={{
            title: 'You',
            tabBarIcon: ({ focused }) => (
              <Icon name="you" size={icons.lg} color={focused ? 'accent' : 'muted'} />
            ),
          }}
        />
      </Tabs>

      <LogButton bottom={insets.bottom + sizes.tabBar + spacing.md} />
    </View>
  );
}

/**
 * Floats centred above the tab bar rather than replacing a tab slot, so all four
 * tabs keep their full hit area and no placeholder route is needed to hold a gap.
 */
function LogButton({ bottom }: { bottom: number }) {
  const { colors, radii, spacing, sizes, icons, shadows } = useTheme();
  const router = useRouter();

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log an activity"
        onPress={() => router.push('/log')}
        style={({ pressed }) => [
          {
            alignSelf: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            backgroundColor: colors.accent,
            borderRadius: radii.pill,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.xl,
            minHeight: sizes.control,
            opacity: pressed ? 0.85 : 1,
          },
          shadows.floating,
        ]}>
        <Icon name="plus" size={icons.md} color="accentText" />
        <Text variant="heading" color="accentText">
          Log
        </Text>
      </Pressable>
    </View>
  );
}
