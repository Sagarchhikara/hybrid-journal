import { and, asc, count, eq, gte, inArray, lte } from 'drizzle-orm';

import type { DateKey } from '@/lib/dates';

import { db } from '../client';
import { bumpDataVersion } from '../data-version';
import {
  exerciseSets,
  exercises,
  gymWorkouts,
  workoutExercises,
  type MuscleGroup,
} from '../schema';

export interface SetInput {
  weightKg: number | null;
  reps: number;
  setOrder: number;
}

export interface ExerciseInput {
  exerciseId: number;
  sortOrder: number;
  sets: SetInput[];
}

export interface WorkoutInput {
  date: DateKey;
  name: string | null;
  notes: string | null;
  exercises: ExerciseInput[];
}

export interface WorkoutDetailSet extends SetInput {
  id: number;
}

export interface WorkoutDetailExercise {
  workoutExerciseId: number;
  exerciseId: number;
  name: string;
  muscleGroup: MuscleGroup;
  isBodyweight: boolean;
  /** True when the exercise has since been archived; history still renders it. */
  isArchived: boolean;
  sortOrder: number;
  sets: WorkoutDetailSet[];
}

export interface WorkoutDetail {
  id: number;
  date: DateKey;
  name: string | null;
  notes: string | null;
  exercises: WorkoutDetailExercise[];
}

export interface WorkoutSummary {
  id: number;
  date: DateKey;
  name: string | null;
  createdAt: Date;
  exerciseCount: number;
  setCount: number;
}

/** The transaction handle drizzle hands the callback. */
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type NotPromise<T> =
  T extends Promise<unknown> ? ['Transaction callbacks must be synchronous', never] : T;

/**
 * Runs `work` inside one SQLite transaction.
 *
 * Drizzle's expo driver commits as soon as the callback RETURNS, so an async callback
 * would commit before its awaited writes ran and silently defeat the whole point. The
 * `NotPromise` return type makes that a compile error, and the runtime check catches any
 * promise that slips through a cast — throwing rolls the transaction back.
 */
export function runInTransaction<T>(work: (tx: Tx) => NotPromise<T>): T {
  return db.transaction((tx) => {
    const result = work(tx) as unknown;

    if (
      result instanceof Promise ||
      typeof (result as { then?: unknown } | null)?.then === 'function'
    ) {
      throw new Error(
        'Transaction callback returned a promise. Drizzle commits synchronously, so the ' +
          'callback must do all its work before returning.',
      );
    }

    return result as T;
  }) as T;
}

/** Writes the workout, its exercises and all their sets. Caller supplies the transaction. */
function insertWorkoutRows(tx: Tx, input: WorkoutInput, workoutId?: number): number {
  let id = workoutId;

  if (id === undefined) {
    const [row] = tx
      .insert(gymWorkouts)
      .values({ date: input.date, name: input.name, notes: input.notes })
      .returning({ id: gymWorkouts.id })
      .all();
    if (!row) throw new Error('Failed to create workout');
    id = row.id;
  }

  for (const exercise of input.exercises) {
    const [link] = tx
      .insert(workoutExercises)
      .values({
        workoutId: id,
        exerciseId: exercise.exerciseId,
        sortOrder: exercise.sortOrder,
      })
      .returning({ id: workoutExercises.id })
      .all();
    if (!link) throw new Error('Failed to add exercise to workout');

    if (exercise.sets.length === 0) continue;

    tx.insert(exerciseSets)
      .values(
        exercise.sets.map((set) => ({
          workoutExerciseId: link.id,
          weightKg: set.weightKg,
          reps: set.reps,
          setOrder: set.setOrder,
        })),
      )
      .run();
  }

  return id;
}

/** Creates a workout and everything under it in one transaction. */
export async function saveWorkout(input: WorkoutInput): Promise<number> {
  const id = runInTransaction((tx) => insertWorkoutRows(tx, input));
  bumpDataVersion();
  return id;
}

