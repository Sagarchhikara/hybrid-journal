import { count } from 'drizzle-orm';

import { daysAgoKey } from '@/lib/dates';

import { bumpDataVersion } from './data-version';
import { db } from './client';
import { normalizeExerciseName, STARTER_EXERCISES } from './exercise-library';
import {
  appSettings,
  dailyMetrics,
  exerciseSets,
  exercises,
  gymWorkouts,
  runs,
  sleepEntries,
  workoutExercises,
  type RunType,
} from './schema';

/**
 * First-launch seed of the starter exercise library. Safe to call on every boot:
 * it no-ops once the table has rows, and the unique index on `name` makes the
 * insert idempotent even if it races.
 *
 * Returns the number of rows inserted.
 */
export async function seedExerciseLibrary(): Promise<number> {
  const [existing] = await db.select({ total: count() }).from(exercises);
  if ((existing?.total ?? 0) > 0) return 0;

  await db
    .insert(exercises)
    .values(
      STARTER_EXERCISES.map((exercise) => ({
        name: normalizeExerciseName(exercise.name),
        muscleGroup: exercise.muscleGroup,
        isBodyweight: exercise.isBodyweight ?? false,
        isCustom: false,
        archivedAt: null,
      })),
    )
    .onConflictDoNothing();

  bumpDataVersion();
  return STARTER_EXERCISES.length;
}

// ---------------------------------------------------------------------------
// Dev-only fixtures below. Callers must gate on __DEV__.
// ---------------------------------------------------------------------------

/** Deterministic PRNG so repeated seeds produce the same plausible-looking data. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORKOUT_TEMPLATES: { name: string; exercises: string[] }[] = [
  {
    name: 'Push',
    exercises: ['Barbell Bench Press', 'Overhead Press', 'Lateral Raise', 'Triceps Pushdown'],
  },
  { name: 'Pull', exercises: ['Deadlift', 'Barbell Row', 'Lat Pulldown', 'Barbell Curl'] },
  { name: 'Legs', exercises: ['Back Squat', 'Romanian Deadlift', 'Leg Press', 'Calf Raise'] },
  {
    name: 'Upper',
    exercises: ['Incline Barbell Bench Press', 'Pull-Up', 'Dumbbell Row', 'Hammer Curl'],
  },
];

const RUN_PLAN: { type: RunType; distanceKm: number; secPerKm: number }[] = [
  { type: 'easy', distanceKm: 6, secPerKm: 345 },
  { type: 'tempo', distanceKm: 8, secPerKm: 288 },
  { type: 'long', distanceKm: 16, secPerKm: 360 },
];

const DAYS = 21;

export interface DevSeedResult {
  workouts: number;
  runs: number;
  sleepEntries: number;
  dailyMetrics: number;
}

/**
 * Inserts ~3 weeks of plausible gym, run, sleep and daily-metric data on top of
 * whatever is already there.
 */
export async function seedDevData(): Promise<DevSeedResult> {
  const random = mulberry32(20261001);

  const library = await db.select({ id: exercises.id, name: exercises.name }).from(exercises);
  const exerciseIdByName = new Map(library.map((row) => [row.name, row.id]));

  const result: DevSeedResult = { workouts: 0, runs: 0, sleepEntries: 0, dailyMetrics: 0 };

  for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const date = daysAgoKey(daysAgo);
    // Mon/Tue/Thu/Fri-ish lifting, Wed/Sat/Sun-ish running.
    const slot = (DAYS - 1 - daysAgo) % 7;
    const isGymDay = slot === 0 || slot === 1 || slot === 3 || slot === 4;
    const isRunDay = slot === 2 || slot === 5;

    if (isGymDay) {
      const template = WORKOUT_TEMPLATES[slot % WORKOUT_TEMPLATES.length]!;
      const [workout] = await db
        .insert(gymWorkouts)
        .values({ date, name: template.name, notes: null })
        .returning({ id: gymWorkouts.id });
      if (!workout) continue;
      result.workouts += 1;

      for (const [index, exerciseName] of template.exercises.entries()) {
        const exerciseId = exerciseIdByName.get(exerciseName);
        if (exerciseId === undefined) continue;

        const [link] = await db
          .insert(workoutExercises)
          .values({ workoutId: workout.id, exerciseId, sortOrder: index })
          .returning({ id: workoutExercises.id });
        if (!link) continue;

        const baseWeight = 20 + Math.round(random() * 16) * 5;
        const setCount = 3 + (random() > 0.6 ? 1 : 0);
        await db.insert(exerciseSets).values(
          Array.from({ length: setCount }, (_, setIndex) => ({
            workoutExerciseId: link.id,
            weightKg: baseWeight + setIndex * 2.5,
            reps: 10 - setIndex,
            setOrder: setIndex,
          })),
        );
      }
    }

    if (isRunDay) {
      const plan = RUN_PLAN[slot === 5 ? 2 : Math.floor(random() * 2)]!;
      const distanceKm = Number((plan.distanceKm * (0.9 + random() * 0.2)).toFixed(2));
      await db.insert(runs).values({
        date,
        distanceKm,
        durationSec: Math.round(distanceKm * plan.secPerKm),
        type: plan.type,
        notes: null,
      });
      result.runs += 1;
    }

    // Sleep most nights, with the occasional missed log.
    if (random() > 0.1) {
      await db
        .insert(sleepEntries)
        .values({ date, durationMin: 390 + Math.round(random() * 90) })
        .onConflictDoNothing();
      result.sleepEntries += 1;
    }

    await db
      .insert(dailyMetrics)
      .values({
        date,
        steps: 5000 + Math.round(random() * 7000),
        weightKg: Number((78 - daysAgo * 0.05 + random() * 0.6).toFixed(1)),
      })
      .onConflictDoNothing();
    result.dailyMetrics += 1;
  }

  bumpDataVersion();
  return result;
}

/**
 * Wipes every logged row, then restores the starter exercise library so the app
 * stays usable. Children are deleted explicitly rather than leaning on cascades.
 */
export async function clearAllData(): Promise<void> {
  await db.delete(exerciseSets);
  await db.delete(workoutExercises);
  await db.delete(gymWorkouts);
  await db.delete(runs);
  await db.delete(sleepEntries);
  await db.delete(dailyMetrics);
  await db.delete(exercises);
  await db.delete(appSettings);
  await seedExerciseLibrary();
  bumpDataVersion();
}
