import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView. Off by default so flex layouts behave. */
  scroll?: boolean;
  /** Set false on screens inside a modal, which already handles the top inset. */
  edgeToEdgeTop?: boolean;
  style?: ViewStyle;
}

/** Fills the window with the theme background and applies safe-area padding. */
export function Screen({ children, scroll = false, edgeToEdgeTop = true, style }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const padding: ViewStyle = {
    paddingTop: edgeToEdgeTop ? insets.top + spacing.lg : spacing.lg,
    paddingHorizontal: spacing.lg,
  };

  if (scroll) {
    return (
      <ScrollView
        style={[styles.fill, { backgroundColor: colors.background }]}
        contentContainerStyle={[padding, { paddingBottom: insets.bottom + spacing.xxl * 3 }, style]}
        keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }, padding, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
