import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations', import.meta.url));

function applyFile(target: DatabaseSync, file: string): void {
  const sql = readFileSync(`${MIGRATIONS_DIR}/${file}`, 'utf8');
  for (const statement of sql.split('--> statement-breakpoint')) {
    const trimmed = statement.trim();
    if (trimmed) target.exec(trimmed);
  }
}

/**
 * Builds a database at 0002 with a workout already logged, then runs 0003 over it —
 * what an existing install goes through. A phone mid-training-block has sets in here,
 * and they must come out the other side readable and not retroactively drop sets.
 */
function migratedSets(): { reps: number; is_drop_set: number }[] {
  const legacy = new DatabaseSync(':memory:');
  legacy.exec('PRAGMA foreign_keys = ON;');
  applyFile(legacy, '0000_init.sql');
  applyFile(legacy, '0001_app_settings.sql');
  applyFile(legacy, '0002_gym_recall.sql');

  legacy
    .prepare(
      "INSERT INTO exercises (name, muscle_group, is_custom) VALUES ('Back Squat', 'quads', 0)",
    )
    .run();
  legacy.prepare("INSERT INTO gym_workouts (date, name) VALUES ('2026-09-27', 'Legs')").run();
  legacy
    .prepare('INSERT INTO workout_exercises (workout_id, exercise_id, sort_order) VALUES (1, 1, 0)')
    .run();
  const insert = legacy.prepare(
    'INSERT INTO exercise_sets (workout_exercise_id, weight_kg, reps, set_order) VALUES (1, ?, ?, ?)',
  );
  insert.run(100, 5, 0);
  insert.run(100, 5, 1);
  insert.run(80, 8, 2);

  applyFile(legacy, '0003_drop_sets.sql');

  return legacy
    .prepare('SELECT reps, is_drop_set FROM exercise_sets ORDER BY set_order')
    .all() as unknown as { reps: number; is_drop_set: number }[];
}

describe('migration 0003 over an existing install', () => {
  it('keeps every logged set', () => {
    expect(migratedSets().map((row) => row.reps)).toEqual([5, 5, 8]);
  });

  it('calls none of them a drop set', () => {
    // The flag cannot be inferred from the data: a lighter third set might be a drop or
    // just fatigue. Everything already logged therefore defaults to "not a drop".
    expect(migratedSets().every((row) => row.is_drop_set === 0)).toBe(true);
  });

  it('defaults the column for rows inserted without it', () => {
    const fresh = new DatabaseSync(':memory:');
    fresh.exec('PRAGMA foreign_keys = ON;');
    for (const file of [
      '0000_init.sql',
      '0001_app_settings.sql',
      '0002_gym_recall.sql',
      '0003_drop_sets.sql',
    ]) {
      applyFile(fresh, file);
    }

    fresh
      .prepare("INSERT INTO exercises (name, muscle_group, is_custom) VALUES ('Dip', 'triceps', 0)")
      .run();
    fresh.prepare("INSERT INTO gym_workouts (date, name) VALUES ('2026-09-27', 'Push')").run();
    fresh
      .prepare(
        'INSERT INTO workout_exercises (workout_id, exercise_id, sort_order) VALUES (1, 1, 0)',
      )
      .run();
    fresh
      .prepare(
        'INSERT INTO exercise_sets (workout_exercise_id, weight_kg, reps, set_order) VALUES (1, NULL, 10, 0)',
      )
      .run();

    const [row] = fresh.prepare('SELECT is_drop_set FROM exercise_sets').all() as unknown as {
      is_drop_set: number;
    }[];
    expect(row!.is_drop_set).toBe(0);
  });
});
