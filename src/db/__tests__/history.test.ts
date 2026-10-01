import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { getHistoryPage, groupByDate } from '@/db/queries/history';
import { upsertDailyMetric } from '@/db/queries/metrics';
import { createRun } from '@/db/queries/runs';
import { upsertSleep } from '@/db/queries/sleep';

import { applyMigrations, resetTables } from './support/test-db';

beforeAll(applyMigrations);
beforeEach(resetTables);

const BASE_RUN = { distanceKm: 6.2, durationSec: 2661, type: 'easy' as const, notes: null };

describe('getHistoryPage ordering', () => {
  it('returns newest date first', async () => {
    await createRun({ ...BASE_RUN, date: '2026-09-20' });
    await createRun({ ...BASE_RUN, date: '2026-09-28' });
    await createRun({ ...BASE_RUN, date: '2026-09-24' });

    const { entries } = await getHistoryPage({ before: '2026-10-01' });
    expect(entries.map((entry) => entry.date)).toEqual(['2026-09-28', '2026-09-24', '2026-09-20']);
  });

  it('mixes sources on the same date, training before body measurements', async () => {
    await createRun({ ...BASE_RUN, date: '2026-09-28' });
    await upsertSleep('2026-09-28', 462);
    await upsertDailyMetric('2026-09-28', { steps: 9412 });
    await upsertDailyMetric('2026-09-28', { weightKg: 72.4 });

    const { entries } = await getHistoryPage({ before: '2026-09-29' });
    expect(entries.map((entry) => entry.kind)).toEqual(['run', 'sleep', 'steps', 'weight']);
  });

  it('yields two entries from one daily_metrics row', async () => {
    await upsertDailyMetric('2026-09-28', { steps: 9412 });
    await upsertDailyMetric('2026-09-28', { weightKg: 72.4 });

    const { entries } = await getHistoryPage({ before: '2026-09-29' });
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.id)).toEqual(['steps-2026-09-28', 'weight-2026-09-28']);
  });

  it('omits a daily_metrics row whose fields are both null', async () => {
    await upsertDailyMetric('2026-09-28', { steps: 100 });
    const { entries: before } = await getHistoryPage({ before: '2026-09-29' });
    expect(before).toHaveLength(1);

    // Writing the other field then clearing the first leaves a row with one value.
    await upsertDailyMetric('2026-09-28', { weightKg: 80 });
    const { entries: after } = await getHistoryPage({ before: '2026-09-29' });
    expect(after.map((entry) => entry.kind)).toEqual(['steps', 'weight']);
  });
});

describe('getHistoryPage filters', () => {
  beforeEach(async () => {
    await createRun({ ...BASE_RUN, date: '2026-09-28' });
    await upsertSleep('2026-09-28', 462);
    await upsertDailyMetric('2026-09-28', { steps: 9412 });
    await upsertDailyMetric('2026-09-28', { weightKg: 72.4 });
  });

  it('all admits every kind', async () => {
    const { entries } = await getHistoryPage({ before: '2026-09-29', filter: 'all' });
    expect(entries.map((entry) => entry.kind)).toEqual(['run', 'sleep', 'steps', 'weight']);
  });

  it('runs admits only runs', async () => {
    const { entries } = await getHistoryPage({ before: '2026-09-29', filter: 'runs' });
    expect(entries.map((entry) => entry.kind)).toEqual(['run']);
  });

  it('sleep admits only sleep', async () => {
    const { entries } = await getHistoryPage({ before: '2026-09-29', filter: 'sleep' });
    expect(entries.map((entry) => entry.kind)).toEqual(['sleep']);
  });

  it('body admits steps and weight but not runs or sleep', async () => {
    const { entries } = await getHistoryPage({ before: '2026-09-29', filter: 'body' });
    expect(entries.map((entry) => entry.kind)).toEqual(['steps', 'weight']);
  });
});

describe('getHistoryPage pagination', () => {
  it('is empty with no data, and reports nothing older', async () => {
    expect(await getHistoryPage()).toEqual({ entries: [], nextBefore: null });
  });

  it('pages backwards through a long history without repeating or dropping rows', async () => {
    // 90 days of runs, well beyond one 30-day window.
    for (let day = 0; day < 90; day += 1) {
      const date = `2026-${String(7 + Math.floor(day / 30)).padStart(2, '0')}-${String((day % 30) + 1).padStart(2, '0')}`;
      await createRun({ ...BASE_RUN, date });
    }

    const seen: string[] = [];
    let before: string | undefined;
    let pages = 0;

    for (;;) {
      const page = await getHistoryPage({ before, windowDays: 30 });
      seen.push(...page.entries.map((entry) => entry.date));
      pages += 1;
      if (page.nextBefore === null) break;
      before = page.nextBefore;
      expect(pages).toBeLessThan(20);
    }

    expect(pages).toBeGreaterThan(1);
    expect(seen).toHaveLength(90);
    expect(new Set(seen).size).toBe(90);
    // Still globally ordered newest first across page boundaries.
    expect([...seen].sort().reverse()).toEqual(seen);
  });

  it('skips an empty gap instead of returning a blank page', async () => {
    await createRun({ ...BASE_RUN, date: '2026-09-28' });
    // A four-month gap, far wider than one window.
    await createRun({ ...BASE_RUN, date: '2026-05-01' });

    const first = await getHistoryPage({ before: '2026-09-29', windowDays: 30 });
    expect(first.entries.map((entry) => entry.date)).toEqual(['2026-09-28']);
    expect(first.nextBefore).not.toBeNull();

    const second = await getHistoryPage({ before: first.nextBefore ?? undefined, windowDays: 30 });
    expect(second.entries.map((entry) => entry.date)).toEqual(['2026-05-01']);
    expect(second.nextBefore).toBeNull();
  });

  it('respects the filter when deciding how far back data exists', async () => {
    await createRun({ ...BASE_RUN, date: '2026-09-28' });
    await upsertSleep('2026-01-05', 400);

    // Filtering to runs must not keep paging towards the much older sleep entry.
    const page = await getHistoryPage({ before: '2026-09-29', filter: 'runs', windowDays: 30 });
    expect(page.entries.map((entry) => entry.date)).toEqual(['2026-09-28']);
    expect(page.nextBefore).toBeNull();
  });
});

