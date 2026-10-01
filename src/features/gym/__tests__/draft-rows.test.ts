import { describe, expect, it } from 'vitest';

import type { WorkoutDetail } from '@/db/queries/gym';

import { createDraft, draftReducer, type WorkoutDraft } from '../draft';
import { countValidSets, draftFromWorkout, validateDraft, validateSet } from '../draft-rows';

const BENCH = { exerciseId: 1, name: 'Barbell Bench Press', isBodyweight: false };
const PULLUP = { exerciseId: 2, name: 'Pull-Up', isBodyweight: true };

/** Builds a draft of one exercise whose sets are given as [weight, reps] text pairs. */
function draftWith(exercise: typeof BENCH, sets: readonly [string, string][]): WorkoutDraft {
  let draft = draftReducer(createDraft({ date: '2026-10-01', name: 'Push' }), {
    type: 'addExercise',
    exercise,
  });
  const exerciseLocalId = draft.exercises[0]!.localId;

  sets.forEach(([weight, reps], index) => {
    if (index > 0) draft = draftReducer(draft, { type: 'addSet', exerciseLocalId });
    const setLocalId = draft.exercises[0]!.sets[index]!.localId;
    draft = draftReducer(draft, {
      type: 'updateSet',
      exerciseLocalId,
      setLocalId,
      patch: { weight, reps },
    });
  });

  return draft;
}

describe('validateSet for a weighted exercise', () => {
  const exercise = { localId: 1, ...BENCH, sets: [] };

  it('accepts a weight and reps', () => {
    expect(validateSet({ localId: 1, weight: '80', reps: '8' }, exercise, 'kg')).toEqual({
      kind: 'valid',
      weightKg: 80,
      reps: 8,
    });
  });

  it('treats a wholly empty set as blank, to be dropped silently', () => {
    expect(validateSet({ localId: 1, weight: '', reps: '' }, exercise, 'kg').kind).toBe('blank');
  });

  it('rejects a weight with no reps', () => {
    expect(validateSet({ localId: 1, weight: '80', reps: '' }, exercise, 'kg')).toEqual({
      kind: 'invalid',
      message: 'Add reps',
    });
  });

  it('requires a weight when the exercise is not bodyweight', () => {
    expect(validateSet({ localId: 1, weight: '', reps: '8' }, exercise, 'kg')).toEqual({
      kind: 'invalid',
      message: 'Add a weight',
    });
  });

  it('rejects zero weight', () => {
    expect(validateSet({ localId: 1, weight: '0', reps: '8' }, exercise, 'kg').kind).toBe(
      'invalid',
    );
  });

  it('rejects reps below one', () => {
    expect(validateSet({ localId: 1, weight: '80', reps: '0' }, exercise, 'kg').kind).toBe(
      'invalid',
    );
  });

  it('rejects junk and negative weights', () => {
    for (const weight of ['abc', '-5', '1.2.3']) {
      expect(validateSet({ localId: 1, weight, reps: '8' }, exercise, 'kg').kind).toBe('invalid');
    }
  });

  it('converts a pound entry to kg', () => {
    const result = validateSet({ localId: 1, weight: '160', reps: '8' }, exercise, 'lb');
    expect(result.kind).toBe('valid');
    if (result.kind === 'valid') expect(result.weightKg).toBeCloseTo(72.5748, 3);
  });
});

describe('validateSet for a bodyweight exercise', () => {
  const exercise = { localId: 1, ...PULLUP, sets: [] };

  it('accepts reps with no weight as plain bodyweight', () => {
    expect(validateSet({ localId: 1, weight: '', reps: '10' }, exercise, 'kg')).toEqual({
      kind: 'valid',
      weightKg: null,
      reps: 10,
    });
  });

  it('accepts a positive added load', () => {
    expect(validateSet({ localId: 1, weight: '10', reps: '8' }, exercise, 'kg')).toEqual({
      kind: 'valid',
      weightKg: 10,
      reps: 8,
    });
  });

  it('stores zero added load as plain bodyweight rather than rejecting it', () => {
    expect(validateSet({ localId: 1, weight: '0', reps: '8' }, exercise, 'kg')).toEqual({
      kind: 'valid',
      weightKg: null,
      reps: 8,
    });
  });

  it('still rejects a negative added load', () => {
    expect(validateSet({ localId: 1, weight: '-5', reps: '8' }, exercise, 'kg').kind).toBe(
      'invalid',
    );
  });
});

