import type { MuscleGroup } from './schema';

/**
 * Call on every write to `exercises.name`. The column's NOCASE collation already
 * makes 'bench press' and 'Bench Press' the same row, but collation does nothing
 * about stray whitespace, so 'Bench  Press' would still slip past the constraint.
 */
export function normalizeExerciseName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * The starter library, inserted once on first launch. Users add their own on top
 * (those get `is_custom = true`), so this list only needs to cover the common lifts.
 */
export interface StarterExercise {
  name: string;
  muscleGroup: MuscleGroup;
  /** See the `is_bodyweight` comment in schema.ts. Mirrored by the 0002 backfill. */
  isBodyweight?: boolean;
}

export const STARTER_EXERCISES: StarterExercise[] = [
  // Chest
  { name: 'Barbell Bench Press', muscleGroup: 'chest' },
  { name: 'Incline Barbell Bench Press', muscleGroup: 'chest' },
  { name: 'Dumbbell Bench Press', muscleGroup: 'chest' },
  { name: 'Cable Fly', muscleGroup: 'chest' },
  { name: 'Push-Up', muscleGroup: 'chest', isBodyweight: true },
  // Back
  { name: 'Deadlift', muscleGroup: 'back' },
  { name: 'Barbell Row', muscleGroup: 'back' },
  { name: 'Dumbbell Row', muscleGroup: 'back' },
  { name: 'Lat Pulldown', muscleGroup: 'back' },
  { name: 'Pull-Up', muscleGroup: 'back', isBodyweight: true },
  { name: 'Seated Cable Row', muscleGroup: 'back' },
  { name: 'Face Pull', muscleGroup: 'back' },
  // Shoulders
  { name: 'Overhead Press', muscleGroup: 'shoulders' },
  { name: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders' },
  { name: 'Lateral Raise', muscleGroup: 'shoulders' },
  { name: 'Rear Delt Fly', muscleGroup: 'shoulders' },
  // Legs
  { name: 'Back Squat', muscleGroup: 'quads' },
  { name: 'Front Squat', muscleGroup: 'quads' },
  { name: 'Leg Press', muscleGroup: 'quads' },
  { name: 'Bulgarian Split Squat', muscleGroup: 'quads' },
  { name: 'Romanian Deadlift', muscleGroup: 'hamstrings' },
  { name: 'Leg Curl', muscleGroup: 'hamstrings' },
  { name: 'Hip Thrust', muscleGroup: 'glutes' },
  { name: 'Calf Raise', muscleGroup: 'calves' },
  // Arms
  { name: 'Barbell Curl', muscleGroup: 'biceps' },
  { name: 'Dumbbell Curl', muscleGroup: 'biceps' },
  { name: 'Hammer Curl', muscleGroup: 'biceps' },
  { name: 'Triceps Pushdown', muscleGroup: 'triceps' },
  { name: 'Overhead Triceps Extension', muscleGroup: 'triceps' },
  { name: 'Dip', muscleGroup: 'triceps', isBodyweight: true },
  // Core
  { name: 'Plank', muscleGroup: 'core', isBodyweight: true },
  { name: 'Hanging Leg Raise', muscleGroup: 'core', isBodyweight: true },
  { name: 'Cable Crunch', muscleGroup: 'core' },
];
