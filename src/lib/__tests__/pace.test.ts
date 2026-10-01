import { describe, expect, it } from 'vitest';

import { formatPace, paceSecondsPer, speedKmh } from '../pace';

describe('paceSecondsPer', () => {
  it('computes seconds per km', () => {
    expect(paceSecondsPer(10, 3000, 'km')).toBe(300);
  });

  it('computes a slower number per mile than per km, since a mile is longer', () => {
    const perKm = paceSecondsPer(10, 3000, 'km');
    const perMi = paceSecondsPer(10, 3000, 'mi');
    expect(perKm).not.toBeNull();
    expect(perMi).not.toBeNull();
    expect(perMi!).toBeGreaterThan(perKm!);
    expect(perMi!).toBeCloseTo(300 * 1.609344, 6);
  });

  it('returns null for zero distance rather than dividing by zero', () => {
    expect(paceSecondsPer(0, 3000, 'km')).toBeNull();
    expect(paceSecondsPer(-1, 3000, 'km')).toBeNull();
  });

  it('returns null for zero duration', () => {
    expect(paceSecondsPer(10, 0, 'km')).toBeNull();
    expect(paceSecondsPer(10, -5, 'km')).toBeNull();
  });

  it('returns null for non-finite input', () => {
    expect(paceSecondsPer(Number.NaN, 3000, 'km')).toBeNull();
    expect(paceSecondsPer(10, Number.POSITIVE_INFINITY, 'km')).toBeNull();
  });
});

describe('formatPace', () => {
  it('formats the spec example: 6.2 km in 44:21 is 7:09/km', () => {
    expect(formatPace(6.2, 44 * 60 + 21, 'km')).toBe('7:09/km');
  });

  it('pads seconds', () => {
    expect(formatPace(10, 3000, 'km')).toBe('5:00/km');
    expect(formatPace(10, 3005, 'km')).toBe('5:01/km');
  });

  it('labels the unit it was asked for', () => {
    expect(formatPace(5, 1500, 'mi')).toBe('8:03/mi');
  });

  it('rolls 59.6 seconds per km up to 1:00, never 0:60', () => {
    expect(formatPace(10, 596, 'km')).toBe('1:00/km');
  });

  it('returns null when it cannot be computed, leaving the dash to the caller', () => {
    expect(formatPace(0, 100, 'km')).toBeNull();
    expect(formatPace(5, 0, 'km')).toBeNull();
  });
});

describe('speedKmh', () => {
  it('computes average speed', () => {
    expect(speedKmh(10, 3600)).toBeCloseTo(10, 10);
    expect(speedKmh(21.0975, 5400)).toBeCloseTo(14.065, 3);
  });

  it('returns null on zero input', () => {
    expect(speedKmh(0, 3600)).toBeNull();
    expect(speedKmh(10, 0)).toBeNull();
  });
});
