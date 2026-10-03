import { sql } from 'drizzle-orm';
import {
  customType,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

/**
 * Conventions for this schema:
 *
 * - `date` columns are LOCAL calendar dates stored as 'YYYY-MM-DD' text, never UTC
 *   timestamps. Streaks and weekly rollups are calendar questions; storing an instant
 *   would silently shift entries across midnight when the user changes time zone.
 * - `created_at` is a real instant (unix seconds) and is only ever used for ordering
 *   within a day / debugging — never for grouping by day.
 * - Pace is derived from `distance_km` + `duration_sec` at read time. It is never stored.
 */

/**
 * TEXT with SQLite's case-insensitive collating sequence. Applying NOCASE to the
 * column (rather than to a `lower(name)` expression index) means uniqueness,
 * `eq()`, `ORDER BY` and `LIKE` are all case-insensitive, so 'bench press' and
 * 'Bench Press' can neither coexist nor be missed by a lookup.
 */
const textNoCase = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'text collate nocase';
  },
});

const createdAt = () =>
  integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`);

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'biceps',
  'triceps',
  'core',
  'full_body',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const RUN_TYPES = ['easy', 'tempo', 'interval', 'long', 'race'] as const;
export type RunType = (typeof RUN_TYPES)[number];

export const exercises = sqliteTable(
  'exercises',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: textNoCase('name').notNull(),
    muscleGroup: text('muscle_group').$type<MuscleGroup>().notNull(),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    /**
     * True for movements loaded by your own body: pull-ups, dips, push-ups, planks.
     * It decides how a set's `weight_kg` is READ (see exercise_sets below), so it cannot
     * be inferred from the sets themselves.
     */
    isBodyweight: integer('is_bodyweight', { mode: 'boolean' }).notNull().default(false),
    /**
     * Set instead of deleting. `workout_exercises.exercise_id` is ON DELETE RESTRICT,
     * so history pins a lift in place forever — archiving is how a lift leaves the
     * picker without erasing the workouts that used it.
     */
    archivedAt: integer('archived_at', { mode: 'timestamp' }),
  },
  (t) => [
    // Inherits the column's NOCASE collation, so this is a case-insensitive constraint.
    uniqueIndex('exercises_name_unique').on(t.name),
    index('exercises_archived_idx').on(t.archivedAt),
  ],
);

export const gymWorkouts = sqliteTable(
  'gym_workouts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Local calendar date, 'YYYY-MM-DD'. */
    date: text('date').notNull(),
    name: text('name'),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [index('gym_workouts_date_idx').on(t.date)],
);

export const workoutExercises = sqliteTable(
  'workout_exercises',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workoutId: integer('workout_id')
      .notNull()
      .references(() => gymWorkouts.id, { onDelete: 'cascade' }),
    exerciseId: integer('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    sortOrder: integer('sort_order').notNull(),
  },
  (t) => [
    index('workout_exercises_workout_idx').on(t.workoutId, t.sortOrder),
    /**
     * Last-session recall looks up every row for one exercise across all workouts.
     * Without this the planner reports `SCAN we` over every set ever logged; with it,
     * `SEARCH we USING COVERING INDEX`. Pinned by an EXPLAIN QUERY PLAN test.
     */
    index('workout_exercises_exercise_idx').on(t.exerciseId, t.workoutId),
  ],
);

export const exerciseSets = sqliteTable(
  'exercise_sets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workoutExerciseId: integer('workout_exercise_id')
      .notNull()
      .references(() => workoutExercises.id, { onDelete: 'cascade' }),
    /**
     * Load in kg, or NULL.
     *
     * The reading depends on `exercises.is_bodyweight`:
     *  - bodyweight exercise, NULL      -> plain bodyweight, shown as 'BW'
     *  - bodyweight exercise, positive  -> ADDED load on top of bodyweight, 'BW +10 kg'
     *  - other exercise, positive       -> the total load lifted, '100 kg'
     *
     * Never negative and never zero: zero added load is plain bodyweight, so it is
     * stored as NULL. Non-bodyweight exercises always carry a weight.
     */
    weightKg: real('weight_kg'),
    reps: integer('reps').notNull(),
    setOrder: integer('set_order').notNull(),
    /**
     * True for a drop set: the same exercise continued immediately at a lighter load,
     * rather than a fresh working set after a rest.
     *
     * Kept as a flag on the set instead of a separate table because a drop is still one
     * set of one exercise — it only differs in how it should be read. Without the flag a
     * drop is indistinguishable in history from a working set where you simply got
     * tired, which is the whole reason for recording it.
     *
     * Ordering carries the rest of the meaning: a drop belongs to the nearest preceding
     * non-drop set in `set_order`.
     */
    isDropSet: integer('is_drop_set', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [index('exercise_sets_workout_exercise_idx').on(t.workoutExerciseId, t.setOrder)],
);

export const runs = sqliteTable(
  'runs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Local calendar date, 'YYYY-MM-DD'. */
    date: text('date').notNull(),
    distanceKm: real('distance_km').notNull(),
    durationSec: integer('duration_sec').notNull(),
    type: text('type').$type<RunType>().notNull().default('easy'),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [index('runs_date_idx').on(t.date)],
);

export const sleepEntries = sqliteTable(
  'sleep_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Local calendar date the user woke up on, 'YYYY-MM-DD'. One entry per date. */
    date: text('date').notNull(),
    durationMin: integer('duration_min').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('sleep_entries_date_unique').on(t.date)],
);

export const dailyMetrics = sqliteTable(
  'daily_metrics',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** Local calendar date, 'YYYY-MM-DD'. */
    date: text('date').notNull(),
    steps: integer('steps'),
    weightKg: real('weight_kg'),
  },
  (t) => [uniqueIndex('daily_metrics_date_unique').on(t.date)],
);

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type GymWorkout = typeof gymWorkouts.$inferSelect;
export type NewGymWorkout = typeof gymWorkouts.$inferInsert;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert;
export type ExerciseSet = typeof exerciseSets.$inferSelect;
export type NewExerciseSet = typeof exerciseSets.$inferInsert;
export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type SleepEntry = typeof sleepEntries.$inferSelect;
export type NewSleepEntry = typeof sleepEntries.$inferInsert;
export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type NewDailyMetric = typeof dailyMetrics.$inferInsert;

/**
 * Key/value user preferences. Deliberately stringly-typed: it keeps every future
 * setting a zero-migration change, and the typed accessors in
 * src/db/queries/settings.ts are the only place that parses these values.
 */
export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;
