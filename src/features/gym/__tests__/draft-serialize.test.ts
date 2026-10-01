import { describe, expect, it } from 'vitest';

import { createDraft, draftReducer, type WorkoutDraft } from '../draft';
import { deserializeDraft, DRAFT_VERSION, serializeDraft } from '../draft-serialize';

function sample(): WorkoutDraft {
  let draft = createDraft({ date: '2026-10-01', name: 'Push' });
  draft = draftReducer(draft, {
    type: 'addExercise',
    exercise: { exerciseId: 1, name: 'Barbell Bench Press', isBodyweight: false },
  });
  draft = draftReducer(draft, {
    type: 'addExercise',
    exercise: { exerciseId: 2, name: 'Pull-Up', isBodyweight: true },
  });
  const bench = draft.exercises[0]!.localId;
  draft = draftReducer(draft, {
    type: 'updateSet',
    exerciseLocalId: bench,
    setLocalId: draft.exercises[0]!.sets[0]!.localId,
    patch: { weight: '80', reps: '8' },
  });
  return draftReducer(draft, { type: 'setNotes', notes: 'felt good' });
}

describe('serialize round trip', () => {
  it('restores an identical draft', () => {
    const draft = sample();
    expect(deserializeDraft(serializeDraft(draft))).toEqual(draft);
  });

  it('keeps partial text exactly as typed', () => {
    let draft = createDraft({ date: '2026-10-01' });
    draft = draftReducer(draft, {
      type: 'addExercise',
      exercise: { exerciseId: 1, name: 'Squat', isBodyweight: false },
    });
    draft = draftReducer(draft, {
      type: 'updateSet',
      exerciseLocalId: draft.exercises[0]!.localId,
      setLocalId: draft.exercises[0]!.sets[0]!.localId,
      patch: { weight: '72.', reps: '' },
    });

    const restored = deserializeDraft(serializeDraft(draft));
    expect(restored?.exercises[0]!.sets[0]!.weight).toBe('72.');
  });

  it('restores an edit-mode draft with its workoutId', () => {
    const draft = { ...sample(), workoutId: 42 };
    expect(deserializeDraft(serializeDraft(draft))?.workoutId).toBe(42);
  });

  it('preserves the bodyweight flag per exercise', () => {
    const restored = deserializeDraft(serializeDraft(sample()));
    expect(restored?.exercises.map((exercise) => exercise.isBodyweight)).toEqual([false, true]);
  });
});

/**
 * Every case here would otherwise run on launch and could crash the app into a state only
 * a reinstall fixes, so each must return null rather than throw.
 */
describe('corrupt or hostile stored values are discarded, never thrown', () => {
  const badValues = [
    ['not json at all', 'plain text'],
    ['{', 'truncated object'],
    ['[]', 'an array'],
    ['null', 'literal null'],
    ['"a string"', 'a JSON string'],
    ['42', 'a number'],
    ['{}', 'empty object'],
    ['{"version":1}', 'no draft key'],
    ['{"draft":{}}', 'no version'],
    ['{"version":999,"draft":{}}', 'a future version'],
    ['{"version":1,"draft":{"date":"2026-10-01"}}', 'missing fields'],
    [
      '{"version":1,"draft":{"date":"nonsense","name":"","notes":"","nextLocalId":1,"exercises":[]}}',
      'an invalid date',
    ],
    [
      '{"version":1,"draft":{"date":"2026-10-01","name":"","notes":"","nextLocalId":1,"exercises":{}}}',
      'exercises not an array',
    ],
    [
      '{"version":1,"draft":{"date":"2026-10-01","name":"","notes":"","nextLocalId":1,"exercises":[null]}}',
      'a null exercise',
    ],
    [
      '{"version":1,"draft":{"date":"2026-10-01","name":"","notes":"","nextLocalId":1,"exercises":[{"localId":1,"exerciseId":1,"name":"X","sets":null}]}}',
      'sets not an array',
    ],
    [
      '{"version":1,"draft":{"date":"2026-10-01","name":"","notes":"","nextLocalId":1,"exercises":[{"localId":1,"exerciseId":1,"name":"X","sets":[{"localId":"a","weight":"1","reps":"1"}]}]}}',
      'a non-numeric set id',
    ],
    [
      '{"version":1,"draft":{"date":"2026-10-01","name":42,"notes":"","nextLocalId":1,"exercises":[]}}',
      'a numeric name',
    ],
    [
      '{"version":1,"draft":{"date":"2026-10-01","name":"","notes":"","nextLocalId":"x","exercises":[]}}',
      'a non-numeric counter',
    ],
  ] as const;

  for (const [value, description] of badValues) {
    it(`discards ${description}`, () => {
      expect(() => deserializeDraft(value)).not.toThrow();
      expect(deserializeDraft(value)).toBeNull();
    });
  }

  it('discards an empty or absent value', () => {
    expect(deserializeDraft('')).toBeNull();
    expect(deserializeDraft('   ')).toBeNull();
    expect(deserializeDraft(null)).toBeNull();
    expect(deserializeDraft(undefined)).toBeNull();
  });

  it('accepts a minimal but valid draft', () => {
    const value = JSON.stringify({
      version: DRAFT_VERSION,
      draft: {
        workoutId: null,
        date: '2026-10-01',
        name: '',
        notes: '',
        nextLocalId: 1,
        exercises: [],
      },
    });
    expect(deserializeDraft(value)).toMatchObject({ date: '2026-10-01', exercises: [] });
  });
});

describe('localId counter repair', () => {
  it('lifts a stale counter above every id in the payload, so new ids cannot collide', () => {
    const value = JSON.stringify({
      version: DRAFT_VERSION,
      draft: {
        workoutId: null,
        date: '2026-10-01',
        name: '',
        notes: '',
        // Deliberately behind the ids below.
        nextLocalId: 1,
        exercises: [
          {
            localId: 10,
            exerciseId: 1,
            name: 'X',
            isBodyweight: false,
            sets: [{ localId: 25, weight: '1', reps: '1' }],
          },
        ],
      },
    });

    const restored = deserializeDraft(value);
    expect(restored?.nextLocalId).toBe(26);

    // A new set now gets a fresh id rather than reusing 25.
    const next = draftReducer(restored!, { type: 'addSet', exerciseLocalId: 10 });
    const ids = next.exercises[0]!.sets.map((set) => set.localId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
