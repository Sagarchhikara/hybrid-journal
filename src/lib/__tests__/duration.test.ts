import { describe, expect, it } from 'vitest';

import { formatDuration, formatHoursMinutes, hmsToSeconds, secondsToHms } from '../duration';

describe('hmsToSeconds', () => {
  it('totals the parts', () => {
    expect(hmsToSeconds({ hours: 1, minutes: 12, seconds: 5 })).toBe(4325);
  });

  it('rolls 59:59 + 1s over into one hour rather than clamping', () => {
    const fiftyNineFiftyNine = hmsToSeconds({ hours: 0, minutes: 59, seconds: 59 });
    expect(fiftyNineFiftyNine).toBe(3599);
    expect(formatDuration(fiftyNineFiftyNine)).toBe('59:59');

    const oneMore = hmsToSeconds({ hours: 0, minutes: 59, seconds: 60 });
    expect(oneMore).toBe(3600);
    expect(formatDuration(oneMore)).toBe('1:00:00');
  });

  it('accepts out-of-range parts without clamping, so 90 minutes is 1:30:00', () => {
    expect(formatDuration(hmsToSeconds({ hours: 0, minutes: 90, seconds: 0 }))).toBe('1:30:00');
  });

  it('treats negatives, fractions and NaN as zero', () => {
    expect(hmsToSeconds({ hours: -1, minutes: -5, seconds: -9 })).toBe(0);
    expect(hmsToSeconds({ hours: 0, minutes: 2.9, seconds: 0 })).toBe(120);
    expect(hmsToSeconds({ hours: Number.NaN, minutes: 3, seconds: 0 })).toBe(180);
  });
});

describe('secondsToHms', () => {
  it('round-trips through hmsToSeconds', () => {
    for (const seconds of [0, 1, 59, 60, 3599, 3600, 3661, 86399]) {
      expect(hmsToSeconds(secondsToHms(seconds))).toBe(seconds);
    }
  });

  it('splits an exact hour boundary', () => {
    expect(secondsToHms(3600)).toEqual({ hours: 1, minutes: 0, seconds: 0 });
    expect(secondsToHms(3599)).toEqual({ hours: 0, minutes: 59, seconds: 59 });
  });
});

describe('formatDuration', () => {
  it('omits the hour field below an hour', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(9)).toBe('0:09');
    expect(formatDuration(2661)).toBe('44:21');
  });

  it('pads minutes and seconds once hours appear', () => {
    expect(formatDuration(3605)).toBe('1:00:05');
    expect(formatDuration(4325)).toBe('1:12:05');
  });
});

describe('formatHoursMinutes', () => {
  it('formats sleep durations', () => {
    expect(formatHoursMinutes(462)).toBe('7h 42m');
    expect(formatHoursMinutes(480)).toBe('8h 00m');
    expect(formatHoursMinutes(0)).toBe('0h 00m');
  });
});
