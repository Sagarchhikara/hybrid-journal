import { and, avg, count, gte, lte, sum } from 'drizzle-orm';

import { todayLocal, type DateKey } from '@/lib/dates';
import { toNumber, toNumberOrNull } from '@/lib/numbers';
import { currentWeekRange, type WeekRange } from '@/lib/week';

import { db } from '../client';
import { runs, sleepEntries } from '../schema';

export interface WeekSummary {
  range: WeekRange;
  /** Null when nothing is logged, so the UI can show a dash rather than a zero. */
  totalRunKm: number | null;
  runCount: number;
  /** Mean over the days that actually have a sleep entry, not over seven. */
  averageSleepMin: number | null;
  sleepDaysLogged: number;
}

/**
 * Monday-to-Sunday totals for the Home card. Both ends of the range are inclusive
 * calendar dates, so these are plain BETWEEN scans on the indexed `date` columns —
 * no timestamp arithmetic, and no risk of a time-zone shift moving a run between weeks.
 */
export async function getWeekSummary(today: DateKey = todayLocal()): Promise<WeekSummary> {
  const range = currentWeekRange(today);

  const [runRow] = await db
    .select({ total: sum(runs.distanceKm), entries: count() })
    .from(runs)
    .where(and(gte(runs.date, range.start), lte(runs.date, range.end)));

  const [sleepRow] = await db
    .select({ mean: avg(sleepEntries.durationMin), days: count() })
    .from(sleepEntries)
    .where(and(gte(sleepEntries.date, range.start), lte(sleepEntries.date, range.end)));

  // Every aggregate goes through toNumberOrNull: drizzle decodes SUM/AVG as
  // `string | null`, while count() is already a number.
  const runCount = toNumber(runRow?.entries);
  const sleepDaysLogged = toNumber(sleepRow?.days);

  return {
    range,
    totalRunKm: toNumberOrNull(runRow?.total),
    runCount,
    averageSleepMin: toNumberOrNull(sleepRow?.mean),
    sleepDaysLogged,
  };
}
