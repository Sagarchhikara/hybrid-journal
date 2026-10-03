import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/client';
import {
  deleteWorkout,
  getLastWorkoutByName,
  getWorkoutDetail,
  replaceWorkout,
  runInTransaction,
  saveWorkout,
  type WorkoutInput,
} from '@/db/queries/gym';
import { exerciseSets, exercises, gymWorkouts, workoutExercises } from '@/db/schema';
import { seedExerciseLibrary } from '@/db/seed';

import { getLastSession } from '@/db/queries/last-session';

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

function pushWorkout(): WorkoutInput {
  return {
    date: '2026-10-01',
    name: 'Push',
    notes: null,
    exercises: [
      {
        exerciseId: benchId,
        sortOrder: 0,
        sets: [
          { weightKg: 80, reps: 8, setOrder: 0 },
          { weightKg: 82.5, reps: 6, setOrder: 1 },
        ],
      },
      {
        exerciseId: pullUpId,
        sortOrder: 1,
        sets: [
          { weightKg: null, reps: 10, setOrder: 0 },
          { weightKg: 10, reps: 8, setOrder: 1 },
        ],
      },
    ],
  };
}

async function tableCounts() {
  return {
    workouts: (await db.select().from(gymWorkouts)).length,
    links: (await db.select().from(workoutExercises)).length,
    sets: (await db.select().from(exerciseSets)).length,
  };
}

describe('saveWorkout', () => {
  it('writes the workout, its exercises and its sets', async () => {
    const id = await saveWorkout(pushWorkout());
    const detail = await getWorkoutDetail(id);

    expect(detail?.name).toBe('Push');
    expect(detail?.date).toBe('2026-10-01');
    expect(detail?.exercises).toHaveLength(2);
    expect(detail?.exercises[0]!.sets).toHaveLength(2);
    expect(detail?.exercises[1]!.sets[0]!.weightKg).toBeNull();
    expect(detail?.exercises[1]!.sets[1]!.weightKg).toBeCloseTo(10, 6);
  });

  it('preserves exercise and set order', async () => {
    const id = await saveWorkout(pushWorkout());
    const detail = await getWorkoutDetail(id);

    expect(detail?.exercises.map((exercise) => exercise.exerciseId)).toEqual([benchId, pullUpId]);
    expect(detail?.exercises[0]!.sets.map((set) => set.setOrder)).toEqual([0, 1]);
  });

  it('carries the bodyweight flag through from the exercise', async () => {
    const id = await saveWorkout(pushWorkout());
    const detail = await getWorkoutDetail(id);
    expect(detail?.exercises.map((exercise) => exercise.isBodyweight)).toEqual([false, true]);
  });

  it('allows several workouts on one date', async () => {
    await saveWorkout(pushWorkout());
    await saveWorkout({ ...pushWorkout(), name: 'Evening Pull' });

    const all = await db.select().from(gymWorkouts);
    expect(all).toHaveLength(2);
    expect(all.every((workout) => workout.date === '2026-10-01')).toBe(true);
  });
});

/**
 * The transaction is the whole reason Finish writes rows rather than the editor writing
 * as you go: a half-saved workout would be worse than none at all.
 */
describe('saveWorkout rolls back completely on failure', () => {
  it('leaves nothing behind when a later exercise references a missing exercise row', async () => {
    const input = pushWorkout();
    input.exercises[1]!.exerciseId = 99999; // violates the RESTRICT foreign key

    await expect(saveWorkout(input)).rejects.toThrow();
    expect(await tableCounts()).toEqual({ workouts: 0, links: 0, sets: 0 });
  });

  it('leaves nothing behind when the third set is invalid', async () => {
    const input: WorkoutInput = {
      date: '2026-10-01',
      name: 'Push',
      notes: null,
      exercises: [
        {
          exerciseId: benchId,
          sortOrder: 0,
          sets: [
            { weightKg: 80, reps: 8, setOrder: 0 },
            { weightKg: 80, reps: 8, setOrder: 1 },
            // NaN binds as NULL, and reps is NOT NULL.
            { weightKg: 80, reps: Number.NaN, setOrder: 2 },
          ],
        },
      ],
    };

    await expect(saveWorkout(input)).rejects.toThrow();
    expect(await tableCounts()).toEqual({ workouts: 0, links: 0, sets: 0 });
  });

  it('does not disturb workouts saved earlier', async () => {
    const keptId = await saveWorkout(pushWorkout());

    const bad = pushWorkout();
    bad.exercises[0]!.exerciseId = 99999;
    await expect(saveWorkout(bad)).rejects.toThrow();

    const detail = await getWorkoutDetail(keptId);
    expect(detail?.exercises).toHaveLength(2);
    expect(await tableCounts()).toEqual({ workouts: 1, links: 2, sets: 4 });
  });
});

