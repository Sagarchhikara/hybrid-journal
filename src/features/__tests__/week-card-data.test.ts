import { and, gte, lte } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/client';
import { getWeekSummary } from '@/db/queries/week';
import { runs, sleepEntries } from '@/db/schema';
import { seedDevData, seedExerciseLibrary } from '@/db/seed';
import { todayLocal } from '@/lib/dates';
import { currentWeekRange } from '@/lib/week';

import { applyMigrations, resetTables } from '../../db/__tests__/support/test-db';

beforeAll(applyMigrations);
beforeEach(resetTables);

/**
 * Cross-checks the Home card's numbers against the dev seed data, recomputing the
 * expected values in JavaScript from the raw rows rather than trusting the SQL
 * aggregates that produced them.
 */
describe('This week card against seed data', () => {
  it('matches totals computed independently from the rows', async () => {
    await seedExerciseLibrary();
    await seedDevData();

    const range = currentWeekRange(todayLocal());

    const weekRuns = await db
      .select()
      .from(runs)
      .where(and(gte(runs.date, range.start), lte(runs.date, range.end)));

    const weekSleep = await db
      .select()
      .from(sleepEntries)
      .where(and(gte(sleepEntries.date, range.start), lte(sleepEntries.date, range.end)));

    const expectedKm = weekRuns.reduce((total, run) => total + run.distanceKm, 0);
    const expectedSleepMean =
      weekSleep.length === 0
        ? null
        : weekSleep.reduce((total, entry) => total + entry.durationMin, 0) / weekSleep.length;

    const summary = await getWeekSummary(todayLocal());

    expect(summary.runCount).toBe(weekRuns.length);
    expect(summary.sleepDaysLogged).toBe(weekSleep.length);

    if (weekRuns.length === 0) {
      expect(summary.totalRunKm).toBeNull();
    } else {
      expect(summary.totalRunKm).toBeCloseTo(expectedKm, 6);
    }

    if (expectedSleepMean === null) {
      expect(summary.averageSleepMin).toBeNull();
    } else {
      expect(summary.averageSleepMin).toBeCloseTo(expectedSleepMean, 6);
    }
  });

  it('counts only this week, not the whole three weeks the seed covers', async () => {
    await seedExerciseLibrary();
    await seedDevData();

    const allRuns = await db.select().from(runs);
    const summary = await getWeekSummary(todayLocal());

    // The seed spans 21 days, so a Mon-Sun week must hold strictly fewer runs.
    expect(allRuns.length).toBeGreaterThan(summary.runCount);
    expect(summary.runCount).toBeGreaterThan(0);
  });

  it('every seeded row sits inside the three-week window, so none leaks into next week', async () => {
    await seedExerciseLibrary();
    await seedDevData();

    const today = todayLocal();
    const allRuns = await db.select().from(runs);
    expect(allRuns.every((run) => run.date <= today)).toBe(true);

    const allSleep = await db.select().from(sleepEntries);
    expect(allSleep.every((entry) => entry.date <= today)).toBe(true);
  });
});
