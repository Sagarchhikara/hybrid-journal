import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/client';
import { getHistoryPage, groupByDate } from '@/db/queries/history';
import { saveWorkout, type WorkoutInput } from '@/db/queries/gym';
import { upsertDailyMetric } from '@/db/queries/metrics';
import { createRun } from '@/db/queries/runs';
import { getSettings } from '@/db/queries/settings';
import { upsertSleep } from '@/db/queries/sleep';
import { exercises } from '@/db/schema';
import { seedExerciseLibrary } from '@/db/seed';
import { summarizeHistoryEntry } from '@/features/history/summarize';

import { applyMigrations, resetTables } from './support/test-db';

beforeAll(applyMigrations);

let benchId = 0;
let rowId = 0;

beforeEach(async () => {
  resetTables();
  await seedExerciseLibrary();
  const library = await db.select({ id: exercises.id, name: exercises.name }).from(exercises);
  const byName = new Map(library.map((row) => [row.name, row.id]));
  benchId = byName.get('Barbell Bench Press')!;
  rowId = byName.get('Barbell Row')!;
});

const BASE_RUN = { distanceKm: 6.2, durationSec: 2661, type: 'easy' as const, notes: null };

function workout(
  date: string,
  name: string,
  exerciseCount: number,
  setsEach: number,
): WorkoutInput {
  const ids = [benchId, rowId];
  return {
    date,
    name,
    notes: null,
    exercises: Array.from({ length: exerciseCount }, (_, index) => ({
      exerciseId: ids[index % ids.length]!,
      sortOrder: index,
      sets: Array.from({ length: setsEach }, (_, setIndex) => ({
        weightKg: 80,
        reps: 8,
        setOrder: setIndex,
      })),
    })),
  };
}

describe('gym rows in history', () => {
  it('appears with the summary from the spec', async () => {
    await saveWorkout(workout('2026-09-28', 'Push', 2, 3));

    const { entries } = await getHistoryPage({ before: '2026-09-29' });
    const settings = await getSettings();

    expect(entries).toHaveLength(1);
    expect(entries[0]!.kind).toBe('gym');
    expect(summarizeHistoryEntry(entries[0]!, settings)).toBe('Push · 2 exercises · 6 sets');
  });

  it('counts exercises and sets without loading them', async () => {
    await saveWorkout(workout('2026-09-28', 'Legs', 2, 4));

    const { entries } = await getHistoryPage({ before: '2026-09-29' });
    const entry = entries[0]!;
    expect(entry.kind).toBe('gym');
    if (entry.kind === 'gym') {
      expect(entry.workout.exerciseCount).toBe(2);
      expect(entry.workout.setCount).toBe(8);
    }
  });

  it('handles an unnamed workout', async () => {
    await saveWorkout({ ...workout('2026-09-28', 'x', 1, 2), name: null });

    const { entries } = await getHistoryPage({ before: '2026-09-29' });
    expect(summarizeHistoryEntry(entries[0]!, await getSettings())).toBe('1 exercise · 2 sets');
  });

  it('handles a workout with no exercises at all', async () => {
    await saveWorkout({ date: '2026-09-28', name: 'Aborted', notes: null, exercises: [] });

    const { entries } = await getHistoryPage({ before: '2026-09-29' });
    expect(summarizeHistoryEntry(entries[0]!, await getSettings())).toBe(
      'Aborted · 0 exercises · 0 sets',
    );
  });

  it('shows several workouts on one date as separate rows', async () => {
    await saveWorkout(workout('2026-09-28', 'Morning', 1, 2));
    await saveWorkout(workout('2026-09-28', 'Evening', 1, 3));

    const { entries } = await getHistoryPage({ before: '2026-09-29' });
    expect(entries).toHaveLength(2);
    expect(entries.every((entry) => entry.kind === 'gym')).toBe(true);
  });
});

describe('gym ranks first within a date', () => {
  it('orders gym before run, sleep, steps and weight', async () => {
    await createRun({ ...BASE_RUN, date: '2026-09-28' });
    await upsertSleep('2026-09-28', 462);
    await upsertDailyMetric('2026-09-28', { steps: 9412 });
    await upsertDailyMetric('2026-09-28', { weightKg: 72.4 });
    await saveWorkout(workout('2026-09-28', 'Push', 1, 3));

    const { entries } = await getHistoryPage({ before: '2026-09-29' });
    expect(entries.map((entry) => entry.kind)).toEqual(['gym', 'run', 'sleep', 'steps', 'weight']);
  });

  it('keeps gym first even when it was logged last', async () => {
    await saveWorkout(workout('2026-09-28', 'Push', 1, 1));
    await createRun({ ...BASE_RUN, date: '2026-09-28' });

    const { entries } = await getHistoryPage({ before: '2026-09-29' });
    expect(entries[0]!.kind).toBe('gym');
  });
});

