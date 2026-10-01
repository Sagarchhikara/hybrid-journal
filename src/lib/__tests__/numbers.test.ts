import { describe, expect, it } from 'vitest';

import { toNumber, toNumberOrNull } from '../numbers';

describe('toNumberOrNull by input type', () => {
  it('passes finite numbers through unchanged', () => {
    expect(toNumberOrNull(0)).toBe(0);
    expect(toNumberOrNull(16.2)).toBe(16.2);
    expect(toNumberOrNull(-3)).toBe(-3);
  });

  it('rejects non-finite numbers rather than propagating NaN into a total', () => {
    expect(toNumberOrNull(Number.NaN)).toBeNull();
    expect(toNumberOrNull(Number.POSITIVE_INFINITY)).toBeNull();
    expect(toNumberOrNull(Number.NEGATIVE_INFINITY)).toBeNull();
  });

  it('parses the numeric strings that drizzle decodes SUM and AVG into', () => {
    expect(toNumberOrNull('16.2')).toBe(16.2);
    expect(toNumberOrNull('2830.5')).toBe(2830.5);
    expect(toNumberOrNull('0')).toBe(0);
    expect(toNumberOrNull('  37.3  ')).toBe(37.3);
  });

  it('treats an empty or non-numeric string as absent', () => {
    expect(toNumberOrNull('')).toBeNull();
    expect(toNumberOrNull('   ')).toBeNull();
    expect(toNumberOrNull('abc')).toBeNull();
    expect(toNumberOrNull('12abc')).toBeNull();
  });

  it('treats null and undefined as absent, which is what an aggregate over zero rows gives', () => {
    expect(toNumberOrNull(null)).toBeNull();
    expect(toNumberOrNull(undefined)).toBeNull();
  });

  it('converts bigint, which SQLite can produce for large integers', () => {
    expect(toNumberOrNull(42n)).toBe(42);
    expect(toNumberOrNull(0n)).toBe(0);
  });

  it('refuses booleans, objects and arrays instead of coercing them', () => {
    // Number(true) is 1 and Number([]) is 0; neither is a meaningful aggregate.
    expect(toNumberOrNull(true)).toBeNull();
    expect(toNumberOrNull(false)).toBeNull();
    expect(toNumberOrNull({})).toBeNull();
    expect(toNumberOrNull([])).toBeNull();
    expect(toNumberOrNull([5])).toBeNull();
    expect(toNumberOrNull(() => 5)).toBeNull();
  });

  it('guards the concatenation bug it exists to prevent', () => {
    // Two string sums added without the cast would give '6.210', not 16.2.
    const a = toNumberOrNull('6.2');
    const b = toNumberOrNull('10');
    expect(a! + b!).toBe(16.2);
  });
});

describe('toNumber', () => {
  it('falls back to zero by default', () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber('')).toBe(0);
  });

  it('honours an explicit fallback', () => {
    expect(toNumber(null, -1)).toBe(-1);
    expect(toNumber('7', -1)).toBe(7);
  });

  it('passes real counts through', () => {
    expect(toNumber(3)).toBe(3);
  });
});
