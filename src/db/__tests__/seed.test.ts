import { count, eq, isNotNull } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/client';
import { STARTER_EXERCISES } from '@/db/exercise-library';
import { archiveExercise, createOrGetExercise, renameExercise } from '@/db/queries/exercises';
import { exercises } from '@/db/schema';
import { seedExerciseLibrary } from '@/db/seed';

import { applyMigrations, resetTables } from './support/test-db';

beforeAll(applyMigrations);
beforeEach(resetTables);

async function libraryNames(): Promise<string[]> {
  const rows = await db.select({ name: exercises.name }).from(exercises);
  return rows.map((row) => row.name);
}

async function rowCount(): Promise<number> {
  const [row] = await db.select({ total: count() }).from(exercises);
  return row?.total ?? 0;
}

describe('the starter library itself', () => {
  it('covers the movement patterns a split is built from', async () => {
    await seedExerciseLibrary();
    const names = await libraryNames();
    const has = (fragment: string) =>
      names.some((name) => name.toLowerCase().includes(fragment.toLowerCase()));

    // One representative per pattern. Carries are the easy one to forget, since no
    // muscle group implies them the way 'quads' implies a squat.
    expect(has('Squat')).toBe(true);
    expect(has('Deadlift')).toBe(true);
    expect(has('Press')).toBe(true);
    expect(has('Row')).toBe(true);
    expect(has('Carry')).toBe(true);
    expect(has('Plank')).toBe(true);
  });

  it('holds about 40 lifts, with every muscle group represented', async () => {
    await seedExerciseLibrary();
    const rows = await db
      .select({ name: exercises.name, muscleGroup: exercises.muscleGroup })
      .from(exercises);

    expect(rows.length).toBeGreaterThanOrEqual(35);
    expect(rows.length).toBeLessThanOrEqual(45);
    expect(new Set(rows.map((row) => row.muscleGroup)).size).toBe(11);
  });

  it('names no lift twice, which the unique index would reject anyway', () => {
    const names = STARTER_EXERCISES.map((exercise) => exercise.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('seedExerciseLibrary first run', () => {
  it('inserts the whole library and reports how many', async () => {
    const inserted = await seedExerciseLibrary();

    expect(inserted).toBe(STARTER_EXERCISES.length);
    expect(await rowCount()).toBe(STARTER_EXERCISES.length);
  });

  it('flags exactly the bodyweight movements', async () => {
    await seedExerciseLibrary();
    const rows = await db
      .select({ name: exercises.name, isBodyweight: exercises.isBodyweight })
      .from(exercises);

    const flagged = rows
      .filter((row) => row.isBodyweight)
      .map((row) => row.name)
      .sort();
    expect(flagged).toEqual(['Dip', 'Hanging Leg Raise', 'Plank', 'Pull-Up', 'Push-Up']);
  });

  it('marks seeded rows as not custom and not archived', async () => {
    await seedExerciseLibrary();
    const rows = await db
      .select({ isCustom: exercises.isCustom, archivedAt: exercises.archivedAt })
      .from(exercises);

    expect(rows.every((row) => row.isCustom === false)).toBe(true);
    expect(rows.every((row) => row.archivedAt === null)).toBe(true);
  });
});

describe('seedExerciseLibrary is idempotent', () => {
  it('is a no-op on the second run', async () => {
    const first = await seedExerciseLibrary();
    const second = await seedExerciseLibrary();

    expect(first).toBe(STARTER_EXERCISES.length);
    expect(second).toBe(0);
    expect(await rowCount()).toBe(STARTER_EXERCISES.length);
  });

  it('duplicates nothing over many runs', async () => {
    await seedExerciseLibrary();
    for (let run = 0; run < 4; run += 1) await seedExerciseLibrary();

    const names = await libraryNames();
    expect(names.length).toBe(STARTER_EXERCISES.length);
    expect(new Set(names.map((name) => name.toLowerCase())).size).toBe(names.length);
  });

  it('leaves an archived seeded exercise archived', async () => {
    await seedExerciseLibrary();
    const [pullUp] = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(eq(exercises.name, 'Pull-Up'))
      .limit(1);

    await archiveExercise(pullUp!.id);
    expect(await seedExerciseLibrary()).toBe(0);

    // Re-seeding must not quietly hand back a lift the user put away.
    const archived = await db
      .select({ name: exercises.name })
      .from(exercises)
      .where(isNotNull(exercises.archivedAt));

    expect(archived.map((row) => row.name)).toEqual(['Pull-Up']);
    expect(await rowCount()).toBe(STARTER_EXERCISES.length);
  });

  it('does not re-create a renamed seeded exercise under its old name', async () => {
    await seedExerciseLibrary();
    const [squat] = await db
      .select({ id: exercises.id })
      .from(exercises)
      .where(eq(exercises.name, 'Back Squat'))
      .limit(1);

    const renamed = await renameExercise(squat!.id, 'Low Bar Back Squat');
    expect(renamed.status).toBe('renamed');

    expect(await seedExerciseLibrary()).toBe(0);

    const names = await libraryNames();
    // The old name must not reappear beside the new one: that would leave the user with
    // two rows for one lift and their history attached to only one of them.
    expect(names).not.toContain('Back Squat');
    expect(names).toContain('Low Bar Back Squat');
    expect(names.length).toBe(STARTER_EXERCISES.length);
  });

  it('skips seeding entirely when the table holds only a custom exercise', async () => {
    // The guard is "has any rows", not "has every starter row". This pins that, because
    // it is what makes the archive and rename cases above hold.
    await createOrGetExercise({ name: 'Zercher Squat', muscleGroup: 'quads' });

    expect(await seedExerciseLibrary()).toBe(0);
    expect(await libraryNames()).toEqual(['Zercher Squat']);
  });
});
