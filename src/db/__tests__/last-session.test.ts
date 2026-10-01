import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/client';
import { archiveExercise } from '@/db/queries/exercises';
import { saveWorkout, type WorkoutInput } from '@/db/queries/gym';
import { getLastSession, getLastSessions } from '@/db/queries/last-session';
import { exercises, gymWorkouts } from '@/db/schema';
import { seedExerciseLibrary } from '@/db/seed';

import { applyMigrations, resetTables } from './support/test-db';

beforeAll(applyMigrations);

let benchId = 0;
let pullUpId = 0;
let rowId = 0;

beforeEach(async () => {
  resetTables();
  await seedExerciseLibrary();
  const library = await db.select({ id: exercises.id, name: exercises.name }).from(exercises);
  const byName = new Map(library.map((row) => [row.name, row.id]));
  benchId = byName.get('Barbell Bench Press')!;
  pullUpId = byName.get('Pull-Up')!;
  rowId = byName.get('Barbell Row')!;
});

function bench(date: string, weights: number[]): WorkoutInput {
  return {
    date,
    name: 'Push',
    notes: null,
    exercises: [
      {
        exerciseId: benchId,
        sortOrder: 0,
        sets: weights.map((weightKg, index) => ({ weightKg, reps: 8 - index, setOrder: index })),
      },
    ],
  };
}

