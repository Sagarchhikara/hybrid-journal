import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export interface FormScreenProps {
  children: ReactNode;
  /** Pinned below the scroll area and above the keyboard — usually the save button. */
  footer?: ReactNode;
}

/**
 * Form layout for the log modal. The footer stays reachable with the keyboard open on a
 * small screen, which is the difference between logging a run in 20 seconds and
 * scrolling around hunting for Save.
 */
export function FormScreen({ children, footer }: FormScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive">
        {children}
      </ScrollView>

      {footer ? (
        <View
          style={{
            padding: spacing.lg,
            paddingBottom: Math.max(insets.bottom, spacing.lg),
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
            gap: spacing.sm,
          }}>
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
