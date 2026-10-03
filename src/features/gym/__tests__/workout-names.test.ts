import { describe, expect, it } from 'vitest';

import { MUSCLE_GROUPS } from '@/db/schema';
import { isPresetName, muscleGroupsForWorkout } from '@/features/gym/workout-names';

describe('muscleGroupsForWorkout', () => {
  it('maps the push/pull/legs split to the groups each day trains', () => {
    expect(muscleGroupsForWorkout('Push')).toEqual(['chest', 'shoulders', 'triceps']);
    expect(muscleGroupsForWorkout('Pull')).toEqual(['back', 'biceps']);
    expect(muscleGroupsForWorkout('Legs')).toEqual(['quads', 'hamstrings', 'glutes', 'calves']);
  });

  it('ignores case, padding and a trailing "day" or "workout"', () => {
    const push = ['chest', 'shoulders', 'triceps'];
    for (const name of ['push', 'PUSH', '  Push  ', 'Push Day', 'push day', 'Push workout']) {
      expect(muscleGroupsForWorkout(name)).toEqual(push);
    }
  });

  it('returns null for a name that implies nothing', () => {
    expect(muscleGroupsForWorkout('')).toBeNull();
    expect(muscleGroupsForWorkout('   ')).toBeNull();
    expect(muscleGroupsForWorkout('Tuesday')).toBeNull();
    expect(muscleGroupsForWorkout('Hypertrophy block A')).toBeNull();
  });

  it('returns null for a day that trains everything, since that is not a filter', () => {
    expect(muscleGroupsForWorkout('Full body')).toBeNull();
    expect(muscleGroupsForWorkout('full body day')).toBeNull();
  });

  it('only ever names real muscle groups', () => {
    for (const preset of ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Arms', 'Core']) {
      for (const group of muscleGroupsForWorkout(preset) ?? []) {
        expect(MUSCLE_GROUPS).toContain(group);
      }
    }
  });

  it('still recognises the preset chips', () => {
    expect(isPresetName('Push')).toBe(true);
    expect(isPresetName('push')).toBe(false);
  });
});
