import { describe, expect, it } from 'vitest';

import {
  daysAgoKey,
  formatDateKeyShort,
  fromDateKey,
  isDateKey,
  shiftDateKey,
  toDateKey,
  todayLocal,
} from '../dates';

describe('fromDateKey', () => {
  it('parses to LOCAL midnight, not UTC midnight', () => {
    const parsed = fromDateKey('2026-10-01');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(9);
    expect(parsed.getDate()).toBe(1);
    expect(parsed.getHours()).toBe(0);
  });

  it('round-trips through toDateKey, which `new Date(key)` would not guarantee', () => {
    for (const key of ['2026-01-01', '2026-06-15', '2026-10-01', '2026-12-31', '2028-02-29']) {
      expect(toDateKey(fromDateKey(key))).toBe(key);
    }
  });
});

describe('shiftDateKey', () => {
  it('moves forward and back', () => {
    expect(shiftDateKey('2026-10-01', 1)).toBe('2026-10-02');
    expect(shiftDateKey('2026-10-01', -1)).toBe('2026-09-30');
    expect(shiftDateKey('2026-10-01', 0)).toBe('2026-10-01');
  });

  it('crosses month, year and leap boundaries', () => {
    expect(shiftDateKey('2026-09-30', 1)).toBe('2026-10-01');
    expect(shiftDateKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDateKey('2028-02-28', 1)).toBe('2028-02-29');
    expect(shiftDateKey('2027-02-28', 1)).toBe('2027-03-01');
  });

  it('survives a DST transition without losing or gaining a day', () => {
    // Most northern-hemisphere zones shift clocks in late March and late October.
    for (const key of ['2026-03-28', '2026-03-29', '2026-10-24', '2026-10-25']) {
      expect(shiftDateKey(shiftDateKey(key, 1), -1)).toBe(key);
    }
  });
});

describe('isDateKey', () => {
  it('accepts well-formed keys', () => {
    expect(isDateKey('2026-10-01')).toBe(true);
  });

  it('rejects malformed or impossible dates', () => {
    for (const bad of ['2026-10-1', '26-10-01', '2026/10/01', '', 'today', '2026-13-01']) {
      expect(isDateKey(bad)).toBe(false);
    }
  });
});

describe('todayLocal and daysAgoKey', () => {
  it('agree with each other at zero offset', () => {
    expect(daysAgoKey(0)).toBe(todayLocal());
  });

  it('produces keys in descending order going back', () => {
    expect(daysAgoKey(1) < todayLocal()).toBe(true);
    expect(daysAgoKey(7) < daysAgoKey(1)).toBe(true);
  });

  it('is lexicographically sortable, which is what the SQL ORDER BY relies on', () => {
    const keys = [daysAgoKey(20), daysAgoKey(5), daysAgoKey(0), daysAgoKey(13)];
    const lexicographic = [...keys].sort();
    const chronological = [...keys].sort(
      (a, b) => fromDateKey(a).getTime() - fromDateKey(b).getTime(),
    );
    expect(lexicographic).toEqual(chronological);
  });
});

describe('formatDateKeyShort', () => {
  it('formats without shifting the day', () => {
    expect(formatDateKeyShort('2026-10-01')).toBe('Thu 1 Oct');
  });
});
