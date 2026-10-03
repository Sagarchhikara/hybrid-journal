import { Tabs, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, Text, type IconName } from '@/components';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { colors, typography, spacing, sizes, borderWidths } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: typography.caption,
          tabBarActiveBackgroundColor: 'transparent',
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.divider,
            borderTopWidth: borderWidths.hairline,
            height: sizes.tabBar + insets.bottom,
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ focused }) => <TabIcon name="history" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ focused }) => <TabIcon name="stats" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="you"
          options={{
            title: 'You',
            tabBarIcon: ({ focused }) => <TabIcon name="you" focused={focused} />,
          }}
        />
      </Tabs>

      <LogButton bottom={insets.bottom + sizes.tabBar + spacing.md} />
    </View>
  );
}

/**
 * The selected tab gets a lime pill behind its glyph as well as the lime tint. Colour on
 * its own would be the only thing separating the current tab from the other three.
 */
function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const { colors, radii, spacing, icons } = useTheme();

  return (
    <View
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radii.pill,
        backgroundColor: focused ? colors.accentSurface : 'transparent',
      }}>
      <Icon name={name} size={icons.lg} color={focused ? 'accent' : 'muted'} />
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
            gap: spacing.sm,
            backgroundColor: colors.accent,
            borderRadius: radii.pill,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.xl,
            minHeight: sizes.control,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
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
