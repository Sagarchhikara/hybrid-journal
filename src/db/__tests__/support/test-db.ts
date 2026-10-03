import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { sqliteDb } from '@/db/client';

const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations', import.meta.url));

/**
 * Applies the real generated migration files, in journal order, to the in-memory
 * database the shim handed to src/db/client.ts. Using the checked-in .sql means these
 * tests fail if a migration is wrong — not just if a hand-written schema copy is.
 */
export function applyMigrations(): void {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = readFileSync(`${MIGRATIONS_DIR}/${file}`, 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      const trimmed = statement.trim();
      if (trimmed) sqliteDb.execSync(trimmed);
    }
  }
}

/**
 * Order matters: children before parents, so the RESTRICT foreign key from
 * workout_exercises to exercises does not block the final delete. `exercises` is included
 * because Phase 2 tests rename, archive and create library rows, and leaking that state
 * between tests makes failures depend on execution order.
 */
export function resetTables(): void {
  for (const table of [
    'exercise_sets',
    'workout_exercises',
    'gym_workouts',
    'runs',
    'sleep_entries',
    'daily_metrics',
    'app_settings',
    'exercises',
  ]) {
    sqliteDb.execSync(`DELETE FROM ${table};`);
  }
}

export function appliedMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}
