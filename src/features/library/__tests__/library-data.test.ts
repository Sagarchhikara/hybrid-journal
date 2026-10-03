import { describe, expect, it } from 'vitest';

import type { Exercise } from '@/db/schema';
import { bodyweightLock, splitLibrary } from '@/features/library/library-data';

function exercise(overrides: Partial<Exercise> & { id: number; name: string }): Exercise {
  return {
    muscleGroup: 'chest',
    isCustom: false,
    isBodyweight: false,
    archivedAt: null,
    ...overrides,
  } as Exercise;
}

describe('splitLibrary', () => {
  it('separates active from archived', () => {
    const { active, archived } = splitLibrary([
      exercise({ id: 1, name: 'Bench' }),
      exercise({ id: 2, name: 'Row', archivedAt: new Date(1_000) }),
      exercise({ id: 3, name: 'Squat' }),
    ]);

    expect(active.map((row) => row.name)).toEqual(['Bench', 'Squat']);
    expect(archived.map((row) => row.name)).toEqual(['Row']);
  });

  it('keeps the query ordering inside each section', () => {
    const { active } = splitLibrary([
      exercise({ id: 1, name: 'Arnold Press' }),
      exercise({ id: 2, name: 'Zercher Squat' }),
      exercise({ id: 3, name: 'Bench' }),
    ]);

    // Not re-sorted: searchExercises already ordered these.
    expect(active.map((row) => row.name)).toEqual(['Arnold Press', 'Zercher Squat', 'Bench']);
  });

  it('handles an all-archived library and an empty one', () => {
    const allArchived = splitLibrary([exercise({ id: 1, name: 'Dip', archivedAt: new Date(1) })]);
    expect(allArchived.active).toEqual([]);
    expect(allArchived.archived).toHaveLength(1);

    const empty = splitLibrary([]);
    expect(empty.active).toEqual([]);
    expect(empty.archived).toEqual([]);
  });
});

describe('bodyweightLock', () => {
  it('allows the flag to be set while nothing is logged', () => {
    expect(bodyweightLock(0)).toEqual({ editable: true });
  });

  it('freezes the flag once a single set exists, and says why', () => {
    const lock = bodyweightLock(1);

    expect(lock.editable).toBe(false);
    // Singular, because "1 sets read" in the UI is the kind of thing people notice.
    expect(lock.reason).toContain('1 set reads');
  });

  it('pluralises the count', () => {
    expect(bodyweightLock(12).reason).toContain('12 sets read');
  });
});
