import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/client';
import {
  archiveExercise,
  countExerciseUsage,
  createOrGetExercise,
  findExerciseByName,
  getRecentExerciseIds,
  renameExercise,
  restoreExercise,
  searchExercises,
  setExerciseBodyweight,
} from '@/db/queries/exercises';
import { saveWorkout } from '@/db/queries/gym';
import { exercises } from '@/db/schema';
import { seedExerciseLibrary } from '@/db/seed';

import { applyMigrations, resetTables } from './support/test-db';

beforeAll(applyMigrations);

let benchId = 0;
let rowId = 0;

beforeEach(async () => {
  resetTables();
  await seedExerciseLibrary();
  const library = await db.select({ id: exercises.id, name: exercises.name }).from(exercises);
  const byName = new Map(library.map((row) => [row.name, row.id]));
  benchId = byName.get('Barbell Bench Press')!;
  rowId = byName.get('Barbell Row')!;
});

describe('searchExercises', () => {
  it('matches a substring regardless of case, since the column is NOCASE', async () => {
    for (const term of ['bench', 'BENCH', 'BeNcH']) {
      const results = await searchExercises({ query: term });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((exercise) => /bench/i.test(exercise.name))).toBe(true);
    }
  });

  it('matches in the middle of a name', async () => {
    const results = await searchExercises({ query: 'press' });
    const names = results.map((exercise) => exercise.name);
    expect(names).toContain('Overhead Press');
    expect(names).toContain('Barbell Bench Press');
  });

  it('returns results alphabetically', async () => {
    const names = (await searchExercises()).map((exercise) => exercise.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('filters by muscle group', async () => {
    const results = await searchExercises({ muscleGroup: 'biceps' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((exercise) => exercise.muscleGroup === 'biceps')).toBe(true);
  });

  it('combines a query with a muscle group', async () => {
    const results = await searchExercises({ query: 'curl', muscleGroup: 'biceps' });
    expect(results.every((exercise) => /curl/i.test(exercise.name))).toBe(true);
    expect(results.every((exercise) => exercise.muscleGroup === 'biceps')).toBe(true);
  });

  it('hides archived exercises by default and reveals them on request', async () => {
    await archiveExercise(benchId);

    // Substring search also matches 'Incline Barbell Bench Press', so compare exactly.
    const exact = (list: { name: string }[]) =>
      list.filter((exercise) => exercise.name === 'Barbell Bench Press');

    expect(exact(await searchExercises({ query: 'Barbell Bench Press' }))).toHaveLength(0);
    expect(
      exact(await searchExercises({ query: 'Barbell Bench Press', includeArchived: true })),
    ).toHaveLength(1);
  });

  it('treats a wildcard typed by the user as a literal, not a pattern', async () => {
    // Without escaping, '%' would match everything.
    expect(await searchExercises({ query: '%' })).toHaveLength(0);
    expect(await searchExercises({ query: '_' })).toHaveLength(0);
  });

  it('returns everything for a blank query', async () => {
    const all = await searchExercises({ query: '   ' });
    expect(all.length).toBeGreaterThan(30);
  });
});

describe('createOrGetExercise resolves duplicates instead of erroring', () => {
  it('creates a new exercise flagged as custom', async () => {
    const result = await createOrGetExercise({ name: 'Zercher Squat', muscleGroup: 'quads' });

    expect(result.created).toBe(true);
    expect(result.exercise.name).toBe('Zercher Squat');
    expect(result.exercise.isCustom).toBe(true);
  });

  it('returns the existing exercise for a different case', async () => {
    const result = await createOrGetExercise({
      name: 'barbell bench press',
      muscleGroup: 'chest',
    });

    expect(result.created).toBe(false);
    expect(result.exercise.id).toBe(benchId);
    expect(result.exercise.name).toBe('Barbell Bench Press');
  });

  it('resolves "bench  press" with extra spaces to the existing Bench Press', async () => {
    // The spec's acceptance case: normalisation collapses whitespace, NOCASE handles case.
    await createOrGetExercise({ name: 'Bench Press', muscleGroup: 'chest' });
    const result = await createOrGetExercise({ name: '  bench   press  ', muscleGroup: 'chest' });

    expect(result.created).toBe(false);
    expect(result.exercise.name).toBe('Bench Press');

    const all = await searchExercises({ query: 'Bench Press' });
    expect(all.filter((exercise) => exercise.name === 'Bench Press')).toHaveLength(1);
  });

  it('never creates a second row for a duplicate name', async () => {
    const before = (await db.select().from(exercises)).length;
    await createOrGetExercise({ name: 'DEADLIFT', muscleGroup: 'back' });
    await createOrGetExercise({ name: 'deadlift', muscleGroup: 'back' });
    expect((await db.select().from(exercises)).length).toBe(before);
  });

  it('restores an archived match rather than leaving the user stuck', async () => {
    await archiveExercise(benchId);
    const result = await createOrGetExercise({
      name: 'Barbell Bench Press',
      muscleGroup: 'chest',
    });

    expect(result.created).toBe(false);
    expect(result.restored).toBe(true);
    expect(result.exercise.archivedAt).toBeNull();

    const exact = (await searchExercises({ query: 'Barbell Bench Press' })).filter(
      (exercise) => exercise.name === 'Barbell Bench Press',
    );
    expect(exact).toHaveLength(1);
  });

  it('keeps the stored bodyweight flag when restoring, ignoring whatever was passed in', async () => {
    const pullUp = await findExerciseByName('Pull-Up');
    expect(pullUp?.isBodyweight).toBe(true);

    await archiveExercise(pullUp!.id);

    // The caller supplies the opposite flag; the stored one must win, because the row
    // already carries the user's own answer to that question.
    const result = await createOrGetExercise({
      name: 'pull-up',
      muscleGroup: 'chest',
      isBodyweight: false,
    });

    expect(result.restored).toBe(true);
    expect(result.created).toBe(false);
    expect(result.exercise.id).toBe(pullUp!.id);
    expect(result.exercise.isBodyweight).toBe(true);
    expect((await findExerciseByName('Pull-Up'))?.isBodyweight).toBe(true);
  });

  it('keeps a false stored flag on restore too', async () => {
    expect((await findExerciseByName('Barbell Bench Press'))?.isBodyweight).toBe(false);
    await archiveExercise(benchId);

    const result = await createOrGetExercise({
      name: 'Barbell Bench Press',
      muscleGroup: 'chest',
      isBodyweight: true,
    });

    expect(result.restored).toBe(true);
    expect(result.exercise.isBodyweight).toBe(false);
  });

  it('does not change the muscle group of a restored exercise either', async () => {
    const pullUp = await findExerciseByName('Pull-Up');
    expect(pullUp?.muscleGroup).toBe('back');
    await archiveExercise(pullUp!.id);

    const result = await createOrGetExercise({ name: 'Pull-Up', muscleGroup: 'chest' });
    expect(result.exercise.muscleGroup).toBe('back');
  });

  it('can create a bodyweight exercise', async () => {
    const result = await createOrGetExercise({
      name: 'Ring Dip',
      muscleGroup: 'triceps',
      isBodyweight: true,
    });
    expect(result.exercise.isBodyweight).toBe(true);
  });

  it('rejects a name that is only whitespace', async () => {
    await expect(createOrGetExercise({ name: '   ', muscleGroup: 'chest' })).rejects.toThrow();
  });
});

describe('renameExercise', () => {
  it('renames with normalisation', async () => {
    const result = await renameExercise(benchId, '  Flat   Barbell Bench  ');
    expect(result.status).toBe('renamed');
    if (result.status === 'renamed') expect(result.exercise.name).toBe('Flat Barbell Bench');
  });

  it('reports a clash instead of merging two lifts together', async () => {
    const result = await renameExercise(benchId, 'barbell row');

    expect(result.status).toBe('taken');
    if (result.status === 'taken') expect(result.existing.id).toBe(rowId);

    // Nothing changed.
    expect((await findExerciseByName('Barbell Bench Press'))?.id).toBe(benchId);
  });

  it('allows a case-only change to the same exercise', async () => {
    const result = await renameExercise(benchId, 'BARBELL BENCH PRESS');
    expect(result.status).toBe('renamed');
    if (result.status === 'renamed') expect(result.exercise.name).toBe('BARBELL BENCH PRESS');
  });

  it('reports an unchanged name without writing', async () => {
    const result = await renameExercise(benchId, 'Barbell Bench Press');
    expect(result.status).toBe('unchanged');
  });

  it('can rename a seeded exercise, not only a custom one', async () => {
    expect((await findExerciseByName('Barbell Bench Press'))?.isCustom).toBe(false);
    expect((await renameExercise(benchId, 'Bench')).status).toBe('renamed');
  });

  it('rejects an empty name', async () => {
    await expect(renameExercise(benchId, '  ')).rejects.toThrow();
  });
});

describe('archive and restore', () => {
  it('archives and restores', async () => {
    await archiveExercise(benchId);
    expect((await findExerciseByName('Barbell Bench Press'))?.archivedAt).toBeInstanceOf(Date);

    await restoreExercise(benchId);
    expect((await findExerciseByName('Barbell Bench Press'))?.archivedAt).toBeNull();
  });

  it('keeps an archived exercise usable in past workouts', async () => {
    await saveWorkout({
      date: '2026-09-27',
      name: 'Push',
      notes: null,
      exercises: [
        { exerciseId: benchId, sortOrder: 0, sets: [{ weightKg: 80, reps: 8, setOrder: 0 }] },
      ],
    });
    await archiveExercise(benchId);

    expect(await countExerciseUsage(benchId)).toBe(1);
  });
});

describe('setExerciseBodyweight', () => {
  it('can be toggled from the library screen', async () => {
    await setExerciseBodyweight(benchId, true);
    expect((await findExerciseByName('Barbell Bench Press'))?.isBodyweight).toBe(true);

    await setExerciseBodyweight(benchId, false);
    expect((await findExerciseByName('Barbell Bench Press'))?.isBodyweight).toBe(false);
  });
});

describe('getRecentExerciseIds', () => {
  it('lists the most recently trained exercises first', async () => {
    await saveWorkout({
      date: '2026-09-20',
      name: 'Push',
      notes: null,
      exercises: [
        { exerciseId: benchId, sortOrder: 0, sets: [{ weightKg: 80, reps: 8, setOrder: 0 }] },
      ],
    });
    await saveWorkout({
      date: '2026-09-27',
      name: 'Pull',
      notes: null,
      exercises: [
        { exerciseId: rowId, sortOrder: 0, sets: [{ weightKg: 60, reps: 10, setOrder: 0 }] },
      ],
    });

    expect(await getRecentExerciseIds()).toEqual([rowId, benchId]);
  });

  it('omits archived exercises', async () => {
    await saveWorkout({
      date: '2026-09-27',
      name: 'Push',
      notes: null,
      exercises: [
        { exerciseId: benchId, sortOrder: 0, sets: [{ weightKg: 80, reps: 8, setOrder: 0 }] },
      ],
    });
    await archiveExercise(benchId);

    expect(await getRecentExerciseIds()).toEqual([]);
  });

  it('lists each exercise once and honours the limit', async () => {
    for (const date of ['2026-09-20', '2026-09-24', '2026-09-27']) {
      await saveWorkout({
        date,
        name: 'Push',
        notes: null,
        exercises: [
          { exerciseId: benchId, sortOrder: 0, sets: [{ weightKg: 80, reps: 8, setOrder: 0 }] },
          { exerciseId: rowId, sortOrder: 1, sets: [{ weightKg: 60, reps: 8, setOrder: 0 }] },
        ],
      });
    }

    expect((await getRecentExerciseIds()).length).toBe(2);
    expect(new Set(await getRecentExerciseIds())).toEqual(new Set([benchId, rowId]));
    expect(await getRecentExerciseIds(1)).toHaveLength(1);
  });

  it('is empty with no workouts', async () => {
    expect(await getRecentExerciseIds()).toEqual([]);
  });
});
