import { Tabs, useRouter } from 'expo-router';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text } from '@/components';
import { useTheme } from '@/theme';

const TAB_BAR_HEIGHT = 56;

export default function TabsLayout() {
  const { colors, typography } = useTheme();
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
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingTop: 6,
            paddingBottom: insets.bottom,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <Icon name="home" size={22} color={focused ? 'accent' : 'muted'} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ focused }) => (
              <Icon name="history" size={22} color={focused ? 'accent' : 'muted'} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ focused }) => (
              <Icon name="stats" size={22} color={focused ? 'accent' : 'muted'} />
            ),
          }}
        />
        <Tabs.Screen
          name="you"
          options={{
            title: 'You',
            tabBarIcon: ({ focused }) => (
              <Icon name="you" size={22} color={focused ? 'accent' : 'muted'} />
            ),
          }}
        />
      </Tabs>

      <LogButton bottom={insets.bottom + TAB_BAR_HEIGHT + 12} />
    </View>
  );
}

/**
 * Floats centred above the tab bar rather than replacing a tab slot, so all four
 * tabs keep their full hit area and no placeholder route is needed to hold a gap.
 */
function LogButton({ bottom }: { bottom: number }) {
  const { colors, radii, spacing } = useTheme();
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
            minHeight: 48,
            opacity: pressed ? 0.85 : 1,
          },
          Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOpacity: 0.3,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
            },
            android: { elevation: 6 },
            default: {},
          }),
        ]}>
        <Icon name="plus" size={20} color="accentText" />
        <Text variant="heading" color="accentText">
          Log
        </Text>
      </Pressable>
    </View>
  );
}
