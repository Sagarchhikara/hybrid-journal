import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Icon, Text } from '@/components';
import { useDbQuery } from '@/db';
import { clearGymDraft, readGymDraft } from '@/db/queries/gym-draft';
import { formatDateKeyShort } from '@/lib/dates';
import { useTheme } from '@/theme';

/**
 * Offers the workout in progress, if there is one.
 *
 * Nothing is shown when there is no draft: a banner reading "no workout in progress"
 * would be noise on the one screen that should be glanceable.
 *
 * The logging screen autosaves silently to keep typing cheap, so this refetches on focus
 * rather than waiting for a data-version bump. Finishing and discarding both bump, so
 * the banner clears itself on those paths without any help from here.
 */
export function ResumeBanner() {
  const router = useRouter();
  const { colors, radii, spacing, icons, borderWidths } = useTheme();
  const { data: draft, refetch } = useDbQuery(readGymDraft, []);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  if (!draft) return null;

  const exercises = draft.exercises.length;
  const sets = draft.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);

  function confirmDiscard(): void {
    Alert.alert(
      'Discard the workout in progress?',
      'Everything you have entered will be thrown away.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            void clearGymDraft();
          },
        },
      ],
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: borderWidths.hairline,
        borderLeftColor: colors.gym,
        borderLeftWidth: borderWidths.accent,
        borderRadius: radii.lg,
        marginBottom: spacing.lg,
        paddingLeft: spacing.lg,
      }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Resume workout: ${draft.name.trim() === '' ? 'unnamed' : draft.name}, ${exercises} ${exercises === 1 ? 'exercise' : 'exercises'}`}
        onPress={() => router.push('/log/gym/session')}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.lg,
          opacity: pressed ? 0.6 : 1,
        })}>
        <Icon name="gym" size={icons.lg} color="gym" />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="heading">Resume workout</Text>
          <Text variant="caption" color="muted">
            {draft.name.trim() === '' ? 'Unnamed' : draft.name} · {formatDateKeyShort(draft.date)} ·{' '}
            {exercises} {exercises === 1 ? 'exercise' : 'exercises'}
            {sets > 0 ? ` · ${sets} ${sets === 1 ? 'set' : 'sets'}` : ''}
          </Text>
        </View>
        <Icon name="chevron" size={icons.sm} color="muted" />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Discard the workout in progress"
        onPress={confirmDiscard}
        hitSlop={spacing.sm}
        style={({ pressed }) => ({
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.lg,
          opacity: pressed ? 0.5 : 1,
        })}>
        <Icon name="close" size={icons.sm} color="muted" />
      </Pressable>
    </View>
  );
}
