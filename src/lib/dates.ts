import { addDays, format, isValid, parseISO } from 'date-fns';

/** A local calendar date in 'YYYY-MM-DD' form — the only date format we persist. */
export type DateKey = string;

export const DATE_KEY_FORMAT = 'yyyy-MM-dd';

export function toDateKey(date: Date): DateKey {
  return format(date, DATE_KEY_FORMAT);
}

/**
 * The ONLY place in the app that reads the clock to find out what day it is.
 * Everything else derives from this, so "today" is consistent within a render pass and
 * there is a single seam to stub in tests or to re-evaluate when the date rolls over.
 */
export function todayLocal(): DateKey {
  return toDateKey(new Date());
}

/**
 * `parseISO` on a date-only string yields LOCAL midnight. `new Date('2026-10-01')`
 * would yield UTC midnight and shift the day for anyone west of Greenwich, so never
 * use the constructor for date keys.
 */
export function fromDateKey(key: DateKey): Date {
  return parseISO(key);
}

export function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value));
}

export function shiftDateKey(key: DateKey, days: number): DateKey {
  return toDateKey(addDays(fromDateKey(key), days));
}

export function daysAgoKey(days: number): DateKey {
  return shiftDateKey(todayLocal(), -days);
}

/** e.g. 'Thu 1 Oct' */
export function formatDateKeyShort(key: DateKey): string {
  return format(fromDateKey(key), 'EEE d MMM');
}

/** e.g. 'Thursday, 1 October 2026' */
export function formatDateKeyLong(key: DateKey): string {
  return format(fromDateKey(key), 'EEEE, d MMMM yyyy');
}