describe('the Gym filter', () => {
  beforeEach(async () => {
    await saveWorkout(workout('2026-09-28', 'Push', 1, 2));
    await createRun({ ...BASE_RUN, date: '2026-09-28' });
    await upsertSleep('2026-09-28', 462);
    await upsertDailyMetric('2026-09-28', { steps: 9412 });
  });

  it('admits only gym workouts', async () => {
    const { entries } = await getHistoryPage({ before: '2026-09-29', filter: 'gym' });
    expect(entries.map((entry) => entry.kind)).toEqual(['gym']);
  });

  it('is excluded from the other filters', async () => {
    for (const filter of ['runs', 'sleep', 'body'] as const) {
      const { entries } = await getHistoryPage({ before: '2026-09-29', filter });
      expect(entries.some((entry) => entry.kind === 'gym')).toBe(false);
    }
  });

  it('is included in all', async () => {
    const { entries } = await getHistoryPage({ before: '2026-09-29', filter: 'all' });
    expect(entries.some((entry) => entry.kind === 'gym')).toBe(true);
  });

  it('skips empty windows for the gym filter only', async () => {
    // A lone old workout, far beyond one window, with runs in between.
    await saveWorkout(workout('2026-05-01', 'Ancient Push', 1, 1));
    await createRun({ ...BASE_RUN, date: '2026-07-15' });

    const first = await getHistoryPage({ before: '2026-09-29', filter: 'gym', windowDays: 30 });
    expect(first.entries.map((entry) => entry.date)).toEqual(['2026-09-28']);
    expect(first.nextBefore).not.toBeNull();

    const second = await getHistoryPage({
      before: first.nextBefore ?? undefined,
      filter: 'gym',
      windowDays: 30,
    });
    expect(second.entries.map((entry) => entry.date)).toEqual(['2026-05-01']);
    expect(second.nextBefore).toBeNull();
  });
});

describe('dense dates including gym workouts', () => {
  /** Three workouts, three runs, sleep, steps and weight on each of three dates. */
  async function seedDense(): Promise<void> {
    for (const date of ['2026-09-26', '2026-09-27', '2026-09-28']) {
      await saveWorkout(workout(date, 'A', 1, 2));
      await saveWorkout(workout(date, 'B', 1, 3));
      await saveWorkout(workout(date, 'C', 2, 2));
      await createRun({ ...BASE_RUN, date });
      await createRun({ ...BASE_RUN, date, distanceKm: 10 });
      await createRun({ ...BASE_RUN, date, distanceKm: 3 });
      await upsertSleep(date, 450);
      await upsertDailyMetric(date, { steps: 9000 });
      await upsertDailyMetric(date, { weightKg: 72 });
    }
  }

  it('keeps all 27 entries exactly once with a one-day window', async () => {
    await seedDense();

    const ids: string[] = [];
    let before: string | undefined;
    let pages = 0;

    for (;;) {
      const page = await getHistoryPage({ before, windowDays: 1 });
      ids.push(...page.entries.map((entry) => entry.id));
      pages += 1;
      expect(pages).toBeLessThan(40);
      if (page.nextBefore === null) break;
      before = page.nextBefore;
    }

    expect(ids).toHaveLength(27);
    expect(new Set(ids).size).toBe(27);
  });

  it('never splits a date across pages at any window size', async () => {
    await seedDense();

    for (const windowDays of [1, 2, 3, 7, 30]) {
      const seen = new Set<string>();
      let before: string | undefined;

      for (;;) {
        const page = await getHistoryPage({ before, windowDays });
        for (const date of new Set(page.entries.map((entry) => entry.date))) {
          expect(seen.has(date)).toBe(false);
          seen.add(date);
        }
        if (page.nextBefore === null) break;
        before = page.nextBefore;
      }

      expect(seen.size).toBe(3);
    }
  });

  it('groups a dense date with all three workouts leading', async () => {
    await seedDense();

    const { entries } = await getHistoryPage({ before: '2026-09-29', windowDays: 1 });
    const groups = groupByDate(entries);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.entries).toHaveLength(9);
    expect(groups[0]!.entries.slice(0, 3).every((entry) => entry.kind === 'gym')).toBe(true);
  });

  it('stays globally ordered across page boundaries', async () => {
    await seedDense();

    const dates: string[] = [];
    let before: string | undefined;
    for (;;) {
      const page = await getHistoryPage({ before, windowDays: 1 });
      dates.push(...page.entries.map((entry) => entry.date));
      if (page.nextBefore === null) break;
      before = page.nextBefore;
    }

    expect(dates).toEqual([...dates].sort().reverse());
  });
});
