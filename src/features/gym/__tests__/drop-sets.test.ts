import { describe, expect, it } from 'vitest';

import { createDraft, draftReducer, dropWeight, type WorkoutDraft } from '@/features/gym/draft';
import { validateDraft } from '@/features/gym/draft-rows';
import { deserializeDraft, serializeDraft } from '@/features/gym/draft-serialize';

const BENCH = { exerciseId: 1, name: 'Barbell Bench Press', isBodyweight: false };

/** A draft with one bench exercise whose single set is 80 × 8. */
function working(): WorkoutDraft {
  let draft = draftReducer(createDraft({ date: '2026-10-01', name: 'Push' }), {
    type: 'addExercise',
    exercise: BENCH,
  });
  const exerciseLocalId = draft.exercises[0]!.localId;
  return draftReducer(draft, {
    type: 'updateSet',
    exerciseLocalId,
    setLocalId: draft.exercises[0]!.sets[0]!.localId,
    patch: { weight: '80', reps: '8' },
  });
}

describe('dropWeight', () => {
  it('takes 20% off and rounds to a whole unit above 20', () => {
    expect(dropWeight('100')).toBe('80');
    expect(dropWeight('80')).toBe('64');
  });

  it('keeps half-unit precision below 20, where 2.5 is a big jump', () => {
    expect(dropWeight('20')).toBe('16');
    expect(dropWeight('15')).toBe('12');
    expect(dropWeight('10')).toBe('8');
    expect(dropWeight('11')).toBe('9');
  });

  it('gives nothing back for a bodyweight or unparseable set', () => {
    expect(dropWeight('')).toBe('');
    expect(dropWeight('   ')).toBe('');
    expect(dropWeight('0')).toBe('');
    expect(dropWeight('abc')).toBe('');
  });
});

describe('adding a drop set', () => {
  it('appends it lighter than the set above, with reps left open', () => {
    const draft = working();
    const exerciseLocalId = draft.exercises[0]!.localId;
    const next = draftReducer(draft, { type: 'addSet', exerciseLocalId, drop: true });

    const sets = next.exercises[0]!.sets;
    expect(sets).toHaveLength(2);
    expect(sets[1]!.isDropSet).toBe(true);
    expect(sets[1]!.weight).toBe('64');
    // You do not know how many reps a drop will give you until you do it.
    expect(sets[1]!.reps).toBe('');
  });

  it('leaves the set it follows alone', () => {
    const draft = working();
    const next = draftReducer(draft, {
      type: 'addSet',
      exerciseLocalId: draft.exercises[0]!.localId,
      drop: true,
    });

    expect(next.exercises[0]!.sets[0]!.isDropSet).toBe(false);
    expect(next.exercises[0]!.sets[0]!.weight).toBe('80');
  });

  it('can be toggled back into an ordinary set', () => {
    const draft = working();
    const exerciseLocalId = draft.exercises[0]!.localId;
    const withDrop = draftReducer(draft, { type: 'addSet', exerciseLocalId, drop: true });
    const dropId = withDrop.exercises[0]!.sets[1]!.localId;

    const off = draftReducer(withDrop, {
      type: 'toggleDropSet',
      exerciseLocalId,
      setLocalId: dropId,
    });
    expect(off.exercises[0]!.sets[1]!.isDropSet).toBe(false);

    const onAgain = draftReducer(off, {
      type: 'toggleDropSet',
      exerciseLocalId,
      setLocalId: dropId,
    });
    expect(onAgain.exercises[0]!.sets[1]!.isDropSet).toBe(true);
  });

  it('keeps the flag when the set is duplicated', () => {
    const draft = working();
    const exerciseLocalId = draft.exercises[0]!.localId;
    let next = draftReducer(draft, { type: 'addSet', exerciseLocalId, drop: true });
    const dropId = next.exercises[0]!.sets[1]!.localId;
    next = draftReducer(next, {
      type: 'updateSet',
      exerciseLocalId,
      setLocalId: dropId,
      patch: { reps: '5' },
    });
    next = draftReducer(next, { type: 'duplicateSet', exerciseLocalId, setLocalId: dropId });

    expect(next.exercises[0]!.sets.map((set) => set.isDropSet)).toEqual([false, true, true]);
  });
});

describe('a drop set on its way to the database', () => {
  it('reaches the rows as a drop', () => {
    const draft = working();
    const exerciseLocalId = draft.exercises[0]!.localId;
    let next = draftReducer(draft, { type: 'addSet', exerciseLocalId, drop: true });
    next = draftReducer(next, {
      type: 'updateSet',
      exerciseLocalId,
      setLocalId: next.exercises[0]!.sets[1]!.localId,
      patch: { reps: '6' },
    });

    const rows = validateDraft(next, 'kg').rows;
    expect(rows!.exercises[0]!.sets).toEqual([
      { weightKg: 80, reps: 8, setOrder: 0, isDropSet: false },
      { weightKg: 64, reps: 6, setOrder: 1, isDropSet: true },
    ]);
  });

  it('is validated like any other set, so a drop with no reps is rejected', () => {
    const draft = working();
    const next = draftReducer(draft, {
      type: 'addSet',
      exerciseLocalId: draft.exercises[0]!.localId,
      drop: true,
    });

    // Weight but no reps: incomplete rather than blank, so it must not pass silently.
    const result = validateDraft(next, 'kg');
    expect(result.rows).toBeNull();
    expect([...result.setErrors.values()]).toContain('Add reps');
  });

  it('survives being stored and read back', () => {
    const draft = working();
    const exerciseLocalId = draft.exercises[0]!.localId;
    const next = draftReducer(draft, { type: 'addSet', exerciseLocalId, drop: true });

    const restored = deserializeDraft(serializeDraft(next));
    expect(restored!.exercises[0]!.sets.map((set) => set.isDropSet)).toEqual([false, true]);
  });

  it('reads as not-a-drop in a draft stored before the flag existed', () => {
    // Forward compatibility: an in-progress workout saved by the previous build.
    const legacy = JSON.stringify({
      version: 1,
      draft: {
        workoutId: null,
        date: '2026-10-01',
        name: 'Push',
        notes: '',
        nextLocalId: 3,
        exercises: [
          {
            localId: 1,
            exerciseId: 1,
            name: 'Barbell Bench Press',
            isBodyweight: false,
            sets: [{ localId: 2, weight: '80', reps: '8' }],
          },
        ],
      },
    });

    const restored = deserializeDraft(legacy);
    expect(restored!.exercises[0]!.sets[0]!.isDropSet).toBe(false);
    expect(restored!.exercises[0]!.sets[0]!.isRecalled).toBe(false);
  });
});
