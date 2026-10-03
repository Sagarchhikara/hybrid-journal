import { and, asc, desc, eq, inArray, lte, ne, sql } from 'drizzle-orm';

import type { DateKey } from '@/lib/dates';

import { db } from '../client';
import { exerciseSets, gymWorkouts, workoutExercises } from '../schema';

export interface LastSessionSet {
  weightKg: number | null;
  reps: number;
  setOrder: number;
  /** Carried through so recall and prefill reproduce a drop as a drop. */
  isDropSet: boolean;
}

export interface LastSession {
  exerciseId: number;
  workoutId: number;
  workoutExerciseId: number;
  date: DateKey;
  sets: LastSessionSet[];
}

export interface LastSessionOptions {
  /** Only consider workouts on or before this date — the draft's own date. */
  onOrBefore: DateKey;
  /** The workout being edited, which must not count as its own history. */
  excludeWorkoutId?: number;
}

/**
 * The most recent previous appearance of each exercise.
 *
 * Batched over all the exercises on screen: the logging screen shows one recall line per
 * card, and a query per card would be a dozen round trips on every render.
 *
 * The exercise filter rides the `workout_exercises_exercise_idx` covering index added in
 * migration 0002 — without it the planner reports `SCAN we` over every set ever logged.
 * An EXPLAIN QUERY PLAN test pins that.
 *
 * "Most recent" is by workout date, then the workout's own created_at and id, so two
 * workouts on the same calendar date resolve to the one logged later.
 */
export async function getLastSessions(
  exerciseIds: readonly number[],
  options: LastSessionOptions,
): Promise<Map<number, LastSession>> {
  const result = new Map<number, LastSession>();
  if (exerciseIds.length === 0) return result;

  const unique = [...new Set(exerciseIds)];

  const candidates = await db
    .select({
      exerciseId: workoutExercises.exerciseId,
      workoutExerciseId: workoutExercises.id,
      workoutId: workoutExercises.workoutId,
      date: gymWorkouts.date,
      createdAt: gymWorkouts.createdAt,
    })
    .from(workoutExercises)
    .innerJoin(gymWorkouts, eq(gymWorkouts.id, workoutExercises.workoutId))
    .where(
      and(
        inArray(workoutExercises.exerciseId, unique),
        lte(gymWorkouts.date, options.onOrBefore),
        options.excludeWorkoutId === undefined
          ? undefined
          : ne(workoutExercises.workoutId, options.excludeWorkoutId),
      ),
    )
    .orderBy(desc(gymWorkouts.date), desc(gymWorkouts.createdAt), desc(gymWorkouts.id));

  // The ordering above puts the winner for each exercise first.
  const winners = new Map<number, (typeof candidates)[number]>();
  for (const row of candidates) {
    if (!winners.has(row.exerciseId)) winners.set(row.exerciseId, row);
  }
  if (winners.size === 0) return result;

  const sets = await db
    .select()
    .from(exerciseSets)
    .where(
      inArray(
        exerciseSets.workoutExerciseId,
        [...winners.values()].map((row) => row.workoutExerciseId),
      ),
    )
    .orderBy(asc(exerciseSets.workoutExerciseId), asc(exerciseSets.setOrder));

  for (const [exerciseId, row] of winners) {
    result.set(exerciseId, {
      exerciseId,
      workoutId: row.workoutId,
      workoutExerciseId: row.workoutExerciseId,
      date: row.date,
      sets: sets
        .filter((set) => set.workoutExerciseId === row.workoutExerciseId)
        .map((set) => ({
          weightKg: set.weightKg,
          reps: set.reps,
          setOrder: set.setOrder,
          isDropSet: set.isDropSet,
        })),
    });
  }

  return result;
}

export async function getLastSession(
  exerciseId: number,
  options: LastSessionOptions,
): Promise<LastSession | null> {
  const sessions = await getLastSessions([exerciseId], options);
  return sessions.get(exerciseId) ?? null;
}

/** The SQL the recall query runs, exposed so a test can EXPLAIN exactly this. */
export const LAST_SESSION_PLAN_SQL = `
SELECT we.exercise_id, we.id, we.workout_id, w.date, w.created_at
FROM workout_exercises we
INNER JOIN gym_workouts w ON w.id = we.workout_id
WHERE we.exercise_id IN (?) AND w.date <= ? AND we.workout_id != ?
ORDER BY w.date DESC, w.created_at DESC, w.id DESC`;

export async function explainLastSessionPlan(): Promise<string[]> {
  const rows = await db.all<{ detail: string }>(
    sql.raw(`EXPLAIN QUERY PLAN ${LAST_SESSION_PLAN_SQL}`),
  );
  return rows.map((row) => row.detail);
}
