import { describe, expect, it } from 'vitest';

import {
  createDraft,
  draftReducer,
  hasTypedSets,
  isDraftEmpty,
  isSetBlank,
  type DraftAction,
  type WorkoutDraft,
} from '../draft';

const BENCH = { exerciseId: 1, name: 'Barbell Bench Press', isBodyweight: false };
const PULLUP = { exerciseId: 2, name: 'Pull-Up', isBodyweight: true };
const ROW = { exerciseId: 3, name: 'Barbell Row', isBodyweight: false };

function reduce(draft: WorkoutDraft, ...actions: DraftAction[]): WorkoutDraft {
  return actions.reduce(draftReducer, draft);
}

function withBench(): WorkoutDraft {
  return reduce(createDraft({ date: '2026-10-01', name: 'Push' }), {
    type: 'addExercise',
    exercise: BENCH,
  });
}

describe('createDraft', () => {
  it('starts empty on the given date', () => {
    const draft = createDraft({ date: '2026-10-01', name: 'Push' });
    expect(draft).toMatchObject({
      workoutId: null,
      date: '2026-10-01',
      name: 'Push',
      notes: '',
      exercises: [],
    });
    expect(isDraftEmpty(draft)).toBe(true);
  });
});

describe('field actions', () => {
  it('sets name, date and notes', () => {
    const draft = reduce(
      createDraft(),
      { type: 'setName', name: 'Legs' },
      { type: 'setDate', date: '2026-09-28' },
      { type: 'setNotes', notes: 'felt strong' },
    );
    expect(draft).toMatchObject({ name: 'Legs', date: '2026-09-28', notes: 'felt strong' });
  });
});

