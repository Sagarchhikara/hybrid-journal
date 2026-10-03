import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, Chip, Field, SegmentedControl, Text, TextField } from '@/components';
import { createOrGetExercise } from '@/db/queries/exercises';
import { normalizeExerciseName } from '@/db/exercise-library';
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '@/db/schema';
import { MUSCLE_GROUP_LABELS } from '@/lib/muscle-groups';
import { useTheme } from '@/theme';

export interface CreateExerciseProps {
  /** Prefilled from the search box, so a fruitless search becomes the new name. */
  initialName?: string;
  onCreated: (exercise: Exercise) => void;
  onCancel: () => void;
}

export function CreateExercise({ initialName = '', onCreated, onCancel }: CreateExerciseProps) {
  const { colors, spacing, borderWidths } = useTheme();
  const [name, setName] = useState(initialName);
  const [group, setGroup] = useState<MuscleGroup>('chest');
  const [bodyweight, setBodyweight] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const normalized = normalizeExerciseName(name);

  async function create(): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      const result = await createOrGetExercise({
        name: normalized,
        muscleGroup: group,
        isBodyweight: bodyweight,
      });
      onCreated(result.exercise);
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
        keyboardShouldPersistTaps="handled">
        <Text variant="title">New exercise</Text>

        <Field label="Name" error={error}>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder="Zercher Squat"
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
          />
        </Field>

        <Field label="Muscle group">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {MUSCLE_GROUPS.map((value) => (
              <Chip
                key={value}
                label={MUSCLE_GROUP_LABELS[value]}
                selected={group === value}
                onPress={() => setGroup(value)}
              />
            ))}
          </View>
        </Field>

        <Field
          label="Loading"
          hint="Bodyweight lifts record added load only, and this cannot be changed once sets are logged.">
          <SegmentedControl
            options={[
              { value: 'weighted', label: 'Weighted' },
              { value: 'bodyweight', label: 'Bodyweight' },
            ]}
            value={bodyweight ? 'bodyweight' : 'weighted'}
            onChange={(value) => setBodyweight(value === 'bodyweight')}
          />
        </Field>
      </ScrollView>

      <View
        style={{
          padding: spacing.lg,
          gap: spacing.sm,
          borderTopWidth: borderWidths.hairline,
          borderTopColor: colors.divider,
        }}>
        {/* createOrGetExercise resolves an existing or archived name rather than failing,
            so this is safe to press with a name that already exists. */}
        <Button
          label="Create"
          onPress={() => void create()}
          loading={busy}
          disabled={normalized === ''}
        />
        <Button label="Cancel" variant="secondary" onPress={onCancel} />
      </View>
    </View>
  );
}
