import { eq } from 'drizzle-orm';

import type { DateKey } from '@/lib/dates';

import { bumpDataVersion } from '../data-version';
import { db } from '../client';
import { dailyMetrics, type DailyMetric } from '../schema';

/** Exactly one of the two fields. Saving steps must not disturb that day's weight. */
export type DailyMetricPatch = { steps: number } | { weightKg: number };

/**
 * One row per date, upserted. The `set` clause names only the field being written, so
 * the other column keeps whatever was already there — that is the whole reason this is
 * a single `onConflictDoUpdate` per field rather than a read-modify-write.
 */
export async function upsertDailyMetric(date: DateKey, patch: DailyMetricPatch): Promise<void> {
  if ('steps' in patch) {
    await db
      .insert(dailyMetrics)
      .values({ date, steps: patch.steps })
      .onConflictDoUpdate({ target: dailyMetrics.date, set: { steps: patch.steps } });
  } else {
    await db
      .insert(dailyMetrics)
      .values({ date, weightKg: patch.weightKg })
      .onConflictDoUpdate({ target: dailyMetrics.date, set: { weightKg: patch.weightKg } });
  }
  bumpDataVersion();
}

export type DailyMetricField = 'steps' | 'weightKg';

/**
 * Clears one field and drops the row once both are empty, so deleting a weight entry
 * does not leave a blank row showing up in history.
 */
export async function clearDailyMetricField(date: DateKey, field: DailyMetricField): Promise<void> {
  const existing = await getDailyMetric(date);
  if (!existing) return;

  const steps = field === 'steps' ? null : existing.steps;
  const weightKg = field === 'weightKg' ? null : existing.weightKg;

  if (steps === null && weightKg === null) {
    await db.delete(dailyMetrics).where(eq(dailyMetrics.date, date));
  } else {
    await db.update(dailyMetrics).set({ steps, weightKg }).where(eq(dailyMetrics.date, date));
  }
  bumpDataVersion();
}

export async function getDailyMetric(date: DateKey): Promise<DailyMetric | undefined> {
  const [row] = await db.select().from(dailyMetrics).where(eq(dailyMetrics.date, date)).limit(1);
  return row;
}
