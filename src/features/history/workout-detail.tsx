import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Button, Screen, Text } from '@/components';
import { useDbQuery, useSettings } from '@/db';
import { getWorkoutDetail, type WorkoutDetailExercise } from '@/db/queries/gym';
import { formatSet } from '@/features/gym/format-sets';
import { formatDateKeyLong } from '@/lib/dates';
import { MUSCLE_GROUP_LABELS } from '@/lib/muscle-groups';
import type { WeightUnit } from '@/lib/units';
import { useTheme } from '@/theme';

export interface WorkoutDetailScreenProps {
  workoutId: number;
}

/**
 * A finished workout, read-only.
 *
 * Tapping a history row used to drop straight into the editor, which made reading back
 * what you lifted indistinguishable from changing it. This shows the workout and keeps
 * Edit as an explicit choice.
 */
export function WorkoutDetailScreen({ workoutId }: WorkoutDetailScreenProps) {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { settings } = useSettings();
  const { data: detail, loading } = useDbQuery(() => getWorkoutDetail(workoutId), [workoutId]);

  if (loading && detail === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!detail) {
    return (
      <Screen edgeToEdgeTop={false}>
        <Text variant="heading">That workout no longer exists</Text>
        <Text color="muted" style={{ marginTop: spacing.sm }}>
          It may have been deleted from another screen.
        </Text>
        <Button
          label="Back to history"
          variant="secondary"
          onPress={() => router.back()}
          style={{ marginTop: spacing.lg }}
        />
      </Screen>
    );
  }

  const totalSets = detail.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);

  return (
    <Screen scroll edgeToEdgeTop={false}>
      <View style={{ gap: spacing.xs, marginBottom: spacing.xl }}>
        <Text variant="title">{detail.name ?? 'Workout'}</Text>
        <Text color="muted">{formatDateKeyLong(detail.date)}</Text>
        <Text variant="caption" color="muted">
          {detail.exercises.length} {detail.exercises.length === 1 ? 'exercise' : 'exercises'} ·{' '}
          {totalSets} {totalSets === 1 ? 'set' : 'sets'}
        </Text>
      </View>

      {detail.exercises.length === 0 ? (
        <Text color="muted">No exercises were logged in this workout.</Text>
      ) : (
        <View style={{ gap: spacing.md }}>
          {detail.exercises.map((exercise) => (
            <ExerciseBlock
              key={exercise.workoutExerciseId}
              exercise={exercise}
              unit={settings.weightUnit}
            />
          ))}
        </View>
      )}

      {detail.notes !== null && detail.notes.trim() !== '' ? (
        <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <Text variant="label" color="muted">
            NOTES
          </Text>
          <Text>{detail.notes}</Text>
        </View>
      ) : null}

      <Button
        label="Edit this workout"
        variant="secondary"
        onPress={() => router.push(`/log/gym/session?workoutId=${detail.id}`)}
        style={{ marginTop: spacing.xxl }}
      />
    </Screen>
  );
}

function ExerciseBlock({ exercise, unit }: { exercise: WorkoutDetailExercise; unit: WeightUnit }) {
  const { colors, radii, spacing } = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderLeftColor: colors.gym,
        borderLeftWidth: 3,
        borderRadius: radii.lg,
        padding: spacing.lg,
        gap: spacing.sm,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading">{exercise.name}</Text>
          <Text variant="caption" color="muted">
            {MUSCLE_GROUP_LABELS[exercise.muscleGroup]}
            {exercise.isBodyweight ? ' · bodyweight' : ''}
            {/* Archiving hides a lift from the picker; history still has to render it. */}
            {exercise.isArchived ? ' · archived' : ''}
          </Text>
        </View>
        <Text variant="caption" color="muted">
          {exercise.sets.length} {exercise.sets.length === 1 ? 'set' : 'sets'}
        </Text>
      </View>

      <View style={{ gap: spacing.xs, marginTop: spacing.xs }}>
        {exercise.sets.map((set, index) => (
          <View
            key={set.id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Text variant="caption" color="muted" style={{ width: 20 }}>
              {index + 1}
            </Text>
            <Text variant="body">{formatSet(set, exercise.isBodyweight, unit)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
