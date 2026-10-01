import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/client';
import { getDailyMetric, upsertDailyMetric } from '@/db/queries/metrics';
import { createRun, getRun } from '@/db/queries/runs';
import {
  DEFAULT_SETTINGS,
  getSettings,
  setDistanceUnit,
  setWeightUnit,
} from '@/db/queries/settings';
import { appSettings } from '@/db/schema';
import {
  formatDistance,
  formatWeight,
  fromStoredDistanceKm,
  fromStoredWeightKg,
  toStoredDistanceKm,
  toStoredWeightKg,
} from '@/lib/units';

import { applyMigrations, resetTables } from './support/test-db';

beforeAll(applyMigrations);
beforeEach(resetTables);

describe('getSettings', () => {
  it('defaults to kg and km with no rows at all', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to the defaults when a stored value is unrecognised', async () => {
    await db.insert(appSettings).values({ key: 'weight_unit', value: 'stones' });
    await db.insert(appSettings).values({ key: 'distance_unit', value: 'furlongs' });
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips both units', async () => {
    await setWeightUnit('lb');
    await setDistanceUnit('mi');
    expect(await getSettings()).toEqual({ weightUnit: 'lb', distanceUnit: 'mi' });

    await setWeightUnit('kg');
    expect(await getSettings()).toEqual({ weightUnit: 'kg', distanceUnit: 'mi' });
  });

  it('upserts rather than duplicating a key', async () => {
    await setWeightUnit('lb');
    await setWeightUnit('kg');
    await setWeightUnit('lb');
    const rows = await db.select().from(appSettings);
    expect(rows.filter((row) => row.key === 'weight_unit')).toHaveLength(1);
  });

  it('returns to the defaults once the rows are gone, as after a dev data reset', async () => {
    await setWeightUnit('lb');
    await setDistanceUnit('mi');
    await db.delete(appSettings);
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe('unit toggles do not alter stored data', () => {
  it('leaves a stored weight untouched when the display unit changes', async () => {
    // The user enters 72.4 while in kg.
    await upsertDailyMetric('2026-10-01', { weightKg: toStoredWeightKg(72.4, 'kg') });
    const stored = (await getDailyMetric('2026-10-01'))?.weightKg;
    expect(stored).toBeCloseTo(72.4, 10);

    await setWeightUnit('lb');

    // Same row, same kg; only the rendering changes.
    expect((await getDailyMetric('2026-10-01'))?.weightKg).toBe(stored);
    expect(formatWeight(stored!, 'kg')).toBe('72.4 kg');
    expect(formatWeight(stored!, 'lb')).toBe('159.6 lb');
  });

  it('round-trips a weight entered in pounds back to the same pounds', async () => {
    const enteredLb = 159.6;
    await upsertDailyMetric('2026-10-01', { weightKg: toStoredWeightKg(enteredLb, 'lb') });

    const stored = (await getDailyMetric('2026-10-01'))?.weightKg;
    expect(stored).toBeCloseTo(72.3933, 4);
    expect(fromStoredWeightKg(stored!, 'lb')).toBeCloseTo(enteredLb, 8);
  });

  it('round-trips a distance entered in miles back to the same miles', async () => {
    const enteredMi = 3.1;
    const id = await createRun({
      date: '2026-10-01',
      distanceKm: toStoredDistanceKm(enteredMi, 'mi'),
      durationSec: 1500,
      type: 'easy',
      notes: null,
    });

    const stored = (await getRun(id))?.distanceKm;
    expect(stored).toBeCloseTo(4.989, 3);
    expect(fromStoredDistanceKm(stored!, 'mi')).toBeCloseTo(enteredMi, 8);
    expect(formatDistance(stored!, 'km')).toBe('4.99 km');
    expect(formatDistance(stored!, 'mi')).toBe('3.10 mi');
  });

  it('keeps storage in km even after the user switches to miles', async () => {
    await setDistanceUnit('mi');
    const { distanceUnit } = await getSettings();

    // A form converts with whatever unit is active, and storage stays km.
    const id = await createRun({
      date: '2026-10-01',
      distanceKm: toStoredDistanceKm(6.2, distanceUnit),
      durationSec: 2661,
      type: 'easy',
      notes: null,
    });

    expect((await getRun(id))?.distanceKm).toBeCloseTo(9.978, 3);
  });
});