describe('getLastSession picks the right workout', () => {
  it('returns the most recent previous appearance', async () => {
    await saveWorkout(bench('2026-09-20', [70]));
    await saveWorkout(bench('2026-09-27', [75]));
    await saveWorkout(bench('2026-09-24', [72.5]));

    const session = await getLastSession(benchId, { onOrBefore: '2026-10-01' });
    expect(session?.date).toBe('2026-09-27');
    expect(session?.sets[0]!.weightKg).toBeCloseTo(75, 6);
  });

  it('returns the sets in order', async () => {
    await saveWorkout(bench('2026-09-27', [72.5, 70, 70]));

    const session = await getLastSession(benchId, { onOrBefore: '2026-10-01' });
    expect(session?.sets.map((set) => set.setOrder)).toEqual([0, 1, 2]);
    expect(session?.sets.map((set) => set.weightKg)).toEqual([72.5, 70, 70]);
    expect(session?.sets.map((set) => set.reps)).toEqual([8, 7, 6]);
  });

  it('ignores workouts after the draft date', async () => {
    await saveWorkout(bench('2026-09-20', [70]));
    await saveWorkout(bench('2026-10-05', [80]));

    const session = await getLastSession(benchId, { onOrBefore: '2026-09-28' });
    expect(session?.date).toBe('2026-09-20');
  });

  it('includes a workout on exactly the draft date', async () => {
    await saveWorkout(bench('2026-09-28', [77.5]));
    const session = await getLastSession(benchId, { onOrBefore: '2026-09-28' });
    expect(session?.date).toBe('2026-09-28');
  });

  it('excludes the workout being edited', async () => {
    const older = await saveWorkout(bench('2026-09-20', [70]));
    const editing = await saveWorkout(bench('2026-09-27', [75]));

    const session = await getLastSession(benchId, {
      onOrBefore: '2026-09-27',
      excludeWorkoutId: editing,
    });
    expect(session?.workoutId).toBe(older);
    expect(session?.date).toBe('2026-09-20');
  });

  it('returns the second newest when the workout being edited is the newest of three', async () => {
    await saveWorkout(bench('2026-09-13', [65]));
    const middle = await saveWorkout(bench('2026-09-20', [70]));
    const newest = await saveWorkout(bench('2026-09-27', [75]));

    const session = await getLastSession(benchId, {
      onOrBefore: '2026-09-27',
      excludeWorkoutId: newest,
    });

    // Must be the one immediately before it, not merely "an older one".
    expect(session?.workoutId).toBe(middle);
    expect(session?.date).toBe('2026-09-20');
    expect(session?.sets[0]!.weightKg).toBeCloseTo(70, 6);
  });

  it('ignores later workouts when editing a backdated one', async () => {
    // Editing the 09-20 session weeks later: the 09-27 and 10-04 sessions came after it
    // and must not be offered as "last time", even though they are more recent.
    await saveWorkout(bench('2026-09-13', [65]));
    const editing = await saveWorkout(bench('2026-09-20', [70]));
    await saveWorkout(bench('2026-09-27', [75]));
    await saveWorkout(bench('2026-10-04', [80]));

    const session = await getLastSession(benchId, {
      onOrBefore: '2026-09-20',
      excludeWorkoutId: editing,
    });

    expect(session?.date).toBe('2026-09-13');
    expect(session?.sets[0]!.weightKg).toBeCloseTo(65, 6);
  });

  it('returns null for a backdated draft whose only history is in the future', async () => {
    await saveWorkout(bench('2026-09-27', [75]));
    await saveWorkout(bench('2026-10-04', [80]));

    expect(await getLastSession(benchId, { onOrBefore: '2026-09-01' })).toBeNull();
  });

  it('applies the date cutoff and the exclusion together, not just one of them', async () => {
    const older = await saveWorkout(bench('2026-09-13', [65]));
    const editing = await saveWorkout(bench('2026-09-20', [70]));
    const later = await saveWorkout(bench('2026-09-27', [75]));

    const session = await getLastSession(benchId, {
      onOrBefore: '2026-09-20',
      excludeWorkoutId: editing,
    });

    expect(session?.workoutId).toBe(older);
    expect(session?.workoutId).not.toBe(editing);
    expect(session?.workoutId).not.toBe(later);
  });

  it('batches the same exclusion and cutoff across several exercises', async () => {
    await saveWorkout({
      date: '2026-09-13',
      name: 'Push',
      notes: null,
      exercises: [
        { exerciseId: benchId, sortOrder: 0, sets: [{ weightKg: 65, reps: 8, setOrder: 0 }] },
        { exerciseId: rowId, sortOrder: 1, sets: [{ weightKg: 55, reps: 10, setOrder: 0 }] },
      ],
    });
    const editing = await saveWorkout({
      date: '2026-09-20',
      name: 'Push',
      notes: null,
      exercises: [
        { exerciseId: benchId, sortOrder: 0, sets: [{ weightKg: 70, reps: 8, setOrder: 0 }] },
        { exerciseId: rowId, sortOrder: 1, sets: [{ weightKg: 60, reps: 10, setOrder: 0 }] },
      ],
    });
    await saveWorkout(bench('2026-09-27', [75]));

    const sessions = await getLastSessions([benchId, rowId], {
      onOrBefore: '2026-09-20',
      excludeWorkoutId: editing,
    });

    expect(sessions.get(benchId)?.date).toBe('2026-09-13');
    expect(sessions.get(rowId)?.date).toBe('2026-09-13');
  });

  it('returns null when the only candidate is the workout being edited', async () => {
    const editing = await saveWorkout(bench('2026-09-27', [75]));
    expect(
      await getLastSession(benchId, { onOrBefore: '2026-09-27', excludeWorkoutId: editing }),
    ).toBeNull();
  });

  it('returns null for an exercise with no history', async () => {
    await saveWorkout(bench('2026-09-27', [75]));
    expect(await getLastSession(rowId, { onOrBefore: '2026-10-01' })).toBeNull();
  });

  it('picks the later of two workouts on the same date', async () => {
    const first = await saveWorkout(bench('2026-09-27', [70]));
    const second = await saveWorkout(bench('2026-09-27', [80]));

    // created_at has one-second resolution, so make the ordering unambiguous.
    await db
      .update(gymWorkouts)
      .set({ createdAt: new Date(1_000_000) })
      .where(eq(gymWorkouts.id, first));
    await db
      .update(gymWorkouts)
      .set({ createdAt: new Date(2_000_000) })
      .where(eq(gymWorkouts.id, second));

    const session = await getLastSession(benchId, { onOrBefore: '2026-10-01' });
    expect(session?.workoutId).toBe(second);
    expect(session?.sets[0]!.weightKg).toBeCloseTo(80, 6);
  });
});

