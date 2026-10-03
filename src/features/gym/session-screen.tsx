import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, View } from 'react-native';

import { Button, DateField, Field, FormScreen, Icon, Text, TextField } from '@/components';
import { deleteWorkout } from '@/db/queries/gym';
import { useTheme } from '@/theme';

import { countValidSets } from './draft-rows';
import { ExerciseCard } from './exercise-card';
import { ExercisePicker } from './exercise-picker';
import { useWorkoutSession } from './use-workout-session';

export interface SessionScreenProps {
  /** Present when editing a finished workout. */
  workoutId?: number;
}

export function SessionScreen({ workoutId }: SessionScreenProps) {
  const router = useRouter();
  const { colors, spacing, sizes, icons } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const session = useWorkoutSession({ workoutId });
  const { draft, dispatch, loading, editing, unit, validation, lastSessions, saving } = session;

  if (loading || draft === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const validSets = countValidSets(draft, unit);
  const canFinish = validation.rows !== null;

  async function finish(): Promise<void> {
    if (await session.finish()) {
      // Straight to History, so what was just logged is visible immediately.
      router.dismissTo('/history');
    }
  }

  function confirmDiscard(): void {
    Alert.alert(
      editing ? 'Discard your changes?' : 'Discard this workout?',
      editing ? 'The workout stays as it was.' : 'Everything you have entered will be thrown away.',
      [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            void session.discard().then(() => router.back());
          },
        },
      ],
    );
  }

  function confirmDelete(): void {
    if (workoutId === undefined) return;
    Alert.alert('Delete this workout?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteWorkout(workoutId)
            .then(() => router.dismissTo('/history'))
            .catch((cause: unknown) =>
              Alert.alert(
                'Could not delete',
                cause instanceof Error ? cause.message : String(cause),
              ),
            );
        },
      },
    ]);
  }

  return (
    <>
      <FormScreen
        adjustKeyboardInsets
        footer={
          <>
            {session.error ? (
              <Text variant="caption" color="danger">
                {session.error}
              </Text>
            ) : null}
            <Button
              label={
                editing
                  ? 'Save changes'
                  : validSets === 0
                    ? 'Finish'
                    : `Finish · ${validSets} ${validSets === 1 ? 'set' : 'sets'}`
              }
              onPress={() => void finish()}
              disabled={!canFinish}
              loading={saving}
            />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button
                label={editing ? 'Discard changes' : 'Discard'}
                variant="secondary"
                onPress={confirmDiscard}
                style={{ flex: 1 }}
              />
              {editing ? (
                <Button
                  label="Delete workout"
                  variant="secondary"
                  onPress={confirmDelete}
                  style={{ flex: 1 }}
                />
              ) : null}
            </View>
          </>
        }>
        <Field label="Date">
          <DateField value={draft.date} onChange={(date) => dispatch({ type: 'setDate', date })} />
        </Field>

        <Field label="Workout">
          <TextField
            value={draft.name}
            onChangeText={(name) => dispatch({ type: 'setName', name })}
            placeholder="Push, Legs, …"
            autoCapitalize="words"
          />
        </Field>

        {draft.exercises.length === 0 ? (
          <View style={{ gap: spacing.sm, paddingVertical: spacing.xl, alignItems: 'center' }}>
            <Icon name="gym" size={icons.empty} color="muted" />
            <Text color="muted" style={{ textAlign: 'center' }}>
              Add your first exercise to start logging sets.
            </Text>
          </View>
        ) : (
          <View style={{ gap: spacing.lg }}>
            {draft.exercises.map((exercise, index) => (
              <ExerciseCard
                key={exercise.localId}
                exercise={exercise}
                index={index}
                total={draft.exercises.length}
                unit={unit}
                lastSession={lastSessions.get(exercise.exerciseId)}
                setErrors={validation.setErrors}
                dispatch={dispatch}
              />
            ))}
          </View>
        )}

        <Button label="Add exercise" onPress={() => setPickerOpen(true)} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={notesOpen ? 'Hide notes' : 'Add notes'}
          onPress={() => setNotesOpen((open) => !open)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            minHeight: sizes.tapTarget,
          }}>
          <Icon name={notesOpen ? 'chevron-up' : 'chevron-down'} size={icons.sm} color="muted" />
          <Text color="muted">Notes{draft.notes.trim() === '' || notesOpen ? '' : ' · added'}</Text>
        </Pressable>

        {notesOpen ? (
          <TextField
            multiline
            value={draft.notes}
            onChangeText={(notes) => dispatch({ type: 'setNotes', notes })}
            placeholder="How did it go?"
            maxLength={1000}
          />
        ) : null}
      </FormScreen>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerOpen(false)}>
        <ExercisePicker
          workoutName={draft.name}
          onCancel={() => setPickerOpen(false)}
          onPick={(exercise) => {
            dispatch({ type: 'addExercise', exercise });
            setPickerOpen(false);
          }}
        />
      </Modal>
    </>
  );
}
