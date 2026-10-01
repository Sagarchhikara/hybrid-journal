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

export function resetTables(): void {
  for (const table of [
    'exercise_sets',
    'workout_exercises',
    'gym_workouts',
    'runs',
    'sleep_entries',
    'daily_metrics',
    'app_settings',
  ]) {
    sqliteDb.execSync(`DELETE FROM ${table};`);
  }
}

export function appliedMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}
