import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { Button, Chip, Icon, Screen, Text, TextField } from '@/components';
import { useDbQuery } from '@/db';
import { searchExercises } from '@/db/queries/exercises';
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup } from '@/db/schema';
import { MUSCLE_GROUP_LABELS } from '@/lib/muscle-groups';
import { useTheme } from '@/theme';

import { CreateExercise } from './create-exercise';
import { ExerciseEditor } from './exercise-editor';
import { splitLibrary } from './library-data';

/**
 * Manage the exercise library: search, filter, create, rename, archive and restore.
 *
 * Reached from You, which is where the picker already tells people to go. Mutations bump
 * the data version, so the list refetches itself after every edit.
 */
export function ExerciseLibraryScreen() {
  const { colors, radii, spacing } = useTheme();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [creating, setCreating] = useState(false);

  const trimmed = query.trim();

  const { data: all, loading } = useDbQuery(
    () =>
      searchExercises({
        query: trimmed,
        muscleGroup: group ?? undefined,
        includeArchived: true,
      }),
    [trimmed, group],
  );

  const { active, archived } = splitLibrary(all ?? []);
  const empty = !loading && (all ?? []).length === 0;

  return (
    <>
      <Screen scroll edgeToEdgeTop={false}>
        <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
          <TextField
            value={query}
            onChangeText={setQuery}
            placeholder="Search the library"
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Chip label="All" selected={group === null} onPress={() => setGroup(null)} />
              {MUSCLE_GROUPS.map((value) => (
                <Chip
                  key={value}
                  label={MUSCLE_GROUP_LABELS[value]}
                  selected={group === value}
                  onPress={() => setGroup(group === value ? null : value)}
                />
              ))}
            </View>
          </ScrollView>

          <Button label="New exercise" onPress={() => setCreating(true)} />
        </View>

        {empty ? (
          <View style={{ gap: spacing.md, paddingVertical: spacing.xl, alignItems: 'center' }}>
            <Icon name="gym" size={36} color="muted" />
            <Text color="muted" style={{ textAlign: 'center' }}>
              {trimmed === '' ? 'Your library is empty.' : `Nothing matches “${trimmed}”.`}
            </Text>
            {trimmed === '' ? null : (
              <Button label={`Create “${trimmed}”`} onPress={() => setCreating(true)} />
            )}
          </View>
        ) : null}

        {active.length > 0 ? (
          <Section title={`${active.length} ${active.length === 1 ? 'exercise' : 'exercises'}`}>
            {active.map((exercise) => (
              <LibraryRow
                key={exercise.id}
                exercise={exercise}
                onPress={() => setEditing(exercise)}
              />
            ))}
          </Section>
        ) : null}

        {archived.length > 0 ? (
          <Section
            title="Archived"
            hint="Hidden when adding exercises. Their logged sets stay in your history.">
            {archived.map((exercise) => (
              <LibraryRow
                key={exercise.id}
                exercise={exercise}
                onPress={() => setEditing(exercise)}
              />
            ))}
          </Section>
        ) : null}

        <View
          style={{
            marginTop: spacing.xl,
            padding: spacing.lg,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radii.md,
          }}>
          <Text variant="caption" color="muted">
            Exercises are archived, never deleted: your history holds them in place. Whether a lift
            is weighted or bodyweight is fixed once you have logged sets for it.
          </Text>
        </View>
      </Screen>

      <Modal
        visible={editing !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditing(null)}>
        {editing ? <ExerciseEditor exercise={editing} onClose={() => setEditing(null)} /> : null}
      </Modal>

      <Modal
        visible={creating}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreating(false)}>
        <CreateExercise
          initialName={trimmed}
          onCancel={() => setCreating(false)}
          onCreated={(exercise) => {
            setCreating(false);
            setQuery('');
            // Straight into the editor, which is where the flag and group live.
            setEditing(exercise);
          }}
        />
      </Modal>
    </>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const { spacing } = useTheme();

  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
      <Text variant="label" color="muted">
        {title.toUpperCase()}
      </Text>
      {hint ? (
        <Text variant="caption" color="muted">
          {hint}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

function LibraryRow({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  const { colors, radii, spacing } = useTheme();
  const archived = exercise.archivedAt !== null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${exercise.name}`}
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
        opacity: archived ? 0.6 : 1,
      })}>
      <View style={{ flex: 1 }}>
        <Text variant="body">{exercise.name}</Text>
        <Text variant="caption" color="muted">
          {MUSCLE_GROUP_LABELS[exercise.muscleGroup]}
          {exercise.isBodyweight ? ' · bodyweight' : ''}
          {exercise.isCustom ? ' · yours' : ''}
        </Text>
      </View>
      <Icon name="chevron" size={18} color="muted" />
    </Pressable>
  );
}
