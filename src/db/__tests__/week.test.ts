import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createRun } from '@/db/queries/runs';
import { upsertSleep } from '@/db/queries/sleep';
import { getWeekSummary } from '@/db/queries/week';

import { applyMigrations, resetTables } from './support/test-db';

beforeAll(applyMigrations);
beforeEach(resetTables);

const BASE_RUN = { durationSec: 2661, type: 'easy' as const, notes: null };

/** Wednesday of the Mon 2026-09-28 .. Sun 2026-10-04 week. */
const MID_WEEK = '2026-09-30';

describe('getWeekSummary', () => {
  it('reports the Monday-to-Sunday range', async () => {
    const summary = await getWeekSummary(MID_WEEK);
    expect(summary.range).toEqual({ start: '2026-09-28', end: '2026-10-04' });
  });

  it('shows nulls rather than zeros when nothing is logged', async () => {
    const summary = await getWeekSummary(MID_WEEK);
    expect(summary.totalRunKm).toBeNull();
    expect(summary.runCount).toBe(0);
    expect(summary.averageSleepMin).toBeNull();
    expect(summary.sleepDaysLogged).toBe(0);
  });

  it('matches a hand-computed total and average', async () => {
    // In the week: 6.2 + 10.0 + 21.1 = 37.3 km over 3 runs.
    await createRun({ ...BASE_RUN, date: '2026-09-28', distanceKm: 6.2 });
    await createRun({ ...BASE_RUN, date: '2026-09-30', distanceKm: 10.0 });
    await createRun({ ...BASE_RUN, date: '2026-10-04', distanceKm: 21.1 });

    // In the week: (420 + 480 + 462) / 3 = 454 minutes over 3 days logged.
    await upsertSleep('2026-09-28', 420);
    await upsertSleep('2026-09-29', 480);
    await upsertSleep('2026-10-04', 462);

    const summary = await getWeekSummary(MID_WEEK);
    expect(summary.totalRunKm).toBeCloseTo(37.3, 10);
    expect(summary.runCount).toBe(3);
    expect(summary.averageSleepMin).toBeCloseTo(454, 10);
    expect(summary.sleepDaysLogged).toBe(3);
  });

  it('excludes the Sunday before and the Monday after — the boundary a Sunday-start week gets wrong', async () => {
    await createRun({ ...BASE_RUN, date: '2026-09-27', distanceKm: 99 }); // previous week's Sunday
    await createRun({ ...BASE_RUN, date: '2026-10-05', distanceKm: 99 }); // next week's Monday
    await createRun({ ...BASE_RUN, date: '2026-09-28', distanceKm: 5 }); // this week's Monday
    await createRun({ ...BASE_RUN, date: '2026-10-04', distanceKm: 5 }); // this week's Sunday

    await upsertSleep('2026-09-27', 999);
    await upsertSleep('2026-10-05', 999);
    await upsertSleep('2026-09-28', 400);

    const summary = await getWeekSummary(MID_WEEK);
    expect(summary.totalRunKm).toBeCloseTo(10, 10);
    expect(summary.runCount).toBe(2);
    expect(summary.averageSleepMin).toBeCloseTo(400, 10);
    expect(summary.sleepDaysLogged).toBe(1);
  });

  it('averages sleep over days logged, not over seven', async () => {
    await upsertSleep('2026-09-28', 400);
    await upsertSleep('2026-09-29', 500);

    const summary = await getWeekSummary(MID_WEEK);
    expect(summary.averageSleepMin).toBeCloseTo(450, 10);
    expect(summary.sleepDaysLogged).toBe(2);
  });

  it('counts two runs on one date separately', async () => {
    await createRun({ ...BASE_RUN, date: '2026-09-30', distanceKm: 5 });
    await createRun({ ...BASE_RUN, date: '2026-09-30', distanceKm: 8 });

    const summary = await getWeekSummary(MID_WEEK);
    expect(summary.runCount).toBe(2);
    expect(summary.totalRunKm).toBeCloseTo(13, 10);
  });
});

describe('aggregate decoding', () => {
  it('pins the fact that drizzle decodes SUM and AVG as strings, which is why toNumberOrNull exists', async () => {
    const { avg, count, sum } = await import('drizzle-orm');
    const { db } = await import('@/db/client');
    const { runs } = await import('@/db/schema');

    await createRun({ ...BASE_RUN, date: '2026-09-28', distanceKm: 6.2 });
    await createRun({ ...BASE_RUN, date: '2026-09-29', distanceKm: 10 });

    const [row] = await db
      .select({ total: sum(runs.distanceKm), mean: avg(runs.distanceKm), entries: count() })
      .from(runs);

    expect(typeof row?.total).toBe('string');
    expect(typeof row?.mean).toBe('string');
    expect(typeof row?.entries).toBe('number');
  });

  it('returns real numbers from getWeekSummary despite that, not concatenated strings', async () => {
    await createRun({ ...BASE_RUN, date: '2026-09-28', distanceKm: 6.2 });
    await createRun({ ...BASE_RUN, date: '2026-09-29', distanceKm: 10 });

    const summary = await getWeekSummary(MID_WEEK);
    expect(typeof summary.totalRunKm).toBe('number');
    // '6.2' + '10' would be '6.210'; the cast makes it 16.2.
    expect(summary.totalRunKm).toBeCloseTo(16.2, 10);
  });

  it('gives null, not NaN, for an aggregate over zero rows', async () => {
    const summary = await getWeekSummary(MID_WEEK);
    expect(summary.totalRunKm).toBeNull();
    expect(summary.averageSleepMin).toBeNull();
    expect(Number.isNaN(summary.totalRunKm as number)).toBe(false);
  });
});
