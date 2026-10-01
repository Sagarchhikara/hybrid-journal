import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button, Chip, Icon, SegmentedControl, Text, TextField } from '@/components';
import { useDbQuery } from '@/db';
import { createOrGetExercise, getRecentExerciseIds, searchExercises } from '@/db/queries/exercises';
import { normalizeExerciseName } from '@/db/exercise-library';
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '@/db/schema';
import { useTheme } from '@/theme';

import type { NewExerciseInput } from './draft';

const GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  biceps: 'Biceps',
  triceps: 'Triceps',
  core: 'Core',
  full_body: 'Full body',
};

export interface ExercisePickerProps {
  onPick: (exercise: NewExerciseInput) => void;
  onCancel: () => void;
}

/**
 * Search, filter and pick. One tap adds and closes — multi-select would save a tap at the
 * cost of a confirm step, and the whole screen is judged on taps-to-logged.
 */
export function ExercisePicker({ onPick, onCancel }: ExercisePickerProps) {
  const { colors, radii, spacing } = useTheme();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | null>(null);

  const trimmed = query.trim();

  const { data: matches } = useDbQuery(
    () => searchExercises({ query: trimmed, muscleGroup: group ?? undefined }),
    [trimmed, group],
  );
  const { data: recentIds } = useDbQuery(() => getRecentExerciseIds(6), []);

  const { recent, rest } = useMemo(() => {
    const all = matches ?? [];
    const ids = recentIds ?? [];
    // Recently used first, in recency order, then everything else alphabetically.
    const recent = ids
      .map((id) => all.find((exercise) => exercise.id === id))
      .filter((exercise): exercise is Exercise => exercise !== undefined);
    const recentSet = new Set(recent.map((exercise) => exercise.id));
    return { recent, rest: all.filter((exercise) => !recentSet.has(exercise.id)) };
  }, [matches, recentIds]);

  const normalized = normalizeExerciseName(trimmed);
  const hasExactMatch = (matches ?? []).some(
    (exercise) => exercise.name.toLowerCase() === normalized.toLowerCase(),
  );
  const canCreate = normalized !== '' && !hasExactMatch;

  function pick(exercise: Exercise): void {
    onPick({
      exerciseId: exercise.id,
      name: exercise.name,
      isBodyweight: exercise.isBodyweight,
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <TextField
              value={query}
              onChangeText={setQuery}
              placeholder="Search exercises"
              autoFocus
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={onCancel}
            hitSlop={spacing.sm}
            style={{ padding: spacing.sm }}>
            <Icon name="close" size={22} color="muted" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Chip label="All" selected={group === null} onPress={() => setGroup(null)} />
            {MUSCLE_GROUPS.map((value) => (
              <Chip
                key={value}
                label={GROUP_LABELS[value]}
                selected={group === value}
                onPress={() => setGroup(group === value ? null : value)}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl * 2 }}
        keyboardShouldPersistTaps="handled">
        {canCreate ? <CreateRow name={normalized} onCreated={pick} /> : null}

        {recent.length > 0 ? (
          <Section title="Recently used">
            {recent.map((exercise) => (
              <ExerciseRow key={exercise.id} exercise={exercise} onPress={() => pick(exercise)} />
            ))}
          </Section>
        ) : null}

        {rest.length > 0 ? (
          <Section title={recent.length > 0 ? 'All exercises' : undefined}>
            {rest.map((exercise) => (
              <ExerciseRow key={exercise.id} exercise={exercise} onPress={() => pick(exercise)} />
            ))}
          </Section>
        ) : null}

        {matches !== undefined && matches.length === 0 && !canCreate ? (
          <Text color="muted" style={{ marginTop: spacing.xl, textAlign: 'center' }}>
            Nothing matches that.
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={{
          padding: spacing.lg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          borderRadius: radii.sm,
        }}>
        <Text variant="caption" color="muted">
          Archived exercises are hidden. Manage them in You → Exercise library.
        </Text>
      </View>
    </View>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  const { spacing } = useTheme();

  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
      {title ? (
        <Text variant="label" color="muted">
          {title.toUpperCase()}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

function ExerciseRow({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  const { colors, radii, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Add ${exercise.name}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radii.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        minHeight: 56,
      })}>
      <View style={{ flex: 1 }}>
        <Text variant="body">{exercise.name}</Text>
        <Text variant="caption" color="muted">
          {GROUP_LABELS[exercise.muscleGroup]}
          {exercise.isBodyweight ? ' · bodyweight' : ''}
        </Text>
      </View>
      <Icon name="plus" size={18} color="accent" />
    </Pressable>
  );
}

/**
 * Offered when the search text matches nothing exactly. Creating a name that already
 * exists under a different case or spacing resolves to the existing exercise rather than
 * failing, so this can never produce a duplicate or a raw SQLite error.
 */
function CreateRow({ name, onCreated }: { name: string; onCreated: (exercise: Exercise) => void }) {
  const { colors, radii, spacing } = useTheme();
  const [group, setGroup] = useState<MuscleGroup>('chest');
  const [bodyweight, setBodyweight] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function create(): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      const result = await createOrGetExercise({
        name,
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
    <View
      style={{
        marginTop: spacing.lg,
        padding: spacing.lg,
        gap: spacing.md,
        backgroundColor: colors.surface,
        borderColor: colors.accent,
        borderWidth: 1,
        borderRadius: radii.lg,
      }}>
      <Text variant="heading">Create “{name}”</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {MUSCLE_GROUPS.map((value) => (
            <Chip
              key={value}
              label={GROUP_LABELS[value]}
              selected={group === value}
              onPress={() => setGroup(value)}
            />
          ))}
        </View>
      </ScrollView>

      <SegmentedControl
        options={[
          { value: 'weighted', label: 'Weighted' },
          { value: 'bodyweight', label: 'Bodyweight' },
        ]}
        value={bodyweight ? 'bodyweight' : 'weighted'}
        onChange={(value) => setBodyweight(value === 'bodyweight')}
      />

      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}

      <Button label="Create and add" onPress={() => void create()} loading={busy} />
    </View>
  );
}
