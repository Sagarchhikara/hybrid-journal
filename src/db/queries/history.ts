import { and, gte, isNotNull, lte, min, or } from 'drizzle-orm';

import { shiftDateKey, todayLocal, type DateKey } from '@/lib/dates';

import { db } from '../client';
import { dailyMetrics, runs, sleepEntries, type Run } from '../schema';

/**
 * One row in the history list. A discriminated union rather than a stringly-typed blob,
 * so the row renderer gets exhaustiveness checking when Phase 2 adds `gym`.
 */
interface HistoryEntryBase {
  id: string;
  date: DateKey;
  /** Write time, used only to order several entries of the same kind on one date. */
  loggedAt: number;
}

export type HistoryEntry =
  | ({ kind: 'run'; run: Run } & HistoryEntryBase)
  | ({ kind: 'sleep'; durationMin: number } & HistoryEntryBase)
  | ({ kind: 'steps'; steps: number } & HistoryEntryBase)
  | ({ kind: 'weight'; weightKg: number } & HistoryEntryBase);

export type HistoryKind = HistoryEntry['kind'];

/**
 * Intra-day ordering, highest first. Stated explicitly rather than falling out of
 * whichever kind happens to carry a larger timestamp: training comes before body
 * measurements, which have no meaningful time of day.
 */
const KIND_RANK: Record<HistoryKind, number> = { run: 3, sleep: 2, steps: 1, weight: 0 };

export const HISTORY_FILTERS = ['all', 'runs', 'sleep', 'body'] as const;
export type HistoryFilter = (typeof HISTORY_FILTERS)[number];

/** Which entry kinds each filter chip admits. */
const FILTER_KINDS: Record<HistoryFilter, readonly HistoryKind[]> = {
  all: ['run', 'sleep', 'steps', 'weight'],
  runs: ['run'],
  sleep: ['sleep'],
  body: ['steps', 'weight'],
};

/**
 * A history source maps one table to `HistoryEntry`s inside a date window, and reports
 * the earliest date it holds. Adding gym workouts in Phase 2 means appending one entry
 * to SOURCES — the paging, merging and filtering below need no changes.
 */
interface HistorySource {
  kinds: readonly HistoryKind[];
  load: (from: DateKey, to: DateKey) => Promise<HistoryEntry[]>;
  earliest: () => Promise<DateKey | null>;
}

const SOURCES: HistorySource[] = [
  {
    kinds: ['run'],
    load: async (from, to) => {
      const rows = await db
        .select()
        .from(runs)
        .where(and(gte(runs.date, from), lte(runs.date, to)));
      return rows.map((run) => ({
        kind: 'run' as const,
        id: `run-${run.id}`,
        date: run.date,
        loggedAt: run.createdAt.getTime(),
        run,
      }));
    },
    earliest: async () => {
      const [row] = await db.select({ value: min(runs.date) }).from(runs);
      return row?.value ?? null;
    },
  },
  {
    kinds: ['sleep'],
    load: async (from, to) => {
      const rows = await db
        .select()
        .from(sleepEntries)
        .where(and(gte(sleepEntries.date, from), lte(sleepEntries.date, to)));
      return rows.map((entry) => ({
        kind: 'sleep' as const,
        id: `sleep-${entry.date}`,
        date: entry.date,
        loggedAt: entry.createdAt.getTime(),
        durationMin: entry.durationMin,
      }));
    },
    earliest: async () => {
      const [row] = await db.select({ value: min(sleepEntries.date) }).from(sleepEntries);
      return row?.value ?? null;
    },
  },
  {
    kinds: ['steps', 'weight'],
    load: async (from, to) => {
      const rows = await db
        .select()
        .from(dailyMetrics)
        .where(
          and(
            gte(dailyMetrics.date, from),
            lte(dailyMetrics.date, to),
            or(isNotNull(dailyMetrics.steps), isNotNull(dailyMetrics.weightKg)),
          ),
        );

      // One row can yield two list entries; they are independent facts about the day.
      return rows.flatMap((row): HistoryEntry[] => {
        const entries: HistoryEntry[] = [];
        if (row.steps !== null) {
          entries.push({
            kind: 'steps',
            id: `steps-${row.date}`,
            date: row.date,
            loggedAt: 0,
            steps: row.steps,
          });
        }
        if (row.weightKg !== null) {
          entries.push({
            kind: 'weight',
            id: `weight-${row.date}`,
            date: row.date,
            loggedAt: 0,
            weightKg: row.weightKg,
          });
        }
        return entries;
      });
    },
    earliest: async () => {
      const [row] = await db
        .select({ value: min(dailyMetrics.date) })
        .from(dailyMetrics)
        .where(or(isNotNull(dailyMetrics.steps), isNotNull(dailyMetrics.weightKg)));
      return row?.value ?? null;
    },
  },
];

