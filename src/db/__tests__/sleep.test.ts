import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/client';
import { deleteSleep, getSleepForDate, upsertSleep } from '@/db/queries/sleep';
import { sleepEntries } from '@/db/schema';

import { applyMigrations, resetTables } from './support/test-db';

beforeAll(applyMigrations);
beforeEach(resetTables);

describe('upsertSleep', () => {
  it('creates an entry', async () => {
    await upsertSleep('2026-10-01', 462);
    expect((await getSleepForDate('2026-10-01'))?.durationMin).toBe(462);
  });

  it('LOGGING SLEEP TWICE FOR THE SAME DATE UPDATES RATHER THAN ERRORS', async () => {
    await upsertSleep('2026-10-01', 462);
    await expect(upsertSleep('2026-10-01', 500)).resolves.toBeUndefined();

    expect((await getSleepForDate('2026-10-01'))?.durationMin).toBe(500);

    const all = await db.select().from(sleepEntries);
    expect(all).toHaveLength(1);
  });

  it('survives many repeated saves of the same date', async () => {
    for (const minutes of [400, 410, 420, 430, 440]) {
      await upsertSleep('2026-10-01', minutes);
    }
    const all = await db.select().from(sleepEntries);
    expect(all).toHaveLength(1);
    expect(all[0]?.durationMin).toBe(440);
  });

  it('keeps separate dates independent', async () => {
    await upsertSleep('2026-10-01', 462);
    await upsertSleep('2026-10-02', 390);
    expect((await getSleepForDate('2026-10-01'))?.durationMin).toBe(462);
    expect((await getSleepForDate('2026-10-02'))?.durationMin).toBe(390);
  });
});

describe('deleteSleep', () => {
  it('removes the entry for that date only', async () => {
    await upsertSleep('2026-10-01', 462);
    await upsertSleep('2026-10-02', 390);

    await deleteSleep('2026-10-01');

    expect(await getSleepForDate('2026-10-01')).toBeUndefined();
    expect((await getSleepForDate('2026-10-02'))?.durationMin).toBe(390);
  });
});