describe('groupByDate', () => {
  it('groups consecutive entries under one date', async () => {
    await createRun({ ...BASE_RUN, date: '2026-09-28' });
    await upsertSleep('2026-09-28', 462);
    await createRun({ ...BASE_RUN, date: '2026-09-27' });

    const { entries } = await getHistoryPage({ before: '2026-09-29' });
    const groups = groupByDate(entries);

    expect(groups.map((group) => group.date)).toEqual(['2026-09-28', '2026-09-27']);
    expect(groups[0]?.entries).toHaveLength(2);
    expect(groups[1]?.entries).toHaveLength(1);
  });

  it('returns nothing for an empty list', () => {
    expect(groupByDate([])).toEqual([]);
  });
});

describe('getHistoryPage with several entries on one date', () => {
  /** Three runs plus sleep, steps and weight on each of three consecutive dates. */
  async function seedDenseDates(): Promise<void> {
    for (const date of ['2026-09-26', '2026-09-27', '2026-09-28']) {
      await createRun({ ...BASE_RUN, date, distanceKm: 5 });
      await createRun({ ...BASE_RUN, date, distanceKm: 8 });
      await createRun({ ...BASE_RUN, date, distanceKm: 12 });
      await upsertSleep(date, 450);
      await upsertDailyMetric(date, { steps: 9000 });
      await upsertDailyMetric(date, { weightKg: 72 });
    }
  }

  async function walkAllPages(windowDays: number): Promise<string[]> {
    const ids: string[] = [];
    let before: string | undefined;
    let pages = 0;

    for (;;) {
      const page = await getHistoryPage({ before, windowDays });
      ids.push(...page.entries.map((entry) => entry.id));
      pages += 1;
      expect(pages).toBeLessThan(40);
      if (page.nextBefore === null) break;
      before = page.nextBefore;
    }

    return ids;
  }

  it('keeps all 18 entries exactly once with a window of one day', async () => {
    await seedDenseDates();
    const ids = await walkAllPages(1);

    expect(ids).toHaveLength(18);
    expect(new Set(ids).size).toBe(18);
  });

  it('never splits one date across two pages, whatever the window size', async () => {
    await seedDenseDates();

    for (const windowDays of [1, 2, 3, 7, 30]) {
      const datesPerPage: string[][] = [];
      let before: string | undefined;

      for (;;) {
        const page = await getHistoryPage({ before, windowDays });
        if (page.entries.length > 0) {
          datesPerPage.push([...new Set(page.entries.map((entry) => entry.date))]);
        }
        if (page.nextBefore === null) break;
        before = page.nextBefore;
      }

      // A date appearing in two different pages would mean the cursor resumed
      // mid-date and the UI would render a duplicate date header.
      const seen = new Set<string>();
      for (const dates of datesPerPage) {
        for (const date of dates) {
          expect(seen.has(date)).toBe(false);
          seen.add(date);
        }
      }
      expect(seen.size).toBe(3);
    }
  });

  it('returns all 6 entries for a date together, correctly ordered, with a one-day window', async () => {
    await seedDenseDates();

    const page = await getHistoryPage({ before: '2026-09-29', windowDays: 1 });
    expect(page.entries).toHaveLength(6);
    expect(page.entries.every((entry) => entry.date === '2026-09-28')).toBe(true);
    expect(page.entries.map((entry) => entry.kind)).toEqual([
      'run',
      'run',
      'run',
      'sleep',
      'steps',
      'weight',
    ]);
  });

  it('stays globally ordered across page boundaries with a one-day window', async () => {
    await seedDenseDates();
    let before: string | undefined;
    const dates: string[] = [];

    for (;;) {
      const page = await getHistoryPage({ before, windowDays: 1 });
      dates.push(...page.entries.map((entry) => entry.date));
      if (page.nextBefore === null) break;
      before = page.nextBefore;
    }

    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('advances the cursor strictly backwards so a dense date cannot loop', async () => {
    await seedDenseDates();
    const cursors: (string | null)[] = [];
    let before: string | undefined;

    for (;;) {
      const page = await getHistoryPage({ before, windowDays: 1 });
      cursors.push(page.nextBefore);
      if (page.nextBefore === null) break;
      expect(before === undefined || page.nextBefore < before).toBe(true);
      before = page.nextBefore;
    }

    expect(cursors.at(-1)).toBeNull();
  });
});
