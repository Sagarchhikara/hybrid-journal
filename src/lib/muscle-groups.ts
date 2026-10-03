import type { MuscleGroup } from '@/db/schema';

/** Display names for the muscle groups, shared by the picker and the library screen. */
export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  biceps: 'Biceps',
  triceps: 'Triceps',
  core: 'Core',
  full_body: 'Full body',
};
