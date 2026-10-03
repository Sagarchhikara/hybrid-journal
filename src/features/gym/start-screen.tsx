import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { Button, Card, Chip, DateField, Field, FormScreen, Text, TextField } from '@/components';
import { useDbQuery } from '@/db';
import { getLastWorkoutByName } from '@/db/queries/gym';
import { clearGymDraft, readGymDraft, writeGymDraft } from '@/db/queries/gym-draft';
import { todayLocal, type DateKey } from '@/lib/dates';
import { formatDateKeyShort } from '@/lib/dates';
import { useTheme } from '@/theme';

import { createDraft, draftReducer, isSetBlank, type WorkoutDraft } from './draft';
import { WORKOUT_NAME_PRESETS } from './workout-names';

/** Where the logging screen lives, as a typed route. */
const SESSION_ROUTE = '/log/gym/session' as const;

export function GymStartScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();

  const [name, setName] = useState('');
  const [date, setDate] = useState<DateKey>(todayLocal());
  const [busy, setBusy] = useState(false);

  const { data: draft, loading, refetch: refetchDraft } = useDbQuery(readGymDraft, []);

  // The logging screen autosaves silently, so coming back from it is the moment to
  // re-read how far the workout in progress has got.
  useFocusEffect(
    useCallback(() => {
      refetchDraft();
    }, [refetchDraft]),
  );
  const { data: lastNamed } = useDbQuery(
    () => (name.trim() === '' ? Promise.resolve(undefined) : getLastWorkoutByName(name.trim())),
    [name.trim()],
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  /** Writes the starting draft before navigating, so the session screen just reads it. */
  async function start(initial: WorkoutDraft): Promise<void> {
    setBusy(true);
    try {
      await writeGymDraft(initial);
      router.push(SESSION_ROUTE);
    } catch (cause) {
      Alert.alert('Could not start', cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  /**
   * Starting a workout overwrites the draft slot, so anything in progress is gone.
   * A red line of text under the button was not enough: the tap destroys work, and
   * destroying work asks first.
   */
  function confirmReplace(next: WorkoutDraft): void {
    if (!draft) {
      void start(next);
      return;
    }

    const inProgress = draft.name.trim() === '' ? 'The workout in progress' : `Your ${draft.name}`;
    const sets = draft.exercises.reduce(
      (total, exercise) => total + exercise.sets.filter((set) => !isSetBlank(set)).length,
      0,
    );

    Alert.alert(
      'Replace the workout in progress?',
      `${inProgress} from ${formatDateKeyShort(draft.date)} will be discarded${
        sets > 0 ? `, including ${sets} logged ${sets === 1 ? 'set' : 'sets'}` : ''
      }.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resume it instead', onPress: () => router.push(SESSION_ROUTE) },
        { text: 'Replace', style: 'destructive', onPress: () => void start(next) },
      ],
    );
  }

  function startEmpty(): void {
    confirmReplace(createDraft({ date, name: name.trim() }));
  }

  /** Copies the exercise list of the last workout with this name. Sets stay empty. */
  function copyLast(): void {
    if (!lastNamed) return;

    let next = createDraft({ date, name: name.trim() });
    for (const exercise of lastNamed.exercises) {
      next = draftReducer(next, {
        type: 'addExercise',
        exercise: {
          exerciseId: exercise.exerciseId,
          name: exercise.name,
          isBodyweight: exercise.isBodyweight,
        },
      });
    }
    confirmReplace(next);
  }

  function confirmDiscardDraft(): void {
    Alert.alert('Discard the workout in progress?', 'Everything in it will be thrown away.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          void clearGymDraft();
        },
      },
    ]);
  }

  return (
    <FormScreen>
      {draft ? (
        <Card accent="gym">
          <Text variant="heading">Workout in progress</Text>
          <Text color="muted">
            {draft.name.trim() === '' ? 'Unnamed' : draft.name} · {formatDateKeyShort(draft.date)} ·{' '}
            {draft.exercises.length} {draft.exercises.length === 1 ? 'exercise' : 'exercises'}
          </Text>
          <Button
            label="Resume workout"
            onPress={() => router.push(SESSION_ROUTE)}
            style={{ marginTop: spacing.sm }}
          />
          <Button label="Discard it" variant="secondary" onPress={confirmDiscardDraft} />
        </Card>
      ) : null}

      <Field label="Date">
        <DateField value={date} onChange={setDate} />
      </Field>

      <Field label="Name" hint="Optional, but it makes Copy last and History far more useful.">
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {WORKOUT_NAME_PRESETS.map((preset) => (
              <Chip
                key={preset}
                label={preset}
                tint="gym"
                selected={name.trim() === preset}
                onPress={() => setName(name.trim() === preset ? '' : preset)}
              />
            ))}
          </View>
          <TextField
            value={name}
            onChangeText={setName}
            placeholder="Or type your own"
            autoCapitalize="words"
          />
        </View>
      </Field>

      {lastNamed ? (
        <Card>
          <Text variant="heading">Copy last {lastNamed.name ?? 'workout'}</Text>
          <Text color="muted">
            {formatDateKeyShort(lastNamed.date)} · {lastNamed.exercises.length}{' '}
            {lastNamed.exercises.length === 1 ? 'exercise' : 'exercises'}
          </Text>
          <Text variant="caption" color="muted">
            {lastNamed.exercises.map((exercise) => exercise.name).join(', ')}
          </Text>
          <Text variant="caption" color="muted">
            Brings the exercises across, not the sets — each card shows what you lifted last time so
            you can fill it in a tap.
          </Text>
          <Button
            label="Copy exercises and start"
            onPress={copyLast}
            loading={busy}
            style={{ marginTop: spacing.sm }}
          />
        </Card>
      ) : null}

      <Button
        label={draft ? 'Start a new empty workout' : 'Start empty'}
        variant={lastNamed ? 'secondary' : 'primary'}
        onPress={startEmpty}
        loading={busy}
      />

      {draft ? (
        <Text variant="caption" color="danger">
          Starting a new workout replaces the one in progress above.
        </Text>
      ) : null}
    </FormScreen>
  );
}
