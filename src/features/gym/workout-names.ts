import { MUSCLE_GROUPS, type MuscleGroup } from '@/db/schema';

/** The split names most people train on, offered as one-tap chips. */
export const WORKOUT_NAME_PRESETS: readonly string[] = [
  'Push',
  'Pull',
  'Legs',
  'Upper',
  'Lower',
  'Full body',
];

export function isPresetName(name: string): boolean {
  return WORKOUT_NAME_PRESETS.includes(name);
}

/**
 * Which muscle groups each split day trains, used to narrow the exercise picker: on Push
 * day the list opens on chest, shoulders and triceps rather than all 60 lifts.
 *
 * Only a hint. The picker always keeps a way to reach the whole library, because a split
 * is a habit and not a rule — plenty of people finish Push with a set of curls.
 */
const DAY_GROUPS: Record<string, readonly MuscleGroup[]> = {
  push: ['chest', 'shoulders', 'triceps'],
  pull: ['back', 'biceps'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves'],
  upper: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
  lower: ['quads', 'hamstrings', 'glutes', 'calves', 'core'],
  // Everything, which is the same as no filter — see muscleGroupsForWorkout.
  'full body': [...MUSCLE_GROUPS],
  fullbody: [...MUSCLE_GROUPS],
  chest: ['chest', 'triceps'],
  back: ['back', 'biceps'],
  shoulders: ['shoulders', 'triceps'],
  arms: ['biceps', 'triceps'],
  core: ['core'],
  abs: ['core'],
};

/**
 * The groups a workout name implies, or null when the name says nothing useful — a
 * custom name, an empty one, or a day that covers everything anyway.
 *
 * Matching is lenient about case and about the "day" people append, so 'push day',
 * 'Push' and 'PUSH ' all resolve.
 */
export function muscleGroupsForWorkout(name: string): readonly MuscleGroup[] | null {
  const key = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*(day|workout)$/, '')
    .trim();

  const groups = DAY_GROUPS[key];
  if (groups === undefined) return null;
  // A filter that keeps everything is not worth showing as a filter.
  return groups.length === MUSCLE_GROUPS.length ? null : groups;
}
