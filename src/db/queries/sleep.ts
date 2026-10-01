import { eq } from 'drizzle-orm';

import type { DateKey } from '@/lib/dates';

import { bumpDataVersion } from '../data-version';
import { db } from '../client';
import { sleepEntries, type SleepEntry } from '../schema';

/**
 * `date` is the WAKE-UP date, so last night is logged under today. One entry per date
 * is enforced by the unique index, which is what makes this a plain upsert rather than
 * a read-then-branch.
 */
export async function upsertSleep(date: DateKey, durationMin: number): Promise<void> {
  await db
    .insert(sleepEntries)
    .values({ date, durationMin })
    .onConflictDoUpdate({ target: sleepEntries.date, set: { durationMin } });
  bumpDataVersion();
}

export async function deleteSleep(date: DateKey): Promise<void> {
  await db.delete(sleepEntries).where(eq(sleepEntries.date, date));
  bumpDataVersion();
}

export async function getSleepForDate(date: DateKey): Promise<SleepEntry | undefined> {
  const [row] = await db.select().from(sleepEntries).where(eq(sleepEntries.date, date)).limit(1);
  return row;
}
