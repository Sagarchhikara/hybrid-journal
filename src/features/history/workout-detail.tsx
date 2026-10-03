import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Button, Card, Screen, Section, Stat, StatRow, Text } from '@/components';
import { useDbQuery, useSettings } from '@/db';
import { getWorkoutDetail, type WorkoutDetailExercise } from '@/db/queries/gym';
import { formatSet } from '@/features/gym/format-sets';
import { formatDateKeyLong } from '@/lib/dates';
import { MUSCLE_GROUP_LABELS } from '@/lib/muscle-groups';
import type { WeightUnit } from '@/lib/units';
import { useTheme } from '@/theme';

/** Keeps the set numbers in a column so the weights line up under each other. */
const SET_INDEX_WIDTH = 20;

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
      <View style={{ gap: spacing.xxs, marginBottom: spacing.lg }}>
        <Text variant="label" color="muted">
          {formatDateKeyLong(detail.date).toUpperCase()}
        </Text>
        <Text variant="display">{detail.name ?? 'Workout'}</Text>
      </View>

      {/* Counted off the rows already loaded for the list below, not queried again. */}
      <Card style={{ marginBottom: spacing.xl }}>
        <StatRow>
          <Stat label="Exercises" value={String(detail.exercises.length)} tint="gym" />
          <Stat label="Sets" value={String(totalSets)} tint="gym" />
        </StatRow>
      </Card>

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
        <Section title="Notes" style={{ marginTop: spacing.xl }}>
          <Card>
            <Text color="textSecondary">{detail.notes}</Text>
          </Card>
        </Section>
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
  const { colors, spacing, card, borderWidths } = useTheme();

  return (
    <View
      style={{
        ...card,
        borderLeftColor: colors.gym,
        borderLeftWidth: borderWidths.accent,
        gap: spacing.sm,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="heading" color="gym">
            {exercise.name}
          </Text>
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
            <Text variant="caption" color="muted" style={{ width: SET_INDEX_WIDTH }}>
              {set.isDropSet ? '↳' : index + 1}
            </Text>
            <Text variant="body">{formatSet(set, exercise.isBodyweight, unit)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
