import type { WorkoutDetail } from '@/db/queries/gym';
import type { DateKey } from '@/lib/dates';
import { parseDecimalInput, parseIntegerInput } from '@/lib/input';
import type { WeightUnit } from '@/lib/units';

import { isSetBlank, type DraftExercise, type DraftSet, type WorkoutDraft } from './draft';
import { toDisplayWeight, toStorageWeight } from './weight-steps';

export const MAX_REPS = 1000;
export const MAX_WEIGHT_KG = 1000;

export interface SetRow {
  weightKg: number | null;
  reps: number;
  setOrder: number;
}

export interface ExerciseRow {
  exerciseId: number;
  sortOrder: number;
  sets: SetRow[];
}

export interface WorkoutRows {
  date: DateKey;
  name: string | null;
  notes: string | null;
  exercises: ExerciseRow[];
}

/** Keyed by set localId. */
export type SetErrors = Map<number, string>;

export interface DraftValidation {
  setErrors: SetErrors;
  /** Something wrong with the workout as a whole, e.g. nothing logged at all. */
  workoutError: string | undefined;
  /** Present only when the whole draft is valid. Blank sets are already dropped. */
  rows: WorkoutRows | null;
}

type SetOutcome =
  | { kind: 'blank' }
  | { kind: 'invalid'; message: string }
  | { kind: 'valid'; weightKg: number | null; reps: number };

/**
 * Validates one set against the exercise it belongs to.
 *
 *  - A set with nothing in it is blank, and gets dropped silently on Finish.
 *  - Reps are required once anything is entered, and must be a whole number of at least 1.
 *  - A non-bodyweight exercise always needs a weight above zero.
 *  - A bodyweight exercise may have no weight (plain BW) or a positive added load. Zero
 *    added load is the same thing as plain bodyweight, so it stores as NULL rather than
 *    being rejected.
 */
export function validateSet(set: DraftSet, exercise: DraftExercise, unit: WeightUnit): SetOutcome {
  if (isSetBlank(set)) return { kind: 'blank' };

  const weightText = set.weight.trim();
  const repsText = set.reps.trim();

  if (repsText === '') return { kind: 'invalid', message: 'Add reps' };

  const reps = parseIntegerInput(repsText);
  if (reps < 1) return { kind: 'invalid', message: 'Reps must be a whole number of 1 or more' };
  if (reps > MAX_REPS) return { kind: 'invalid', message: `Reps must be under ${MAX_REPS}` };

  if (weightText === '') {
    if (!exercise.isBodyweight) return { kind: 'invalid', message: 'Add a weight' };
    return { kind: 'valid', weightKg: null, reps };
  }

  const entered = parseDecimalInput(weightText);
  // parseDecimalInput rejects a leading '-', so a negative can only arrive as junk text.
  if (entered === null) return { kind: 'invalid', message: 'Weight is not a number' };
  if (entered < 0) return { kind: 'invalid', message: 'Weight cannot be negative' };

  if (entered === 0) {
    // Zero total load is not a lift; zero added load is plain bodyweight.
    if (!exercise.isBodyweight) return { kind: 'invalid', message: 'Weight must be above zero' };
    return { kind: 'valid', weightKg: null, reps };
  }

  const weightKg = toStorageWeight(entered, unit);
  if (weightKg > MAX_WEIGHT_KG) return { kind: 'invalid', message: 'That weight looks wrong' };

  return { kind: 'valid', weightKg, reps };
}

export function validateDraft(draft: WorkoutDraft, unit: WeightUnit): DraftValidation {
  const setErrors: SetErrors = new Map();
  const exercises: ExerciseRow[] = [];

  for (const exercise of draft.exercises) {
    const sets: SetRow[] = [];

    for (const set of exercise.sets) {
      const outcome = validateSet(set, exercise, unit);
      if (outcome.kind === 'blank') continue;
      if (outcome.kind === 'invalid') {
        setErrors.set(set.localId, outcome.message);
        continue;
      }
      sets.push({ weightKg: outcome.weightKg, reps: outcome.reps, setOrder: sets.length });
    }

    // An exercise with no usable sets is dropped rather than stored empty.
    if (sets.length > 0) {
      exercises.push({ exerciseId: exercise.exerciseId, sortOrder: exercises.length, sets });
    }
  }

  const workoutError = exercises.length === 0 ? 'Log at least one set before finishing' : undefined;

  const valid = setErrors.size === 0 && workoutError === undefined;

  return {
    setErrors,
    workoutError,
    rows: valid
      ? {
          date: draft.date,
          name: draft.name.trim() === '' ? null : draft.name.trim(),
          notes: draft.notes.trim() === '' ? null : draft.notes.trim(),
          exercises,
        }
      : null,
  };
}

/** Total usable sets, for the Finish button's label and the history summary. */
export function countValidSets(draft: WorkoutDraft, unit: WeightUnit): number {
  return draft.exercises.reduce(
    (total, exercise) =>
      total +
      exercise.sets.filter((set) => validateSet(set, exercise, unit).kind === 'valid').length,
    0,
  );
}

/** Loads a finished workout back into the editor. The inverse of validateDraft's rows. */
export function draftFromWorkout(detail: WorkoutDetail, unit: WeightUnit): WorkoutDraft {
  let nextLocalId = 1;
  const take = (): number => nextLocalId++;

  const exercises: DraftExercise[] = detail.exercises.map((exercise) => ({
    localId: take(),
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    isBodyweight: exercise.isBodyweight,
    sets: exercise.sets.map((set) => ({
      localId: take(),
      weight: set.weightKg === null ? '' : String(toDisplayWeight(set.weightKg, unit)),
      reps: String(set.reps),
    })),
  }));

  return {
    workoutId: detail.id,
    date: detail.date,
    name: detail.name ?? '',
    notes: detail.notes ?? '',
    exercises,
    nextLocalId,
  };
}
