import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { clearDailyMetricField, getDailyMetric, upsertDailyMetric } from '@/db/queries/metrics';

import { applyMigrations, resetTables } from './support/test-db';

beforeAll(applyMigrations);
beforeEach(resetTables);

describe('upsertDailyMetric', () => {
  it('creates a row with only the field provided', async () => {
    await upsertDailyMetric('2026-10-01', { steps: 9412 });

    const row = await getDailyMetric('2026-10-01');
    expect(row?.steps).toBe(9412);
    expect(row?.weightKg).toBeNull();
  });

  it("SAVING STEPS DOES NOT CLEAR THAT DAY'S WEIGHT", async () => {
    await upsertDailyMetric('2026-10-01', { weightKg: 72.4 });
    await upsertDailyMetric('2026-10-01', { steps: 9412 });

    const row = await getDailyMetric('2026-10-01');
    expect(row?.weightKg).toBeCloseTo(72.4, 10);
    expect(row?.steps).toBe(9412);
  });

  it("saving weight does not clear that day's steps", async () => {
    await upsertDailyMetric('2026-10-01', { steps: 9412 });
    await upsertDailyMetric('2026-10-01', { weightKg: 72.4 });

    const row = await getDailyMetric('2026-10-01');
    expect(row?.steps).toBe(9412);
    expect(row?.weightKg).toBeCloseTo(72.4, 10);
  });

  it('re-logging the same field overwrites only that field', async () => {
    await upsertDailyMetric('2026-10-01', { steps: 1000 });
    await upsertDailyMetric('2026-10-01', { weightKg: 72.4 });
    await upsertDailyMetric('2026-10-01', { steps: 12500 });

    const row = await getDailyMetric('2026-10-01');
    expect(row?.steps).toBe(12500);
    expect(row?.weightKg).toBeCloseTo(72.4, 10);
  });

  it('keeps one row per date no matter how many writes', async () => {
    for (let i = 0; i < 5; i += 1) {
      await upsertDailyMetric('2026-10-01', { steps: 1000 * i });
      await upsertDailyMetric('2026-10-01', { weightKg: 70 + i });
    }
    const row = await getDailyMetric('2026-10-01');
    expect(row?.steps).toBe(4000);
    expect(row?.weightKg).toBeCloseTo(74, 10);
  });

  it('keeps separate dates independent', async () => {
    await upsertDailyMetric('2026-10-01', { steps: 1000 });
    await upsertDailyMetric('2026-10-02', { steps: 2000 });

    expect((await getDailyMetric('2026-10-01'))?.steps).toBe(1000);
    expect((await getDailyMetric('2026-10-02'))?.steps).toBe(2000);
  });
});

describe('clearDailyMetricField', () => {
  it('clears one field and keeps the other', async () => {
    await upsertDailyMetric('2026-10-01', { steps: 9412 });
    await upsertDailyMetric('2026-10-01', { weightKg: 72.4 });

    await clearDailyMetricField('2026-10-01', 'steps');

    const row = await getDailyMetric('2026-10-01');
    expect(row?.steps).toBeNull();
    expect(row?.weightKg).toBeCloseTo(72.4, 10);
  });

  it('drops the row once both fields are empty, leaving nothing in history', async () => {
    await upsertDailyMetric('2026-10-01', { steps: 9412 });
    await clearDailyMetricField('2026-10-01', 'steps');
    expect(await getDailyMetric('2026-10-01')).toBeUndefined();
  });

  it('is a no-op for a date with no row', async () => {
    await expect(clearDailyMetricField('2026-01-01', 'steps')).resolves.toBeUndefined();
  });
});
