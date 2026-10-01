import { addDays, endOfWeek, startOfWeek } from 'date-fns';

import { fromDateKey, toDateKey, todayLocal, type DateKey } from './dates';

/** Weeks start Monday. date-fns calls that weekStartsOn 1. */
export const WEEK_STARTS_ON = 1 as const;

export interface WeekRange {
  /** Monday, inclusive. */
  start: DateKey;
  /** Sunday, inclusive. */
  end: DateKey;
}

/**
 * The Monday-to-Sunday week containing `date`. Takes and returns calendar dates, so a
 * `BETWEEN start AND end` query is correct without any timestamp arithmetic. The Date
 * objects here are local-midnight intermediates that never escape this function.
 */
export function weekRangeFor(date: DateKey): WeekRange {
  const parsed = fromDateKey(date);
  return {
    start: toDateKey(startOfWeek(parsed, { weekStartsOn: WEEK_STARTS_ON })),
    end: toDateKey(endOfWeek(parsed, { weekStartsOn: WEEK_STARTS_ON })),
  };
}

export function currentWeekRange(today: DateKey = todayLocal()): WeekRange {
  return weekRangeFor(today);
}

/** Every date in the range, Monday first. Useful for "days logged this week". */
export function datesInWeek(range: WeekRange): DateKey[] {
  const start = fromDateKey(range.start);
  return Array.from({ length: 7 }, (_, offset) => toDateKey(addDays(start, offset)));
}
