import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button, Chip, Icon, SegmentedControl, Text, TextField } from '@/components';
import { useDbQuery } from '@/db';
import { createOrGetExercise, getRecentExerciseIds, searchExercises } from '@/db/queries/exercises';
import { normalizeExerciseName } from '@/db/exercise-library';
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '@/db/schema';
import { MUSCLE_GROUP_LABELS } from '@/lib/muscle-groups';
import { useTheme } from '@/theme';

import type { NewExerciseInput } from './draft';
import { muscleGroupsForWorkout } from './workout-names';

export interface ExercisePickerProps {
  onPick: (exercise: NewExerciseInput) => void;
  onCancel: () => void;
  /** The workout's name, which narrows the list to the groups that day trains. */
  workoutName?: string;
}

/**
 * What the list is currently showing: the workout day's groups, one group on its own, or
 * the whole library.
 */
type Scope = { kind: 'day' } | { kind: 'all' } | { kind: 'group'; group: MuscleGroup };

/**
 * Search, filter and pick. One tap adds and closes — multi-select would save a tap at the
 * cost of a confirm step, and the whole screen is judged on taps-to-logged.
 *
 * On a named split day the list opens already narrowed to that day's muscle groups, so
 * Push does not offer leg curls. The narrowing is a default and not a rule: the day chip
 * can be swapped for a single group or for the whole library at any point.
 */
