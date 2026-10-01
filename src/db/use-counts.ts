import { count, isNull } from 'drizzle-orm';

import { db } from './client';
import { exercises, gymWorkouts, runs, sleepEntries } from './schema';
import { useDbQuery } from './use-db-query';

export interface LogCounts {
  workouts: number;
  runs: number;
  sleepEntries: number;
  /** Archived lifts stay in the table to keep history readable, but are not "your library". */
  exercises: number;
}

const EMPTY: LogCounts = { workouts: 0, runs: 0, sleepEntries: 0, exercises: 0 };

async function total(query: Promise<{ total: number }[]>): Promise<number> {
  const [row] = await query;
  return row?.total ?? 0;
}

export async function getLogCounts(): Promise<LogCounts> {
  const [workouts, runCount, sleep, exerciseCount] = await Promise.all([
    total(db.select({ total: count() }).from(gymWorkouts)),
    total(db.select({ total: count() }).from(runs)),
    total(db.select({ total: count() }).from(sleepEntries)),
    total(db.select({ total: count() }).from(exercises).where(isNull(exercises.archivedAt))),
  ]);

  return { workouts, runs: runCount, sleepEntries: sleep, exercises: exerciseCount };
}

export function useLogCounts(): LogCounts & { error: Error | undefined } {
  const { data, error } = useDbQuery(getLogCounts, []);
  return { ...(data ?? EMPTY), error };
}
