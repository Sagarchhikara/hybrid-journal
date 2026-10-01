import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState } from 'react';

import { db } from './client';
import migrations from './migrations/migrations';
import { seedExerciseLibrary } from './seed';

export interface DatabaseState {
  /** True once migrations have run and the exercise library is present. */
  ready: boolean;
  error: Error | undefined;
}

/**
 * Runs pending migrations and the first-launch exercise-library seed.
 * Mounted once from the root layout; the rest of the app can assume a ready db.
 */
export function useDatabase(): DatabaseState {
  const { success, error: migrationError } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error>();

  useEffect(() => {
    if (!success || seeded || seedError) return;
    let cancelled = false;
    seedExerciseLibrary()
      .then(() => {
        if (!cancelled) setSeeded(true);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setSeedError(cause instanceof Error ? cause : new Error(String(cause)));
      });
    return () => {
      cancelled = true;
    };
  }, [success, seeded, seedError]);

  return { ready: success && seeded, error: migrationError ?? seedError };
}
