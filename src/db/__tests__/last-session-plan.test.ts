import { beforeAll, describe, expect, it } from 'vitest';

import { explainLastSessionPlan } from '@/db/queries/last-session';

import { applyMigrations } from './support/test-db';

beforeAll(applyMigrations);

describe('last-session query plan', () => {
  it('uses the exercise index and never scans workout_exercises', async () => {
    const plan = await explainLastSessionPlan();
    const text = plan.join('\n');

    expect(text).toContain('workout_exercises_exercise_idx');
    // `SCAN we` is the regression this guards: a full scan of every set ever logged.
    expect(text).not.toMatch(/SCAN (we|workout_exercises)/);
  });

  it('reaches gym_workouts by primary key rather than scanning it', async () => {
    const text = (await explainLastSessionPlan()).join('\n');
    expect(text).not.toMatch(/SCAN (w|gym_workouts)/);
  });
});
