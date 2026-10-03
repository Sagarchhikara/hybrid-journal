import { useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';

import { Button, Chip, EmptyState, ListRow, Screen, Section, Text, TextField } from '@/components';
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
  const { colors, radii, spacing, borderWidths } = useTheme();
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
          <EmptyState
            icon="gym"
            title={trimmed === '' ? 'Your library is empty' : `Nothing matches “${trimmed}”`}
            body={trimmed === '' ? 'Exercises you create or log will collect here.' : undefined}
            action={
              trimmed === '' ? undefined : (
                <Button label={`Create “${trimmed}”`} onPress={() => setCreating(true)} />
              )
            }
          />
        ) : null}

        {active.length > 0 ? (
          <Section
            style={{ marginTop: spacing.lg }}
            title={`${active.length} ${active.length === 1 ? 'exercise' : 'exercises'}`}>
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
            style={{ marginTop: spacing.lg }}
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
            borderWidth: borderWidths.hairline,
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

function LibraryRow({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  return (
    <ListRow
      title={exercise.name}
      subtitle={`${MUSCLE_GROUP_LABELS[exercise.muscleGroup]}${
        exercise.isBodyweight ? ' · bodyweight' : ''
      }${exercise.isCustom ? ' · yours' : ''}`}
      accessibilityLabel={`Edit ${exercise.name}`}
      // Archived entries read back at lower weight rather than being hidden here: this
      // is the screen where you come to find and restore them.
      dimmed={exercise.archivedAt !== null}
      onPress={onPress}
    />
  );
}
