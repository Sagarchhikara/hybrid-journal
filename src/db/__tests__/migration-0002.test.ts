import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import { db } from '@/db/client';
import { STARTER_EXERCISES } from '@/db/exercise-library';
import { exercises } from '@/db/schema';
import { seedExerciseLibrary } from '@/db/seed';

import { applyMigrations } from './support/test-db';

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations', import.meta.url));

function applyFile(target: DatabaseSync, file: string): void {
  const sql = readFileSync(`${MIGRATIONS_DIR}/${file}`, 'utf8');
  for (const statement of sql.split('--> statement-breakpoint')) {
    const trimmed = statement.trim();
    if (trimmed) target.exec(trimmed);
  }
}

/**
 * Builds a database as it existed BEFORE 0002 — schema at 0001, populated with the
 * starter library written the old way (no is_bodyweight column at all) — then runs 0002
 * over it. This is what an existing install on a real phone goes through.
 */
function migratedFlags(): Map<string, number> {
  const legacy = new DatabaseSync(':memory:');
  legacy.exec('PRAGMA foreign_keys = ON;');
  applyFile(legacy, '0000_init.sql');
  applyFile(legacy, '0001_app_settings.sql');

  const insert = legacy.prepare(
    'INSERT INTO exercises (name, muscle_group, is_custom) VALUES (?, ?, 0)',
  );
  for (const exercise of STARTER_EXERCISES) {
    insert.run(exercise.name, exercise.muscleGroup);
  }
  // Something the user added themselves, which the backfill must leave alone.
  insert.run('My Weird Machine', 'chest');

  expect(() => applyFile(legacy, '0002_gym_recall.sql')).not.toThrow();

  const rows = legacy.prepare('SELECT name, is_bodyweight FROM exercises').all() as {
    name: string;
    is_bodyweight: number;
  }[];
  legacy.close();

  return new Map(rows.map((row) => [row.name, row.is_bodyweight]));
}

describe('migration 0002 over pre-existing data', () => {
  it('adds the column and backfills without touching existing rows otherwise', () => {
    const flags = migratedFlags();

    expect(flags.size).toBe(STARTER_EXERCISES.length + 1);
    expect(flags.get('Pull-Up')).toBe(1);
    expect(flags.get('Push-Up')).toBe(1);
    expect(flags.get('Dip')).toBe(1);
    expect(flags.get('Plank')).toBe(1);
    expect(flags.get('Hanging Leg Raise')).toBe(1);
    expect(flags.get('Barbell Bench Press')).toBe(0);
    expect(flags.get('Deadlift')).toBe(0);
  });

  it("leaves a user's own exercise on the default", () => {
    expect(migratedFlags().get('My Weird Machine')).toBe(0);
  });

  it('backfills case-insensitively, since the name column is NOCASE', () => {
    const legacy = new DatabaseSync(':memory:');
    applyFile(legacy, '0000_init.sql');
    applyFile(legacy, '0001_app_settings.sql');
    legacy
      .prepare('INSERT INTO exercises (name, muscle_group, is_custom) VALUES (?, ?, 0)')
      .run('pull-up', 'back');
    applyFile(legacy, '0002_gym_recall.sql');

    const row = legacy.prepare('SELECT is_bodyweight FROM exercises').get() as {
      is_bodyweight: number;
    };
    legacy.close();
    expect(row.is_bodyweight).toBe(1);
  });
});

describe('migrated and freshly seeded databases agree', () => {
  beforeAll(applyMigrations);

  it('produce identical is_bodyweight flags for every starter exercise', async () => {
    await seedExerciseLibrary();

    const fresh = new Map(
      (await db.select({ name: exercises.name, flag: exercises.isBodyweight }).from(exercises)).map(
        (row) => [row.name, row.flag ? 1 : 0],
      ),
    );
    const migrated = migratedFlags();

    expect(fresh.size).toBe(STARTER_EXERCISES.length);

    for (const exercise of STARTER_EXERCISES) {
      expect(fresh.get(exercise.name), `fresh seed: ${exercise.name}`).toBe(
        migrated.get(exercise.name),
      );
    }
  });

  it('flag exactly the five bodyweight movements, so the SQL and the TS list cannot drift', async () => {
    await seedExerciseLibrary();

    const flagged = (
      await db.select({ name: exercises.name, flag: exercises.isBodyweight }).from(exercises)
    )
      .filter((row) => row.flag)
      .map((row) => row.name)
      .sort();

    expect(flagged).toEqual(['Dip', 'Hanging Leg Raise', 'Plank', 'Pull-Up', 'Push-Up']);
  });
});
