import { and, asc, desc, eq, inArray, isNull, like, sql } from 'drizzle-orm';

import { db } from '../client';
import { bumpDataVersion } from '../data-version';
import { normalizeExerciseName } from '../exercise-library';
import {
  exerciseSets,
  exercises,
  gymWorkouts,
  workoutExercises,
  type Exercise,
  type MuscleGroup,
} from '../schema';

export interface ExerciseSearch {
  /** Substring match. The name column is NOCASE, so case is already ignored. */
  query?: string;
  muscleGroup?: MuscleGroup;
  /**
   * Restrict to several groups at once — what a split day needs, since Push is chest,
   * shoulders and triceps rather than any single group. An empty array matches nothing,
   * which is treated as "no restriction": a caller that computed no groups wants the
   * whole library, not a blank list.
   */
  muscleGroups?: readonly MuscleGroup[];
  includeArchived?: boolean;
}

/** Alphabetical. Archived exercises are hidden unless explicitly asked for. */
export async function searchExercises(options: ExerciseSearch = {}): Promise<Exercise[]> {
  const term = options.query?.trim() ?? '';
  const groups = options.muscleGroups ?? [];

  return db
    .select()
    .from(exercises)
    .where(
      and(
        options.includeArchived ? undefined : isNull(exercises.archivedAt),
        options.muscleGroup === undefined
          ? undefined
          : eq(exercises.muscleGroup, options.muscleGroup),
        groups.length === 0 ? undefined : inArray(exercises.muscleGroup, [...groups]),
        // LIKE on a NOCASE column is case-insensitive; escape the wildcards a user types.
        term === '' ? undefined : like(exercises.name, `%${escapeLike(term)}%`),
      ),
    )
    .orderBy(asc(exercises.name));
}

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export async function getExercise(id: number): Promise<Exercise | undefined> {
  const [row] = await db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
  return row;
}

/** Exact NOCASE lookup, including archived rows — used to resolve duplicate names. */
export async function findExerciseByName(name: string): Promise<Exercise | undefined> {
  const [row] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.name, normalizeExerciseName(name)))
    .limit(1);
  return row;
}

/**
 * Exercises used most recently, newest first. Surfaced at the top of the picker because
 * training is repetitive: the lift you want is nearly always one you did last week.
 */
export async function getRecentExerciseIds(limit = 8): Promise<number[]> {
  const rows = await db
    .select({ exerciseId: workoutExercises.exerciseId, date: gymWorkouts.date })
    .from(workoutExercises)
    .innerJoin(gymWorkouts, eq(gymWorkouts.id, workoutExercises.workoutId))
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(isNull(exercises.archivedAt))
    .orderBy(desc(gymWorkouts.date), desc(gymWorkouts.id));

  const seen: number[] = [];
  for (const row of rows) {
    if (!seen.includes(row.exerciseId)) seen.push(row.exerciseId);
    if (seen.length >= limit) break;
  }
  return seen;
}

export interface CreateExerciseInput {
  name: string;
  muscleGroup: MuscleGroup;
  isBodyweight?: boolean;
}

export interface CreateExerciseResult {
  exercise: Exercise;
  /** False when an existing exercise with that name was returned instead. */
  created: boolean;
  /** True when the match had been archived and was restored to satisfy the request. */
  restored: boolean;
}

/**
 * Creates an exercise, or returns the existing one with that name.
 *
 * The name column is NOCASE unique and names are normalised first, so 'bench  press'
 * resolves to 'Bench Press' rather than raising a constraint error at the user. An
 * archived match is restored: the user is asking for it by name, so hiding it and then
 * refusing to create it would be a dead end.
 */
export async function createOrGetExercise(
  input: CreateExerciseInput,
): Promise<CreateExerciseResult> {
  const name = normalizeExerciseName(input.name);
  if (name === '') throw new Error('An exercise needs a name');

  const existing = await findExerciseByName(name);
  if (existing) {
    if (existing.archivedAt === null) {
      return { exercise: existing, created: false, restored: false };
    }
    await db.update(exercises).set({ archivedAt: null }).where(eq(exercises.id, existing.id));
    bumpDataVersion();
    const restored = await getExercise(existing.id);
    return { exercise: restored ?? existing, created: false, restored: true };
  }

  const [row] = await db
    .insert(exercises)
    .values({
      name,
      muscleGroup: input.muscleGroup,
      isBodyweight: input.isBodyweight ?? false,
      isCustom: true,
      archivedAt: null,
    })
    .onConflictDoNothing()
    .returning();

  if (row) {
    bumpDataVersion();
    return { exercise: row, created: true, restored: false };
  }

  // Lost a race against another insert; the row now exists either way.
  const raced = await findExerciseByName(name);
  if (!raced) throw new Error(`Could not create or find exercise "${name}"`);
  return { exercise: raced, created: false, restored: false };
}

export type RenameResult =
  | { status: 'renamed'; exercise: Exercise }
  | { status: 'unchanged'; exercise: Exercise }
  | { status: 'taken'; existing: Exercise };

/**
 * Renames with normalisation. A name already belonging to a DIFFERENT exercise is
 * reported rather than merged: merging would have to move history between rows, and
 * silently folding two lifts together is not something to do without asking.
 */
export async function renameExercise(id: number, rawName: string): Promise<RenameResult> {
  const name = normalizeExerciseName(rawName);
  if (name === '') throw new Error('An exercise needs a name');

  const current = await getExercise(id);
  if (!current) throw new Error(`No exercise with id ${id}`);

  const clash = await findExerciseByName(name);
  if (clash && clash.id !== id) return { status: 'taken', existing: clash };

  // Same row: a case or whitespace change still counts as a rename worth writing.
  if (clash && clash.id === id && clash.name === name) {
    return { status: 'unchanged', exercise: current };
  }

  await db.update(exercises).set({ name }).where(eq(exercises.id, id));
  bumpDataVersion();
  const updated = await getExercise(id);
  return { status: 'renamed', exercise: updated ?? current };
}

export async function archiveExercise(id: number): Promise<void> {
  await db.update(exercises).set({ archivedAt: new Date() }).where(eq(exercises.id, id));
  bumpDataVersion();
}

export async function restoreExercise(id: number): Promise<void> {
  await db.update(exercises).set({ archivedAt: null }).where(eq(exercises.id, id));
  bumpDataVersion();
}

export async function setExerciseBodyweight(id: number, isBodyweight: boolean): Promise<void> {
  await db.update(exercises).set({ isBodyweight }).where(eq(exercises.id, id));
  bumpDataVersion();
}

export async function setExerciseMuscleGroup(id: number, muscleGroup: MuscleGroup): Promise<void> {
  await db.update(exercises).set({ muscleGroup }).where(eq(exercises.id, id));
  bumpDataVersion();
}

/** How many logged sets reference an exercise, so the library can warn before archiving. */
export async function countExerciseUsage(id: number): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)` })
    .from(exerciseSets)
    .innerJoin(workoutExercises, eq(workoutExercises.id, exerciseSets.workoutExerciseId))
    .where(eq(workoutExercises.exerciseId, id));
  return row?.total ?? 0;
}