describe('addExercise', () => {
  it('appends with one empty set ready to type into', () => {
    const draft = withBench();
    expect(draft.exercises).toHaveLength(1);
    expect(draft.exercises[0]).toMatchObject({ exerciseId: 1, name: 'Barbell Bench Press' });
    expect(draft.exercises[0]!.sets).toHaveLength(1);
    expect(isSetBlank(draft.exercises[0]!.sets[0]!)).toBe(true);
  });

  it('keeps every localId unique across exercises and sets', () => {
    const draft = reduce(
      createDraft(),
      { type: 'addExercise', exercise: BENCH },
      { type: 'addExercise', exercise: PULLUP },
      { type: 'addExercise', exercise: ROW },
    );

    const ids = draft.exercises.flatMap((exercise) => [
      exercise.localId,
      ...exercise.sets.map((set) => set.localId),
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Math.max(...ids)).toBeLessThan(draft.nextLocalId);
  });

  it('allows the same exercise twice, for a second round later in the session', () => {
    const draft = reduce(
      createDraft(),
      { type: 'addExercise', exercise: BENCH },
      { type: 'addExercise', exercise: BENCH },
    );
    expect(draft.exercises).toHaveLength(2);
    expect(draft.exercises[0]!.localId).not.toBe(draft.exercises[1]!.localId);
  });
});

describe('removeExercise', () => {
  it('removes only the targeted one', () => {
    const draft = reduce(
      createDraft(),
      { type: 'addExercise', exercise: BENCH },
      { type: 'addExercise', exercise: PULLUP },
    );
    const next = draftReducer(draft, {
      type: 'removeExercise',
      exerciseLocalId: draft.exercises[0]!.localId,
    });
    expect(next.exercises.map((e) => e.exerciseId)).toEqual([2]);
  });

  it('ignores an unknown id', () => {
    const draft = withBench();
    expect(draftReducer(draft, { type: 'removeExercise', exerciseLocalId: 999 })).toEqual(draft);
  });
});

describe('moveExercise', () => {
  function three(): WorkoutDraft {
    return reduce(
      createDraft(),
      { type: 'addExercise', exercise: BENCH },
      { type: 'addExercise', exercise: PULLUP },
      { type: 'addExercise', exercise: ROW },
    );
  }

  it('moves up and down', () => {
    const draft = three();
    const second = draft.exercises[1]!.localId;

    expect(
      draftReducer(draft, {
        type: 'moveExercise',
        exerciseLocalId: second,
        direction: -1,
      }).exercises.map((e) => e.exerciseId),
    ).toEqual([2, 1, 3]);

    expect(
      draftReducer(draft, {
        type: 'moveExercise',
        exerciseLocalId: second,
        direction: 1,
      }).exercises.map((e) => e.exerciseId),
    ).toEqual([1, 3, 2]);
  });

  it('does nothing at the ends', () => {
    const draft = three();
    const first = draft.exercises[0]!.localId;
    const last = draft.exercises[2]!.localId;

    expect(
      draftReducer(draft, { type: 'moveExercise', exerciseLocalId: first, direction: -1 }),
    ).toEqual(draft);
    expect(
      draftReducer(draft, { type: 'moveExercise', exerciseLocalId: last, direction: 1 }),
    ).toEqual(draft);
  });

  it('keeps every exercise when moving', () => {
    const draft = three();
    const moved = draftReducer(draft, {
      type: 'moveExercise',
      exerciseLocalId: draft.exercises[0]!.localId,
      direction: 1,
    });
    expect(moved.exercises).toHaveLength(3);
    expect(new Set(moved.exercises.map((e) => e.exerciseId))).toEqual(new Set([1, 2, 3]));
  });
});

describe('addSet', () => {
  it('copies the previous set in this exercise, which is the common case', () => {
    const base = withBench();
    const exerciseLocalId = base.exercises[0]!.localId;
    const firstSet = base.exercises[0]!.sets[0]!.localId;

    const draft = reduce(
      base,
      {
        type: 'updateSet',
        exerciseLocalId,
        setLocalId: firstSet,
        patch: { weight: '80', reps: '8' },
      },
      { type: 'addSet', exerciseLocalId },
    );

    expect(draft.exercises[0]!.sets).toHaveLength(2);
    expect(draft.exercises[0]!.sets[1]).toMatchObject({ weight: '80', reps: '8' });
  });

  it('uses the fallback when the previous set is blank', () => {
    const base = withBench();
    const draft = draftReducer(base, {
      type: 'addSet',
      exerciseLocalId: base.exercises[0]!.localId,
      fallback: { weight: '72.5', reps: '6' },
    });
    expect(draft.exercises[0]!.sets[1]).toMatchObject({ weight: '72.5', reps: '6' });
  });

  it('adds a blank set when there is nothing to copy and no fallback', () => {
    const base = withBench();
    const draft = draftReducer(base, {
      type: 'addSet',
      exerciseLocalId: base.exercises[0]!.localId,
    });
    expect(isSetBlank(draft.exercises[0]!.sets[1]!)).toBe(true);
  });

  it('ignores an unknown exercise', () => {
    const draft = withBench();
    expect(draftReducer(draft, { type: 'addSet', exerciseLocalId: 999 })).toEqual(draft);
  });
});

describe('updateSet and clearSetWeight', () => {
  it('patches only the named field of the named set', () => {
    const base = reduce(withBench(), {
      type: 'addSet',
      exerciseLocalId: 1,
      fallback: { weight: '60', reps: '10' },
    });
    const exerciseLocalId = base.exercises[0]!.localId;
    const target = base.exercises[0]!.sets[0]!.localId;

    const draft = draftReducer(base, {
      type: 'updateSet',
      exerciseLocalId,
      setLocalId: target,
      patch: { reps: '12' },
    });

    expect(draft.exercises[0]!.sets[0]).toMatchObject({ weight: '', reps: '12' });
    expect(draft.exercises[0]!.sets[1]).toMatchObject({ weight: '60', reps: '10' });
  });

  it('clears the weight for a bodyweight set without touching reps', () => {
    const base = reduce(createDraft(), { type: 'addExercise', exercise: PULLUP });
    const exerciseLocalId = base.exercises[0]!.localId;
    const setLocalId = base.exercises[0]!.sets[0]!.localId;

    const draft = reduce(
      base,
      { type: 'updateSet', exerciseLocalId, setLocalId, patch: { weight: '10', reps: '8' } },
      { type: 'clearSetWeight', exerciseLocalId, setLocalId },
    );

    expect(draft.exercises[0]!.sets[0]).toMatchObject({ weight: '', reps: '8' });
  });
});

describe('removeSet and duplicateSet', () => {
  it('removes the named set', () => {
    const base = reduce(withBench(), { type: 'addSet', exerciseLocalId: 1 });
    const exerciseLocalId = base.exercises[0]!.localId;
    const draft = draftReducer(base, {
      type: 'removeSet',
      exerciseLocalId,
      setLocalId: base.exercises[0]!.sets[0]!.localId,
    });
    expect(draft.exercises[0]!.sets).toHaveLength(1);
  });

  it('duplicates immediately after the source, not at the end', () => {
    const base = withBench();
    const exerciseLocalId = base.exercises[0]!.localId;
    const first = base.exercises[0]!.sets[0]!.localId;

    const draft = reduce(
      base,
      { type: 'updateSet', exerciseLocalId, setLocalId: first, patch: { weight: '80', reps: '8' } },
      { type: 'addSet', exerciseLocalId },
      {
        type: 'updateSet',
        exerciseLocalId,
        setLocalId: 3,
        patch: { weight: '85', reps: '5' },
      },
      { type: 'duplicateSet', exerciseLocalId, setLocalId: first },
    );

    expect(draft.exercises[0]!.sets.map((set) => `${set.weight}x${set.reps}`)).toEqual([
      '80x8',
      '80x8',
      '85x5',
    ]);
  });

  it('gives the duplicate its own localId', () => {
    const base = withBench();
    const exerciseLocalId = base.exercises[0]!.localId;
    const first = base.exercises[0]!.sets[0]!.localId;
    const draft = draftReducer(base, {
      type: 'duplicateSet',
      exerciseLocalId,
      setLocalId: first,
    });
    const ids = draft.exercises[0]!.sets.map((set) => set.localId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('fillFromLast', () => {
  it('replaces the sets with the supplied ones', () => {
    const base = withBench();
    const exerciseLocalId = base.exercises[0]!.localId;

    const draft = draftReducer(base, {
      type: 'fillFromLast',
      exerciseLocalId,
      sets: [
        { weight: '72.5', reps: '6' },
        { weight: '70', reps: '8' },
        { weight: '70', reps: '8' },
      ],
    });

    expect(draft.exercises[0]!.sets).toHaveLength(3);
    expect(draft.exercises[0]!.sets.map((set) => `${set.weight}x${set.reps}`)).toEqual([
      '72.5x6',
      '70x8',
      '70x8',
    ]);
  });

  it('does nothing when given no sets', () => {
    const base = withBench();
    expect(
      draftReducer(base, {
        type: 'fillFromLast',
        exerciseLocalId: base.exercises[0]!.localId,
        sets: [],
      }),
    ).toEqual(base);
  });
});

describe('hasTypedSets', () => {
  it('is false for a fresh exercise and true once anything is entered', () => {
    const base = withBench();
    expect(hasTypedSets(base.exercises[0]!)).toBe(false);

    const typed = draftReducer(base, {
      type: 'updateSet',
      exerciseLocalId: base.exercises[0]!.localId,
      setLocalId: base.exercises[0]!.sets[0]!.localId,
      patch: { reps: '8' },
    });
    expect(hasTypedSets(typed.exercises[0]!)).toBe(true);
  });
});

describe('purity', () => {
  it('never mutates the draft it is given', () => {
    const draft = withBench();
    const snapshot = JSON.stringify(draft);

    draftReducer(draft, { type: 'addExercise', exercise: PULLUP });
    draftReducer(draft, { type: 'setNotes', notes: 'x' });
    draftReducer(draft, { type: 'addSet', exerciseLocalId: draft.exercises[0]!.localId });
    draftReducer(draft, {
      type: 'removeExercise',
      exerciseLocalId: draft.exercises[0]!.localId,
    });

    expect(JSON.stringify(draft)).toBe(snapshot);
  });
});
