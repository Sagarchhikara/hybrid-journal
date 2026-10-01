import { beforeAll, describe, expect, it } from 'vitest';

import { db } from '@/db/client';
import { runs } from '@/db/schema';

import { appliedMigrationFiles, applyMigrations } from './support/test-db';

beforeAll(applyMigrations);

describe('shim wiring', () => {
  it('applies both migrations', () => {
    expect(appliedMigrationFiles()).toEqual(['0000_init.sql', '0001_app_settings.sql']);
  });

  it('round-trips an insert through the real drizzle query builder', async () => {
    const [row] = await db
      .insert(runs)
      .values({ date: '2026-10-01', distanceKm: 6.2, durationSec: 2661, type: 'easy', notes: null })
      .returning({ id: runs.id, date: runs.date });

    expect(row?.id).toBeGreaterThan(0);
    expect(row?.date).toBe('2026-10-01');

    const all = await db.select().from(runs);
    expect(all).toHaveLength(1);
    expect(all[0]?.distanceKm).toBeCloseTo(6.2, 10);
    expect(all[0]?.createdAt).toBeInstanceOf(Date);
  });
});
