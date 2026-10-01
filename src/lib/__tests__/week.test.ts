import { describe, expect, it } from 'vitest';

import { todayLocal } from '../dates';
import { currentWeekRange, datesInWeek, weekRangeFor } from '../week';

describe('weekRangeFor', () => {
  it('runs Monday to Sunday', () => {
    // 2026-09-30 is a Wednesday.
    expect(weekRangeFor('2026-09-30')).toEqual({
      start: '2026-09-28',
      end: '2026-10-04',
    });
  });

  it('treats Monday as the first day, not the last of the previous week', () => {
    expect(weekRangeFor('2026-09-28')).toEqual({
      start: '2026-09-28',
      end: '2026-10-04',
    });
  });

  it('treats Sunday as the last day of the week that began six days earlier', () => {
    // The boundary that a Sunday-start week would get wrong.
    expect(weekRangeFor('2026-10-04')).toEqual({
      start: '2026-09-28',
      end: '2026-10-04',
    });
  });

  it('puts Sunday and the Monday after it in different weeks', () => {
    const sunday = weekRangeFor('2026-10-04');
    const monday = weekRangeFor('2026-10-05');
    expect(sunday.start).not.toBe(monday.start);
    expect(sunday.end).toBe('2026-10-04');
    expect(monday.start).toBe('2026-10-05');
  });

  it('puts Saturday and Sunday of the same weekend in the same week', () => {
    expect(weekRangeFor('2026-10-03').start).toBe(weekRangeFor('2026-10-04').start);
  });

  it('spans a month boundary', () => {
    expect(weekRangeFor('2026-10-01')).toEqual({ start: '2026-09-28', end: '2026-10-04' });
  });

  it('spans a year boundary', () => {
    // 2027-01-01 is a Friday.
    expect(weekRangeFor('2027-01-01')).toEqual({ start: '2026-12-28', end: '2027-01-03' });
  });

  it('handles a leap day', () => {
    // 2028-02-29 is a Tuesday.
    expect(weekRangeFor('2028-02-29')).toEqual({ start: '2028-02-28', end: '2028-03-05' });
  });
});

describe('datesInWeek', () => {
  it('lists seven consecutive dates, Monday first', () => {
    expect(datesInWeek(weekRangeFor('2026-09-30'))).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
  });

  it('starts at the range start and ends at the range end', () => {
    const range = weekRangeFor('2027-01-01');
    const dates = datesInWeek(range);
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe(range.start);
    expect(dates[6]).toBe(range.end);
  });
});

describe('currentWeekRange', () => {
  it('contains the date it was given', () => {
    const today = '2026-10-04';
    const range = currentWeekRange(today);
    expect(range.start <= today).toBe(true);
    expect(today <= range.end).toBe(true);
  });

  it('defaults to today when given nothing', () => {
    expect(currentWeekRange()).toEqual(currentWeekRange(todayLocal()));
  });
});
