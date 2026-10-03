import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/db/client';
import { saveWorkout } from '@/db/queries/gym';
import { clearGymDraft, readGymDraft, writeGymDraft } from '@/db/queries/gym-draft';
import { exercises, gymWorkouts } from '@/db/schema';
import { seedExerciseLibrary } from '@/db/seed';
import { createDraft, draftReducer, type WorkoutDraft } from '@/features/gym/draft';
import { createDraftWriter } from '@/features/gym/draft-writer';
import { validateDraft } from '@/features/gym/draft-rows';

import { applyMigrations, resetTables } from './support/test-db';

beforeAll(applyMigrations);
beforeEach(async () => {
  resetTables();
  await seedExerciseLibrary();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

/** The real writer the logging screen uses, pointed at the real app_settings row. */
function realWriter() {
  return createDraftWriter({ write: (next) => writeGymDraft(next, { silent: true }) });
}

async function benchDraft(): Promise<WorkoutDraft> {
  const [bench] = await db
    .select({ id: exercises.id, name: exercises.name, isBodyweight: exercises.isBodyweight })
    .from(exercises)
    .limit(1);

  let draft = createDraft({ date: '2026-09-27', name: 'Push' });
  draft = draftReducer(draft, {
    type: 'addExercise',
    exercise: { exerciseId: bench!.id, name: bench!.name, isBodyweight: bench!.isBodyweight },
  });
  const setId = draft.exercises[0]!.sets[0]!.localId;
  return draftReducer(draft, {
    type: 'updateSet',
    exerciseLocalId: draft.exercises[0]!.localId,
    setLocalId: setId,
    patch: { weight: '80', reps: '5' },
  });
}

describe('the draft a resume banner reads', () => {
  it('is there while a workout is in progress', async () => {
    const writer = realWriter();
    writer.schedule(await benchDraft());
    await vi.advanceTimersByTimeAsync(1000);

    const stored = await readGymDraft();
    expect(stored?.name).toBe('Push');
    expect(stored?.exercises).toHaveLength(1);
  });

  it('is gone once the workout is finished', async () => {
    const draft = await benchDraft();
    const writer = realWriter();
    writer.schedule(draft);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await readGymDraft()).not.toBeNull();

    // The finish sequence, in the order the session hook runs it.
    writer.disable();
    const rows = validateDraft(draft, 'kg').rows;
    expect(rows).not.toBeNull();
    await saveWorkout(rows!);
    await clearGymDraft();

    expect(await readGymDraft()).toBeNull();
  });

  it('does not come back from a write that was already in flight when Finish ran', async () => {
    // The race the writer's disable() exists for: a keystroke 100ms before Finish leaves
    // a debounced write pending, and it must not land after the draft row is deleted.
    const draft = await benchDraft();
    const writer = realWriter();

    writer.schedule(draft);
    await vi.advanceTimersByTimeAsync(100);
    expect(writer.hasPending()).toBe(true);

    writer.disable();
    await saveWorkout(validateDraft(draft, 'kg').rows!);
    await clearGymDraft();

    // Well past the debounce: the pending write must have been dropped, not deferred.
    await vi.advanceTimersByTimeAsync(5000);
    expect(await readGymDraft()).toBeNull();

    const workouts = await db.select({ id: gymWorkouts.id }).from(gymWorkouts);
    expect(workouts).toHaveLength(1);
  });

  it('survives a background flush before Finish, and still clears after it', async () => {
    const draft = await benchDraft();
    const writer = realWriter();

    // Backgrounding the app flushes immediately rather than waiting out the debounce.
    writer.schedule(draft);
    await writer.flush();
    expect(await readGymDraft()).not.toBeNull();

    writer.disable();
    await saveWorkout(validateDraft(draft, 'kg').rows!);
    await clearGymDraft();

    // A flush arriving after Finish is ignored too, not just a timer.
    await writer.flush();
    expect(await readGymDraft()).toBeNull();
  });

  it('keeps persisting after a failed save, so the banner still offers the workout', async () => {
    const draft = await benchDraft();
    const writer = realWriter();

    // What the session hook does when saveWorkout throws: re-arm and let the user retry.
    writer.disable();
    writer.enable();
    writer.schedule(draft);
    await vi.advanceTimersByTimeAsync(1000);

    expect(await readGymDraft()).not.toBeNull();
  });
});