describe('getLastSession with bodyweight sets', () => {
  it('returns null weights for plain bodyweight and numbers for added load', async () => {
    await saveWorkout({
      date: '2026-09-27',
      name: 'Pull',
      notes: null,
      exercises: [
        {
          exerciseId: pullUpId,
          sortOrder: 0,
          sets: [
            { weightKg: null, reps: 10, setOrder: 0 },
            { weightKg: 10, reps: 8, setOrder: 1 },
            { weightKg: null, reps: 6, setOrder: 2 },
          ],
        },
      ],
    });

    const session = await getLastSession(pullUpId, { onOrBefore: '2026-10-01' });
    expect(session?.sets.map((set) => set.weightKg)).toEqual([null, 10, null]);
  });
});

describe('getLastSession for archived exercises', () => {
  it('still resolves history after the exercise is archived', async () => {
    await saveWorkout(bench('2026-09-27', [75]));
    await archiveExercise(benchId);

    const session = await getLastSession(benchId, { onOrBefore: '2026-10-01' });
    expect(session?.date).toBe('2026-09-27');
    expect(session?.sets[0]!.weightKg).toBeCloseTo(75, 6);
  });
});

describe('getLastSessions batches', () => {
  it('resolves several exercises in one call', async () => {
    await saveWorkout({
      date: '2026-09-27',
      name: 'Pull',
      notes: null,
      exercises: [
        { exerciseId: rowId, sortOrder: 0, sets: [{ weightKg: 60, reps: 10, setOrder: 0 }] },
        { exerciseId: pullUpId, sortOrder: 1, sets: [{ weightKg: null, reps: 8, setOrder: 0 }] },
      ],
    });
    await saveWorkout(bench('2026-09-26', [70]));

    const sessions = await getLastSessions([benchId, pullUpId, rowId], {
      onOrBefore: '2026-10-01',
    });

    expect(sessions.size).toBe(3);
    expect(sessions.get(benchId)?.date).toBe('2026-09-26');
    expect(sessions.get(rowId)?.date).toBe('2026-09-27');
    expect(sessions.get(pullUpId)?.sets[0]!.weightKg).toBeNull();
  });

  it('omits exercises with no history rather than returning empty entries', async () => {
    await saveWorkout(bench('2026-09-27', [75]));

    const sessions = await getLastSessions([benchId, rowId], { onOrBefore: '2026-10-01' });
    expect(sessions.has(benchId)).toBe(true);
    expect(sessions.has(rowId)).toBe(false);
  });

  it('returns an empty map for no exercises', async () => {
    expect((await getLastSessions([], { onOrBefore: '2026-10-01' })).size).toBe(0);
  });

  it('deduplicates repeated ids, as when an exercise appears twice in a session', async () => {
    await saveWorkout(bench('2026-09-27', [75]));
    const sessions = await getLastSessions([benchId, benchId, benchId], {
      onOrBefore: '2026-10-01',
    });
    expect(sessions.size).toBe(1);
  });

  it('does not leak one exercise sets into another', async () => {
    await saveWorkout({
      date: '2026-09-27',
      name: 'Mixed',
      notes: null,
      exercises: [
        {
          exerciseId: benchId,
          sortOrder: 0,
          sets: [
            { weightKg: 80, reps: 8, setOrder: 0 },
            { weightKg: 80, reps: 8, setOrder: 1 },
          ],
        },
        { exerciseId: rowId, sortOrder: 1, sets: [{ weightKg: 60, reps: 12, setOrder: 0 }] },
      ],
    });

    const sessions = await getLastSessions([benchId, rowId], { onOrBefore: '2026-10-01' });
    expect(sessions.get(benchId)?.sets).toHaveLength(2);
    expect(sessions.get(rowId)?.sets).toHaveLength(1);
    expect(sessions.get(rowId)?.sets[0]!.weightKg).toBeCloseTo(60, 6);
  });
});