export const HISTORY_WINDOW_DAYS = 30;

export interface HistoryPage {
  entries: HistoryEntry[];
  /** Pass back as `before` to load the next page. Null when nothing older exists. */
  nextBefore: DateKey | null;
}

export interface HistoryPageOptions {
  /** Load dates strictly before this. Omit for the most recent page. */
  before?: DateKey;
  filter?: HistoryFilter;
  windowDays?: number;
}

function sourcesFor(filter: HistoryFilter): HistorySource[] {
  const allowed = FILTER_KINDS[filter];
  return SOURCES.filter((source) => source.kinds.some((kind) => allowed.includes(kind)));
}

async function earliestDate(sources: HistorySource[]): Promise<DateKey | null> {
  const results = await Promise.all(sources.map((source) => source.earliest()));
  const present = results.filter((value): value is DateKey => value !== null);
  // Date keys sort lexicographically, which is why they are stored as 'YYYY-MM-DD'.
  return present.length === 0 ? null : present.sort()[0]!;
}

/**
 * Walks back in `windowDays` chunks. Empty windows are skipped internally rather than
 * returned, so a three-week break in training does not render as a blank page the user
 * has to keep scrolling past. Bounded by the earliest stored date, so it terminates.
 */
export async function getHistoryPage(options: HistoryPageOptions = {}): Promise<HistoryPage> {
  const { before, filter = 'all', windowDays = HISTORY_WINDOW_DAYS } = options;
  const sources = sourcesFor(filter);
  const allowed = FILTER_KINDS[filter];

  const earliest = await earliestDate(sources);
  if (earliest === null) return { entries: [], nextBefore: null };

  let windowEnd = before ? shiftDateKey(before, -1) : todayLocal();

  while (windowEnd >= earliest) {
    const windowStart = shiftDateKey(windowEnd, -(windowDays - 1));
    const from = windowStart < earliest ? earliest : windowStart;

    const loaded = await Promise.all(sources.map((source) => source.load(from, windowEnd)));
    const entries = loaded
      .flat()
      .filter((entry) => allowed.includes(entry.kind))
      .sort(compareEntries);

    const exhausted = from <= earliest;
    if (entries.length > 0 || exhausted) {
      return { entries, nextBefore: exhausted ? null : from };
    }

    windowEnd = shiftDateKey(from, -1);
  }

  return { entries: [], nextBefore: null };
}

/**
 * Newest date first; within a date, by kind rank, then newest write first, then a
 * numeric-aware id so run-10 sorts after run-9 rather than before it.
 */
function compareEntries(a: HistoryEntry, b: HistoryEntry): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  if (a.kind !== b.kind) return KIND_RANK[b.kind] - KIND_RANK[a.kind];
  if (a.loggedAt !== b.loggedAt) return b.loggedAt - a.loggedAt;
  return b.id.localeCompare(a.id, 'en', { numeric: true });
}

export interface HistoryDateGroup {
  date: DateKey;
  entries: HistoryEntry[];
}

/** Groups an already-sorted list into date sections for the list header rendering. */
export function groupByDate(entries: HistoryEntry[]): HistoryDateGroup[] {
  const groups: HistoryDateGroup[] = [];
  for (const entry of entries) {
    const last = groups.at(-1);
    if (last && last.date === entry.date) last.entries.push(entry);
    else groups.push({ date: entry.date, entries: [entry] });
  }
  return groups;
}