describe('runInTransaction rejects an asynchronous callback', () => {
  it('throws and rolls back when the callback returns a promise', async () => {
    const before = await tableCounts();

    expect(() =>
      runInTransaction((tx) => {
        tx.insert(gymWorkouts).values({ date: '2026-10-01', name: 'Oops', notes: null }).run();
        // A cast is the only way to get here; the signature rejects this at compile time.
        return Promise.resolve(1) as unknown as number;
      }),
    ).toThrow(/synchronous/i);

    // The insert above must not have survived.
    expect(await tableCounts()).toEqual(before);
  });

  it('also rejects a thenable that is not a real promise', async () => {
    expect(() => runInTransaction(() => ({ then: () => undefined }) as unknown as number)).toThrow(
      /synchronous/i,
    );
  });

  it('accepts a synchronous callback and returns its value', () => {
    expect(runInTransaction(() => 42)).toBe(42);
  });
});

describe('replaceWorkout', () => {
  it('replaces exercises and sets while keeping the same id', async () => {
    const id = await saveWorkout(pushWorkout());

    await replaceWorkout(id, {
      date: '2026-09-30',
      name: 'Push (edited)',
      notes: 'moved a day earlier',
      exercises: [
        { exerciseId: rowId, sortOrder: 0, sets: [{ weightKg: 60, reps: 12, setOrder: 0 }] },
      ],
    });

    const detail = await getWorkoutDetail(id);
    expect(detail?.id).toBe(id);
    expect(detail?.date).toBe('2026-09-30');
    expect(detail?.name).toBe('Push (edited)');
    expect(detail?.notes).toBe('moved a day earlier');
    expect(detail?.exercises).toHaveLength(1);
    expect(detail?.exercises[0]!.exerciseId).toBe(rowId);
    expect(detail?.exercises[0]!.sets).toHaveLength(1);
  });

  it('leaves no orphaned links or sets behind', async () => {
    const id = await saveWorkout(pushWorkout());
    await replaceWorkout(id, {
      date: '2026-10-01',
      name: 'Push',
      notes: null,
      exercises: [
        { exerciseId: benchId, sortOrder: 0, sets: [{ weightKg: 85, reps: 5, setOrder: 0 }] },
      ],
    });

    expect(await tableCounts()).toEqual({ workouts: 1, links: 1, sets: 1 });
  });

  it('does not touch a sibling workout', async () => {
    const siblingId = await saveWorkout({ ...pushWorkout(), name: 'Sibling' });
    const targetId = await saveWorkout(pushWorkout());

    await replaceWorkout(targetId, {
      date: '2026-10-01',
      name: 'Rewritten',
      notes: null,
      exercises: [
        { exerciseId: rowId, sortOrder: 0, sets: [{ weightKg: 60, reps: 10, setOrder: 0 }] },
      ],
    });

    const sibling = await getWorkoutDetail(siblingId);
    expect(sibling?.name).toBe('Sibling');
    expect(sibling?.exercises).toHaveLength(2);
    expect(sibling?.exercises[0]!.sets).toHaveLength(2);
  });

  it('rolls back and keeps the original when the replacement is invalid', async () => {
    const id = await saveWorkout(pushWorkout());

    await expect(
      replaceWorkout(id, {
        date: '2026-10-01',
        name: 'Broken',
        notes: null,
        exercises: [
          { exerciseId: benchId, sortOrder: 0, sets: [{ weightKg: 80, reps: 8, setOrder: 0 }] },
          { exerciseId: 99999, sortOrder: 1, sets: [{ weightKg: 80, reps: 8, setOrder: 0 }] },
        ],
      }),
    ).rejects.toThrow();

    const detail = await getWorkoutDetail(id);
    expect(detail?.name).toBe('Push');
    expect(detail?.exercises).toHaveLength(2);
    expect(await tableCounts()).toEqual({ workouts: 1, links: 2, sets: 4 });
  });

  it('can empty a workout of everything but itself', async () => {
    const id = await saveWorkout(pushWorkout());
    await replaceWorkout(id, { date: '2026-10-01', name: 'Push', notes: null, exercises: [] });

    expect(await tableCounts()).toEqual({ workouts: 1, links: 0, sets: 0 });
  });
});

describe('deleteWorkout', () => {
  it('cascades to exercises and sets', async () => {
    const id = await saveWorkout(pushWorkout());
    await deleteWorkout(id);

    expect(await tableCounts()).toEqual({ workouts: 0, links: 0, sets: 0 });
    expect(await getWorkoutDetail(id)).toBeUndefined();
  });

  it('leaves the exercise library intact', async () => {
    const id = await saveWorkout(pushWorkout());
    const before = (await db.select().from(exercises)).length;
    await deleteWorkout(id);
    expect((await db.select().from(exercises)).length).toBe(before);
  });

  it('leaves sibling workouts alone', async () => {
    const keep = await saveWorkout({ ...pushWorkout(), name: 'Keep' });
    const drop = await saveWorkout(pushWorkout());
    await deleteWorkout(drop);

    expect(await getWorkoutDetail(keep)).toBeDefined();
    expect(await tableCounts()).toEqual({ workouts: 1, links: 2, sets: 4 });
  });
});

