import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/db/client';
import { getHistoryPage } from '@/db/queries/history';
import { getDailyMetric, upsertDailyMetric } from '@/db/queries/metrics';
import { createRun, getRun } from '@/db/queries/runs';
import { getSleepForDate, upsertSleep } from '@/db/queries/sleep';
import { setDistanceUnit, setWeightUnit, getSettings } from '@/db/queries/settings';
import { sleepEntries } from '@/db/schema';
import { summarizeHistoryEntry } from '@/features/history/summarize';
import { validateSteps, validateWeight } from '@/features/metrics/validate';
import { validateRun } from '@/features/runs/validate';
import { sleepDraftFromMinutes, validateSleep } from '@/features/sleep/validate';
import { fromStoredWeightKg } from '@/lib/units';

import { applyMigrations, resetTables } from '../../db/__tests__/support/test-db';

beforeAll(applyMigrations);
beforeEach(resetTables);

const DATE = '2026-10-01';

/**
 * These exercise the full chain each form runs on save: validate the typed draft, then
 * write it through the query layer. Unit tests cover the halves; this covers the join,
 * which is where a unit conversion or an upsert target would actually go wrong.
 */

describe('sleep form save path', () => {
  it('logging the same date twice updates instead of erroring', async () => {
    const first = validateSleep({ hours: '7', minutes: '42' });
    expect(first.durationMin).toBe(462);
    await upsertSleep(DATE, first.durationMin!);

    const second = validateSleep({ hours: '8', minutes: '15' });
    expect(second.durationMin).toBe(495);
    await expect(upsertSleep(DATE, second.durationMin!)).resolves.toBeUndefined();

    expect((await getSleepForDate(DATE))?.durationMin).toBe(495);
    expect(await db.select().from(sleepEntries)).toHaveLength(1);
  });

  it('round-trips an entry back into the form draft that produced it', async () => {
    await upsertSleep(DATE, 462);
    const stored = await getSleepForDate(DATE);
    const draft = sleepDraftFromMinutes(stored!.durationMin);

    expect(draft).toEqual({ hours: '7', minutes: '42' });
    expect(validateSleep(draft).durationMin).toBe(462);
  });

  it('saves a quick-pick value', async () => {
    const draft = sleepDraftFromMinutes(390);
    await upsertSleep(DATE, validateSleep(draft).durationMin!);
    expect((await getSleepForDate(DATE))?.durationMin).toBe(390);
  });
});

describe('steps and weight save paths are independent', () => {
  it('saving steps then weight keeps both', async () => {
    await upsertDailyMetric(DATE, { steps: validateSteps('9412').value! });
    await upsertDailyMetric(DATE, { weightKg: validateWeight('72.4', 'kg').value! });

    const row = await getDailyMetric(DATE);
    expect(row?.steps).toBe(9412);
    expect(row?.weightKg).toBeCloseTo(72.4, 10);
  });

  it('saving weight then steps keeps both', async () => {
    await upsertDailyMetric(DATE, { weightKg: validateWeight('72.4', 'kg').value! });
    await upsertDailyMetric(DATE, { steps: validateSteps('9412').value! });

    const row = await getDailyMetric(DATE);
    expect(row?.steps).toBe(9412);
    expect(row?.weightKg).toBeCloseTo(72.4, 10);
  });

  it('re-saving steps leaves the weight alone', async () => {
    await upsertDailyMetric(DATE, { weightKg: validateWeight('72.4', 'kg').value! });
    await upsertDailyMetric(DATE, { steps: validateSteps('1000').value! });
    await upsertDailyMetric(DATE, { steps: validateSteps('12500').value! });

    const row = await getDailyMetric(DATE);
    expect(row?.steps).toBe(12500);
    expect(row?.weightKg).toBeCloseTo(72.4, 10);
  });

  it('shows both as separate history entries on the same date', async () => {
    await upsertDailyMetric(DATE, { steps: 9412 });
    await upsertDailyMetric(DATE, { weightKg: 72.4 });

    const { entries } = await getHistoryPage({ before: '2026-10-02' });
    const settings = await getSettings();
    expect(entries.map((entry) => summarizeHistoryEntry(entry, settings))).toEqual([
      '9,412 steps',
      'Weight 72.4 kg',
    ]);
  });
});

describe('units are display-only across the whole chain', () => {
  it('a weight typed in pounds stores kg and prefills back as the same pounds', async () => {
    await setWeightUnit('lb');
    const { weightUnit } = await getSettings();

    const typed = '159.6';
    const validated = validateWeight(typed, weightUnit);
    await upsertDailyMetric(DATE, { weightKg: validated.value! });

    const stored = (await getDailyMetric(DATE))?.weightKg;
    expect(stored).toBeCloseTo(72.3933, 4);

    // What the form would put back in the input.
    const prefill = String(Number(fromStoredWeightKg(stored!, weightUnit).toFixed(1)));
    expect(prefill).toBe(typed);
  });

  it('a run typed in miles stores km and renders back in miles', async () => {
    await setDistanceUnit('mi');
    const { distanceUnit } = await getSettings();

    const validated = validateRun(
      { distance: '3.1', hours: '', minutes: '25', seconds: '00' },
      distanceUnit,
    );
    const id = await createRun({
      date: DATE,
      distanceKm: validated.value!.distanceKm,
      durationSec: validated.value!.durationSec,
      type: 'easy',
      notes: null,
    });

    expect((await getRun(id))?.distanceKm).toBeCloseTo(4.98897, 5);

    const { entries } = await getHistoryPage({ before: '2026-10-02' });
    const settings = await getSettings();
    expect(summarizeHistoryEntry(entries[0]!, settings)).toBe('3.1 mi · 25:00 · 8:04/mi · Easy');
  });

  it('toggling units after saving does not change the stored row', async () => {
    await upsertDailyMetric(DATE, { weightKg: validateWeight('72.4', 'kg').value! });
    const before = (await getDailyMetric(DATE))?.weightKg;

    await setWeightUnit('lb');
    await setDistanceUnit('mi');

    expect((await getDailyMetric(DATE))?.weightKg).toBe(before);
  });
});