export function ExercisePicker({ onPick, onCancel, workoutName }: ExercisePickerProps) {
  const { colors, radii, spacing, icons, borderWidths } = useTheme();
  const [query, setQuery] = useState('');

  const dayName = (workoutName ?? '').trim();
  const dayGroups = muscleGroupsForWorkout(dayName);

  // Starts on the day's groups when the name implies any, otherwise on everything.
  const [scope, setScope] = useState<Scope>(dayGroups ? { kind: 'day' } : { kind: 'all' });
  // A name typed after the picker opened would otherwise leave an impossible scope.
  const effectiveScope: Scope = scope.kind === 'day' && !dayGroups ? { kind: 'all' } : scope;

  const groups: readonly MuscleGroup[] =
    effectiveScope.kind === 'day'
      ? (dayGroups ?? [])
      : effectiveScope.kind === 'group'
        ? [effectiveScope.group]
        : [];

  const trimmed = query.trim();
  // useDbQuery identifies a run by its deps, so the group list goes in as a string.
  const groupsKey = groups.join(',');

  const { data: matches } = useDbQuery(
    () => searchExercises({ query: trimmed, muscleGroups: groups }),
    [trimmed, groupsKey],
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

  // The day's groups lead the chip row; the rest keep the library's own order.
  const orderedGroups = useMemo(() => {
    if (!dayGroups) return MUSCLE_GROUPS;
    const inDay = new Set(dayGroups);
    return [...dayGroups, ...MUSCLE_GROUPS.filter((value) => !inDay.has(value))];
  }, [dayGroups]);

  // Whatever is filtered now is the group a newly created exercise most likely belongs to.
  const createDefaultGroup: MuscleGroup =
    effectiveScope.kind === 'group' ? effectiveScope.group : (dayGroups?.[0] ?? 'chest');

  const filterLabel =
    effectiveScope.kind === 'group'
      ? MUSCLE_GROUP_LABELS[effectiveScope.group].toLowerCase()
      : dayName;

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
            <Icon name="close" size={icons.lg} color="muted" />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {dayGroups ? (
              <Chip
                label={dayName}
                tint="gym"
                selected={effectiveScope.kind === 'day'}
                onPress={() => setScope({ kind: 'day' })}
              />
            ) : null}
            <Chip
              label="All"
              selected={effectiveScope.kind === 'all'}
              onPress={() => setScope({ kind: 'all' })}
            />
            {/* On a split day, that day's groups first: they are the ones being trained. */}
            {orderedGroups.map((value) => (
              <Chip
                key={value}
                label={MUSCLE_GROUP_LABELS[value]}
                selected={effectiveScope.kind === 'group' && effectiveScope.group === value}
                onPress={() =>
                  setScope(
                    effectiveScope.kind === 'group' && effectiveScope.group === value
                      ? dayGroups
                        ? { kind: 'day' }
                        : { kind: 'all' }
                      : { kind: 'group', group: value },
                  )
                }
              />
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl * 2 }}
        keyboardShouldPersistTaps="handled">
        {recent.length > 0 ? (
          <Section title="Recently used">
            {recent.map((exercise) => (
              <ExerciseRow key={exercise.id} exercise={exercise} onPress={() => pick(exercise)} />
            ))}
          </Section>
        ) : null}

        {rest.length > 0 ? (
          <Section
            title={
              recent.length > 0
                ? effectiveScope.kind === 'all'
                  ? 'All exercises'
                  : `${filterLabel} exercises`
                : undefined
            }>
            {rest.map((exercise) => (
              <ExerciseRow key={exercise.id} exercise={exercise} onPress={() => pick(exercise)} />
            ))}
          </Section>
        ) : null}

        {/* After the matches, not before them: when you search "bench" you are almost
            always reaching for a lift you already have, and a create form above the
            results pushes them off the screen. */}
        {canCreate ? (
          <CreateRow
            name={normalized}
            dayGroups={dayGroups}
            defaultGroup={createDefaultGroup}
            onCreated={pick}
          />
        ) : null}

        {matches !== undefined && matches.length === 0 ? (
          <View style={{ marginTop: spacing.xl, gap: spacing.md, alignItems: 'center' }}>
            {canCreate ? null : (
              <Text color="muted" style={{ textAlign: 'center' }}>
                {effectiveScope.kind === 'all'
                  ? 'Nothing matches that.'
                  : `No ${filterLabel} exercises match that.`}
              </Text>
            )}
            {/* A filtered search that finds nothing is a dead end without this. */}
            {effectiveScope.kind === 'all' ? null : (
              <Button
                label="Search all exercises"
                variant="secondary"
                onPress={() => setScope({ kind: 'all' })}
              />
            )}
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{
          padding: spacing.lg,
          borderTopWidth: borderWidths.hairline,
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
  const { colors, radii, spacing, sizes, icons, borderWidths } = useTheme();

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
        borderWidth: borderWidths.hairline,
        borderRadius: radii.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        minHeight: sizes.row,
      })}>
      <View style={{ flex: 1 }}>
        <Text variant="body">{exercise.name}</Text>
        <Text variant="caption" color="muted">
          {MUSCLE_GROUP_LABELS[exercise.muscleGroup]}
          {exercise.isBodyweight ? ' · bodyweight' : ''}
        </Text>
      </View>
      <Icon name="plus" size={icons.sm} color="accent" />
    </Pressable>
  );
}

/**
 * Offered when the search text matches nothing exactly. Creating a name that already
 * exists under a different case or spacing resolves to the existing exercise rather than
 * failing, so this can never produce a duplicate or a raw SQLite error.
 */
function CreateRow({
  name,
  dayGroups,
  defaultGroup,
  onCreated,
}: {
  name: string;
  /** The groups this workout day trains, or null when the name implies none. */
  dayGroups: readonly MuscleGroup[] | null;
  /** Pre-selected from the filter in force, which is nearly always the right group. */
  defaultGroup: MuscleGroup;
  onCreated: (exercise: Exercise) => void;
}) {
  const { colors, radii, spacing, borderWidths } = useTheme();
  const [group, setGroup] = useState<MuscleGroup>(defaultGroup);
  const [bodyweight, setBodyweight] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [allGroups, setAllGroups] = useState(false);

  // Only the day's groups, because a lift you are adding mid-Push is a pushing lift.
  // Not a rule, though: the toggle is there for the accessory that does not fit, and a
  // group picked before the toggle was flipped stays picked.
  const offered: readonly MuscleGroup[] =
    dayGroups === null || allGroups || !dayGroups.includes(group) ? MUSCLE_GROUPS : dayGroups;

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
        borderWidth: borderWidths.hairline,
        borderRadius: radii.lg,
      }}>
      <Text variant="heading">Create “{name}”</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {offered.map((value) => (
            <Chip
              key={value}
              label={MUSCLE_GROUP_LABELS[value]}
              selected={group === value}
              onPress={() => setGroup(value)}
            />
          ))}
          {offered === MUSCLE_GROUPS ? null : (
            <Chip label="More…" selected={false} onPress={() => setAllGroups(true)} />
          )}
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
