import { desc, eq } from 'drizzle-orm';

import type { DateKey } from '@/lib/dates';

import { bumpDataVersion } from '../data-version';
import { db } from '../client';
import { runs, type Run, type RunType } from '../schema';

/** Distance and duration are always stored in km / seconds; the form converts first. */
export interface RunInput {
  date: DateKey;
  distanceKm: number;
  durationSec: number;
  type: RunType;
  notes: string | null;
}

export async function createRun(input: RunInput): Promise<number> {
  const [row] = await db.insert(runs).values(input).returning({ id: runs.id });
  if (!row) throw new Error('Failed to create run');
  bumpDataVersion();
  return row.id;
}

export async function updateRun(id: number, input: RunInput): Promise<void> {
  await db.update(runs).set(input).where(eq(runs.id, id));
  bumpDataVersion();
}

export async function deleteRun(id: number): Promise<void> {
  await db.delete(runs).where(eq(runs.id, id));
  bumpDataVersion();
}

export async function getRun(id: number): Promise<Run | undefined> {
  const [row] = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
  return row;
}

export async function getRunsForDate(date: DateKey): Promise<Run[]> {
  return db.select().from(runs).where(eq(runs.date, date)).orderBy(desc(runs.createdAt));
}
