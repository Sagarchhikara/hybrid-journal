import { describe, expect, it } from 'vitest';

import { createDraft, draftReducer, isUntouched, type WorkoutDraft } from '@/features/gym/draft';
import { validateDraft } from '@/features/gym/draft-rows';
import { deserializeDraft, serializeDraft } from '@/features/gym/draft-serialize';

const BENCH = { exerciseId: 1, name: 'Barbell Bench Press', isBodyweight: false };

const LAST_SETS = [
  { weight: '72.5', reps: '6', isDropSet: false },
  { weight: '70', reps: '8', isDropSet: false },
];

function fresh(): WorkoutDraft {
  return draftReducer(createDraft({ date: '2026-10-01', name: 'Push' }), {
    type: 'addExercise',
    exercise: BENCH,
  });
}

function recalled(): WorkoutDraft {
  const draft = fresh();
  return draftReducer(draft, {
    type: 'fillFromLast',
    exerciseLocalId: draft.exercises[0]!.localId,
    sets: LAST_SETS,
    recalled: true,
  });
}

describe('isUntouched', () => {
  it('is true for a freshly added exercise', () => {
    expect(isUntouched(fresh().exercises[0]!)).toBe(true);
  });

  it('is true when every set is recalled but unedited', () => {
    expect(isUntouched(recalled().exercises[0]!)).toBe(true);
  });

  it('is false once a set has been edited', () => {
    const draft = recalled();
    const exerciseLocalId = draft.exercises[0]!.localId;
    const edited = draftReducer(draft, {
      type: 'updateSet',
      exerciseLocalId,
      setLocalId: draft.exercises[0]!.sets[0]!.localId,
      patch: { weight: '75' },
    });

    expect(isUntouched(edited.exercises[0]!)).toBe(false);
  });
});

describe('sets recalled from last session', () => {
  it('arrive with last session values, marked recalled', () => {
    const sets = recalled().exercises[0]!.sets;

    expect(sets.map((set) => `${set.weight}x${set.reps}`)).toEqual(['72.5x6', '70x8']);
    expect(sets.every((set) => set.isRecalled)).toBe(true);
  });

  it('are logged as they stand if Finish runs without touching them', () => {
    // The point of dropping the Fill from last button: repeating a workout is the
    // default, so an untouched card is a confirmation, not an empty form.
    const rows = validateDraft(recalled(), 'kg').rows;

    expect(rows!.exercises[0]!.sets).toEqual([
      { weightKg: 72.5, reps: 6, setOrder: 0, isDropSet: false },
      { weightKg: 70, reps: 8, setOrder: 1, isDropSet: false },
    ]);
  });

  it('stop being recalled once edited, one set at a time', () => {
    const draft = recalled();
    const exerciseLocalId = draft.exercises[0]!.localId;
    const edited = draftReducer(draft, {
      type: 'updateSet',
      exerciseLocalId,
      setLocalId: draft.exercises[0]!.sets[0]!.localId,
      patch: { weight: '75' },
    });

    // Only the row that was touched turns solid; the other stays light.
    expect(edited.exercises[0]!.sets.map((set) => set.isRecalled)).toEqual([false, true]);
  });

  it('counts clearing a weight as an edit', () => {
    const draft = recalled();
    const exerciseLocalId = draft.exercises[0]!.localId;
    const cleared = draftReducer(draft, {
      type: 'clearSetWeight',
      exerciseLocalId,
      setLocalId: draft.exercises[0]!.sets[0]!.localId,
    });

    expect(cleared.exercises[0]!.sets[0]!.isRecalled).toBe(false);
  });

  it('fills without the recalled mark when the flag is not asked for', () => {
    const draft = fresh();
    const filled = draftReducer(draft, {
      type: 'fillFromLast',
      exerciseLocalId: draft.exercises[0]!.localId,
      sets: LAST_SETS,
    });

    expect(filled.exercises[0]!.sets.every((set) => set.isRecalled)).toBe(false);
  });

  it('reproduces a drop set from last time as a drop', () => {
    const draft = fresh();
    const filled = draftReducer(draft, {
      type: 'fillFromLast',
      exerciseLocalId: draft.exercises[0]!.localId,
      sets: [
        { weight: '80', reps: '8', isDropSet: false },
        { weight: '60', reps: '6', isDropSet: true },
      ],
      recalled: true,
    });

    expect(filled.exercises[0]!.sets.map((set) => set.isDropSet)).toEqual([false, true]);
  });

  it('stays recalled across a save and reload of the draft', () => {
    // Killing the app mid-workout must not silently promote light rows to confirmed.
    const restored = deserializeDraft(serializeDraft(recalled()));
    expect(restored!.exercises[0]!.sets.every((set) => set.isRecalled)).toBe(true);
  });
});