describe('getLastWorkoutByName', () => {
  it('finds the most recent workout sharing a name', async () => {
    await saveWorkout({ ...pushWorkout(), date: '2026-09-20' });
    await saveWorkout({ ...pushWorkout(), date: '2026-09-27' });
    await saveWorkout({ ...pushWorkout(), date: '2026-09-24' });

    const last = await getLastWorkoutByName('Push');
    expect(last?.date).toBe('2026-09-27');
  });

  it('respects an on-or-before cutoff', async () => {
    await saveWorkout({ ...pushWorkout(), date: '2026-09-20' });
    await saveWorkout({ ...pushWorkout(), date: '2026-09-27' });

    const last = await getLastWorkoutByName('Push', { onOrBefore: '2026-09-25' });
    expect(last?.date).toBe('2026-09-20');
  });

  it('excludes the workout being edited', async () => {
    const first = await saveWorkout({ ...pushWorkout(), date: '2026-09-20' });
    const second = await saveWorkout({ ...pushWorkout(), date: '2026-09-27' });

    const last = await getLastWorkoutByName('Push', { excludeWorkoutId: second });
    expect(last?.id).toBe(first);
  });

  it('returns undefined when the name has never been used', async () => {
    expect(await getLastWorkoutByName('Never Done This')).toBeUndefined();
  });
});

describe('runInTransaction rejects an asynchronous callback at compile time too', () => {
  it('will not typecheck an async callback', () => {
    // If the NotPromise guard is ever loosened, @ts-expect-error becomes unused and
    // `npm run typecheck` fails — this test is a compile-time assertion, not a runtime one.
    // @ts-expect-error async callbacks must be rejected by the signature
    const reject = () => runInTransaction(async () => 1);
    expect(typeof reject).toBe('function');
  });
});

describe('drop sets through the database', () => {
  it('round-trips the flag', async () => {
    const id = await saveWorkout({
      date: '2026-09-27',
      name: 'Push',
      notes: null,
      exercises: [
        {
          exerciseId: benchId,
          sortOrder: 0,
          sets: [
            { weightKg: 100, reps: 5, setOrder: 0 },
            { weightKg: 80, reps: 6, setOrder: 1, isDropSet: true },
            { weightKg: 60, reps: 8, setOrder: 2, isDropSet: true },
          ],
        },
      ],
    });

    const detail = await getWorkoutDetail(id);
    expect(detail!.exercises[0]!.sets.map((set) => set.isDropSet)).toEqual([false, true, true]);
  });

  it('defaults to false when the caller omits it', async () => {
    const id = await saveWorkout({
      date: '2026-09-27',
      name: 'Push',
      notes: null,
      exercises: [
        { exerciseId: benchId, sortOrder: 0, sets: [{ weightKg: 100, reps: 5, setOrder: 0 }] },
      ],
    });

    const detail = await getWorkoutDetail(id);
    expect(detail!.exercises[0]!.sets[0]!.isDropSet).toBe(false);
  });

  it('is carried by recall, so a prefill reproduces the drop', async () => {
    await saveWorkout({
      date: '2026-09-20',
      name: 'Push',
      notes: null,
      exercises: [
        {
          exerciseId: benchId,
          sortOrder: 0,
          sets: [
            { weightKg: 100, reps: 5, setOrder: 0 },
            { weightKg: 80, reps: 6, setOrder: 1, isDropSet: true },
          ],
        },
      ],
    });

    const session = await getLastSession(benchId, { onOrBefore: '2026-09-27' });
    expect(session?.sets.map((set) => set.isDropSet)).toEqual([false, true]);
  });

  it('survives an edit that replaces the workout', async () => {
    const id = await saveWorkout({
      date: '2026-09-27',
      name: 'Push',
      notes: null,
      exercises: [
        { exerciseId: benchId, sortOrder: 0, sets: [{ weightKg: 100, reps: 5, setOrder: 0 }] },
      ],
    });

    await replaceWorkout(id, {
      date: '2026-09-27',
      name: 'Push',
      notes: null,
      exercises: [
        {
          exerciseId: benchId,
          sortOrder: 0,
          sets: [
            { weightKg: 100, reps: 5, setOrder: 0 },
            { weightKg: 80, reps: 7, setOrder: 1, isDropSet: true },
          ],
        },
      ],
    });

    const detail = await getWorkoutDetail(id);
    expect(detail!.exercises[0]!.sets.map((set) => set.isDropSet)).toEqual([false, true]);
  });
});
