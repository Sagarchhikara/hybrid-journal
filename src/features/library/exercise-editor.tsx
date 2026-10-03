import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { Button, Chip, Field, SegmentedControl, Text, TextField } from '@/components';
import { useDbQuery } from '@/db';
import {
  archiveExercise,
  countExerciseUsage,
  renameExercise,
  restoreExercise,
  setExerciseBodyweight,
  setExerciseMuscleGroup,
} from '@/db/queries/exercises';
import { MUSCLE_GROUPS, type Exercise } from '@/db/schema';
import { MUSCLE_GROUP_LABELS } from '@/lib/muscle-groups';
import { useTheme } from '@/theme';

import { bodyweightLock } from './library-data';

export interface ExerciseEditorProps {
  exercise: Exercise;
  onClose: () => void;
}

/**
 * Everything editable about one exercise. Archiving is the destructive end of it, and
 * even that only hides the lift: history pins it in place with ON DELETE RESTRICT, so
 * there is no delete to offer.
 */
export function ExerciseEditor({ exercise, onClose }: ExerciseEditorProps) {
  const { colors, spacing, borderWidths } = useTheme();
  const [name, setName] = useState(exercise.name);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  // One query for the exercise on screen, rather than a usage count per library row.
  const { data: loggedSets, loading: usageLoading } = useDbQuery(
    () => countExerciseUsage(exercise.id),
    [exercise.id],
  );
  const lock = bodyweightLock(loggedSets ?? 0);
  const archived = exercise.archivedAt !== null;

  async function guard(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  function save(): void {
    const trimmed = name.trim();
    if (trimmed === '') {
      setError('An exercise needs a name');
      return;
    }

    void guard(async () => {
      const result = await renameExercise(exercise.id, trimmed);
      if (result.status === 'taken') {
        // Merging two lifts would have to move history between them; say so instead.
        setError(`“${result.existing.name}” already uses that name.`);
        return;
      }
      onClose();
    });
  }

  function confirmArchive(): void {
    const warning =
      (loggedSets ?? 0) > 0
        ? `Its ${loggedSets} logged ${loggedSets === 1 ? 'set stays' : 'sets stay'} in your history. It just stops appearing when you add exercises.`
        : 'It stops appearing when you add exercises. You can restore it here.';

    Alert.alert(`Archive ${exercise.name}?`, warning, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: () => {
          void guard(async () => {
            await archiveExercise(exercise.id);
            onClose();
          });
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
        keyboardShouldPersistTaps="handled">
        <View style={{ gap: spacing.xs }}>
          <Text variant="title">{exercise.name}</Text>
          <Text variant="caption" color="muted">
            {archived ? 'Archived · ' : ''}
            {usageLoading ? ' ' : `${loggedSets ?? 0} logged ${loggedSets === 1 ? 'set' : 'sets'}`}
          </Text>
        </View>

        <Field label="Name" error={error}>
          <TextField
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            placeholder="Exercise name"
          />
        </Field>

        <Field label="Muscle group">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {MUSCLE_GROUPS.map((value) => (
              <Chip
                key={value}
                label={MUSCLE_GROUP_LABELS[value]}
                selected={exercise.muscleGroup === value}
                onPress={() => {
                  if (exercise.muscleGroup === value) return;
                  void guard(() => setExerciseMuscleGroup(exercise.id, value));
                }}
              />
            ))}
          </View>
        </Field>

        <Field label="Loading" hint={lock.reason}>
          {lock.editable ? (
            <SegmentedControl
              options={[
                { value: 'weighted', label: 'Weighted' },
                { value: 'bodyweight', label: 'Bodyweight' },
              ]}
              value={exercise.isBodyweight ? 'bodyweight' : 'weighted'}
              onChange={(value) =>
                void guard(() => setExerciseBodyweight(exercise.id, value === 'bodyweight'))
              }
            />
          ) : (
            <Text>{exercise.isBodyweight ? 'Bodyweight' : 'Weighted'}</Text>
          )}
        </Field>
      </ScrollView>

      <View
        style={{
          padding: spacing.lg,
          gap: spacing.sm,
          borderTopWidth: borderWidths.hairline,
          borderTopColor: colors.divider,
        }}>
        <Button label="Save name" onPress={save} loading={busy} />
        {archived ? (
          <Button
            label="Restore"
            variant="secondary"
            onPress={() =>
              void guard(async () => {
                await restoreExercise(exercise.id);
                onClose();
              })
            }
          />
        ) : (
          <Button label="Archive" variant="secondary" onPress={confirmArchive} />
        )}
        <Button label="Close" variant="secondary" onPress={onClose} />
      </View>
    </View>
  );
}
