import { describe, expect, it } from 'vitest';

import { parseDecimalInput, parseIntegerInput } from '../input';

describe('parseDecimalInput', () => {
  it('accepts plain decimals', () => {
    expect(parseDecimalInput('6.2')).toBe(6.2);
    expect(parseDecimalInput('10')).toBe(10);
    expect(parseDecimalInput('0.5')).toBe(0.5);
    expect(parseDecimalInput('  6.2 ')).toBe(6.2);
  });

  it('accepts a trailing separator, which is a normal mid-typing state', () => {
    expect(parseDecimalInput('6.')).toBe(6);
    expect(parseDecimalInput('.5')).toBe(0.5);
  });

  it('rejects anything that is not a plain number rather than yielding NaN', () => {
    for (const bad of ['', '  ', 'abc', '1.2.3', '6,2', '-3', '1e5', '+5']) {
      expect(parseDecimalInput(bad)).toBeNull();
    }
  });
});

describe('parseIntegerInput', () => {
  it('parses whole numbers and treats junk as zero', () => {
    expect(parseIntegerInput('44')).toBe(44);
    expect(parseIntegerInput('0')).toBe(0);
    expect(parseIntegerInput('')).toBe(0);
    expect(parseIntegerInput('4.5')).toBe(0);
    expect(parseIntegerInput('abc')).toBe(0);
    expect(parseIntegerInput('-5')).toBe(0);
  });
});
