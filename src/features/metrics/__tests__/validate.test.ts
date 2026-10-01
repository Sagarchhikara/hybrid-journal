import { describe, expect, it } from 'vitest';

import { MAX_STEPS, validateSteps, validateWeight } from '../validate';

describe('validateSteps', () => {
  it('accepts a whole number', () => {
    expect(validateSteps('9412').value).toBe(9412);
  });

  it('requires a value', () => {
    expect(validateSteps('').error).toBe('Enter a step count');
    expect(validateSteps('   ').error).toBe('Enter a step count');
  });

  it('rejects zero and malformed input', () => {
    for (const bad of ['0', 'abc', '-5', '94.12']) {
      expect(validateSteps(bad).value).toBeNull();
      expect(validateSteps(bad).error).toBeDefined();
    }
  });

  it('rejects an absurd count but accepts the cap', () => {
    expect(validateSteps(String(MAX_STEPS + 1)).error).toContain('under');
    expect(validateSteps(String(MAX_STEPS)).value).toBe(MAX_STEPS);
  });
});

describe('validateWeight', () => {
  it('accepts kg and stores kg', () => {
    expect(validateWeight('72.4', 'kg').value).toBeCloseTo(72.4, 10);
  });

  it('converts pounds to kg for storage', () => {
    expect(validateWeight('159.6', 'lb').value).toBeCloseTo(72.3933, 4);
  });

  it('requires a value', () => {
    expect(validateWeight('', 'kg').error).toBe('Enter a weight');
  });

  it('rejects malformed input and zero', () => {
    expect(validateWeight('abc', 'kg').error).toBe('Not a number');
    expect(validateWeight('0', 'kg').error).toBe('Must be more than zero');
  });

  it('rejects out-of-range weights in kg', () => {
    expect(validateWeight('19', 'kg').error).toContain('between');
    expect(validateWeight('501', 'kg').error).toContain('between');
    expect(validateWeight('20', 'kg').value).toBe(20);
    expect(validateWeight('500', 'kg').value).toBe(500);
  });

  it('reports the range in the unit the user typed in', () => {
    expect(validateWeight('10', 'lb').error).toBe('Must be between 44 and 1102 lb');
    expect(validateWeight('10', 'kg').error).toBe('Must be between 20 and 500 kg');
  });

  it('applies the same kg bounds to a pound entry', () => {
    // 45 lb is 20.4 kg, inside the range; 40 lb is 18.1 kg, outside it.
    expect(validateWeight('45', 'lb').value).toBeCloseTo(20.41, 2);
    expect(validateWeight('40', 'lb').error).toContain('between');
  });
});