/**
 * Replaces a finished workout's exercises and sets in one transaction, keeping its id.
 * Children are deleted and rewritten rather than diffed: a workout holds a handful of
 * rows, and a diff would be far more code to get wrong.
 */
export async function replaceWorkout(id: number, input: WorkoutInput): Promise<void> {
  runInTransaction((tx) => {
    tx.update(gymWorkouts)
      .set({ date: input.date, name: input.name, notes: input.notes })
      .where(eq(gymWorkouts.id, id))
      .run();

    const links = tx
      .select({ id: workoutExercises.id })
      .from(workoutExercises)
      .where(eq(workoutExercises.workoutId, id))
      .all();

    if (links.length > 0) {
      tx.delete(exerciseSets)
        .where(
          inArray(
            exerciseSets.workoutExerciseId,
            links.map((link) => link.id),
          ),
        )
        .run();
      tx.delete(workoutExercises).where(eq(workoutExercises.workoutId, id)).run();
    }

    insertWorkoutRows(tx, input, id);
  });

  bumpDataVersion();
}

/** Cascades to workout_exercises and exercise_sets through the schema's foreign keys. */
export async function deleteWorkout(id: number): Promise<void> {
  await db.delete(gymWorkouts).where(eq(gymWorkouts.id, id));
  bumpDataVersion();
}

export async function getWorkoutDetail(id: number): Promise<WorkoutDetail | undefined> {
  const [workout] = await db.select().from(gymWorkouts).where(eq(gymWorkouts.id, id)).limit(1);
  if (!workout) return undefined;

  const links = await db
    .select({
      workoutExerciseId: workoutExercises.id,
      exerciseId: workoutExercises.exerciseId,
      sortOrder: workoutExercises.sortOrder,
      name: exercises.name,
      muscleGroup: exercises.muscleGroup,
      isBodyweight: exercises.isBodyweight,
      archivedAt: exercises.archivedAt,
    })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(eq(workoutExercises.workoutId, id))
    .orderBy(asc(workoutExercises.sortOrder), asc(workoutExercises.id));

  const allSets =
    links.length === 0
      ? []
      : await db
          .select()
          .from(exerciseSets)
          .where(
            inArray(
              exerciseSets.workoutExerciseId,
              links.map((link) => link.workoutExerciseId),
            ),
          )
          .orderBy(asc(exerciseSets.workoutExerciseId), asc(exerciseSets.setOrder));

  return {
    id: workout.id,
    date: workout.date,
    name: workout.name,
    notes: workout.notes,
    exercises: links.map((link) => ({
      workoutExerciseId: link.workoutExerciseId,
      exerciseId: link.exerciseId,
      name: link.name,
      muscleGroup: link.muscleGroup,
      isBodyweight: link.isBodyweight,
      isArchived: link.archivedAt !== null,
      sortOrder: link.sortOrder,
      sets: allSets
        .filter((set) => set.workoutExerciseId === link.workoutExerciseId)
        .map((set) => ({
          id: set.id,
          weightKg: set.weightKg,
          reps: set.reps,
          setOrder: set.setOrder,
        })),
    })),
  };
}

/** The most recent workout sharing a name, used by "Copy last Push". */
export async function getLastWorkoutByName(
  name: string,
  options: { onOrBefore?: DateKey; excludeWorkoutId?: number } = {},
): Promise<WorkoutDetail | undefined> {
  const rows = await db
    .select({ id: gymWorkouts.id, date: gymWorkouts.date })
    .from(gymWorkouts)
    .where(eq(gymWorkouts.name, name))
    .orderBy(asc(gymWorkouts.date));

  const candidates = rows
    .filter((row) => options.onOrBefore === undefined || row.date <= options.onOrBefore)
    .filter((row) => row.id !== options.excludeWorkoutId);

  const latest = candidates.at(-1);
  return latest === undefined ? undefined : getWorkoutDetail(latest.id);
}

export async function countWorkoutsBetween(from: DateKey, to: DateKey): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(gymWorkouts)
    .where(and(gte(gymWorkouts.date, from), lte(gymWorkouts.date, to)));
  return row?.total ?? 0;
}