describe('validateDraft', () => {
  it('produces rows with sequential orders', () => {
    const draft = draftWith(BENCH, [
      ['80', '8'],
      ['82.5', '6'],
      ['85', '4'],
    ]);
    const { rows, setErrors, workoutError } = validateDraft(draft, 'kg');

    expect(setErrors.size).toBe(0);
    expect(workoutError).toBeUndefined();
    expect(rows).toEqual({
      date: '2026-10-01',
      name: 'Push',
      notes: null,
      exercises: [
        {
          exerciseId: 1,
          sortOrder: 0,
          sets: [
            { weightKg: 80, reps: 8, setOrder: 0 },
            { weightKg: 82.5, reps: 6, setOrder: 1 },
            { weightKg: 85, reps: 4, setOrder: 2 },
          ],
        },
      ],
    });
  });

  it('drops blank sets silently and keeps the rest contiguous', () => {
    const draft = draftWith(BENCH, [
      ['80', '8'],
      ['', ''],
      ['85', '4'],
    ]);
    const { rows, setErrors } = validateDraft(draft, 'kg');

    expect(setErrors.size).toBe(0);
    expect(rows?.exercises[0]!.sets).toEqual([
      { weightKg: 80, reps: 8, setOrder: 0 },
      { weightKg: 85, reps: 4, setOrder: 1 },
    ]);
  });

  it('reports a partial set and refuses to produce rows', () => {
    const draft = draftWith(BENCH, [
      ['80', '8'],
      ['85', ''],
    ]);
    const { rows, setErrors } = validateDraft(draft, 'kg');

    expect(rows).toBeNull();
    expect(setErrors.size).toBe(1);
    expect([...setErrors.values()]).toEqual(['Add reps']);
  });

  it('refuses an entirely empty workout', () => {
    expect(validateDraft(createDraft(), 'kg').workoutError).toBe(
      'Log at least one set before finishing',
    );
  });

  it('refuses a workout whose only exercise has no usable sets', () => {
    const draft = draftWith(BENCH, [['', '']]);
    const result = validateDraft(draft, 'kg');
    expect(result.rows).toBeNull();
    expect(result.workoutError).toBeDefined();
  });

  it('drops an exercise with no sets but keeps its siblings, renumbering sortOrder', () => {
    let draft = draftWith(BENCH, [['80', '8']]);
    draft = draftReducer(draft, { type: 'addExercise', exercise: PULLUP });
    // The pull-up is left blank.
    draft = draftReducer(draft, {
      type: 'addExercise',
      exercise: { ...BENCH, exerciseId: 3, name: 'Row' },
    });
    const rowLocalId = draft.exercises[2]!.localId;
    draft = draftReducer(draft, {
      type: 'updateSet',
      exerciseLocalId: rowLocalId,
      setLocalId: draft.exercises[2]!.sets[0]!.localId,
      patch: { weight: '60', reps: '10' },
    });

    const { rows } = validateDraft(draft, 'kg');
    expect(rows?.exercises.map((exercise) => [exercise.exerciseId, exercise.sortOrder])).toEqual([
      [1, 0],
      [3, 1],
    ]);
  });

  it('trims the name and notes, storing blanks as null', () => {
    let draft = draftWith(BENCH, [['80', '8']]);
    draft = draftReducer(draft, { type: 'setName', name: '  Push  ' });
    draft = draftReducer(draft, { type: 'setNotes', notes: '   ' });

    const { rows } = validateDraft(draft, 'kg');
    expect(rows?.name).toBe('Push');
    expect(rows?.notes).toBeNull();
  });

  it('converts pounds for storage while leaving the draft text alone', () => {
    const draft = draftWith(BENCH, [['160', '8']]);
    const { rows } = validateDraft(draft, 'lb');
    expect(rows?.exercises[0]!.sets[0]!.weightKg).toBeCloseTo(72.5748, 3);
    expect(draft.exercises[0]!.sets[0]!.weight).toBe('160');
  });
});

describe('countValidSets', () => {
  it('counts only usable sets', () => {
    const draft = draftWith(BENCH, [
      ['80', '8'],
      ['', ''],
      ['85', ''],
      ['90', '3'],
    ]);
    expect(countValidSets(draft, 'kg')).toBe(2);
  });
});

describe('draftFromWorkout round trip', () => {
  const detail: WorkoutDetail = {
    id: 7,
    date: '2026-09-28',
    name: 'Pull',
    notes: 'good session',
    exercises: [
      {
        workoutExerciseId: 10,
        exerciseId: 2,
        name: 'Pull-Up',
        muscleGroup: 'back',
        isBodyweight: true,
        isArchived: false,
        sortOrder: 0,
        sets: [
          { id: 1, weightKg: null, reps: 10, setOrder: 0 },
          { id: 2, weightKg: 10, reps: 8, setOrder: 1 },
        ],
      },
      {
        workoutExerciseId: 11,
        exerciseId: 3,
        name: 'Barbell Row',
        muscleGroup: 'back',
        isBodyweight: false,
        isArchived: false,
        sortOrder: 1,
        sets: [{ id: 3, weightKg: 70, reps: 8, setOrder: 0 }],
      },
    ],
  };

  it('loads a finished workout into an editable draft', () => {
    const draft = draftFromWorkout(detail, 'kg');

    expect(draft.workoutId).toBe(7);
    expect(draft.date).toBe('2026-09-28');
    expect(draft.name).toBe('Pull');
    expect(draft.notes).toBe('good session');
    expect(draft.exercises[0]!.sets.map((set) => set.weight)).toEqual(['', '10']);
    expect(draft.exercises[0]!.sets.map((set) => set.reps)).toEqual(['10', '8']);
  });

  it('round-trips back to the same rows', () => {
    const { rows } = validateDraft(draftFromWorkout(detail, 'kg'), 'kg');

    expect(rows).toEqual({
      date: '2026-09-28',
      name: 'Pull',
      notes: 'good session',
      exercises: [
        {
          exerciseId: 2,
          sortOrder: 0,
          sets: [
            { weightKg: null, reps: 10, setOrder: 0 },
            { weightKg: 10, reps: 8, setOrder: 1 },
          ],
        },
        { exerciseId: 3, sortOrder: 1, sets: [{ weightKg: 70, reps: 8, setOrder: 0 }] },
      ],
    });
  });

  it('round-trips through pounds without corrupting the stored kg', () => {
    const { rows } = validateDraft(draftFromWorkout(detail, 'lb'), 'lb');
    const sets = rows!.exercises.flatMap((exercise) => exercise.sets);

    expect(sets[0]!.weightKg).toBeNull();
    expect(sets[1]!.weightKg).toBeCloseTo(10, 1);
    expect(sets[2]!.weightKg).toBeCloseTo(70, 1);
  });

  it('gives every loaded set a unique localId', () => {
    const draft = draftFromWorkout(detail, 'kg');
    const ids = draft.exercises.flatMap((exercise) => [
      exercise.localId,
      ...exercise.sets.map((set) => set.localId),
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Math.max(...ids)).toBeLessThan(draft.nextLocalId);
  });
});
