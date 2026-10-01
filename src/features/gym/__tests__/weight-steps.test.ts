import { describe, expect, it } from 'vitest';

import {
  gridPoints,
  stepWeight,
  toDisplayWeight,
  toStorageWeight,
  WEIGHT_STEP,
} from '../weight-steps';

describe('stepWeight in kg', () => {
  it('steps up by 2.5 from a grid point', () => {
    expect(stepWeight(70, 1, 'kg')).toBe(72.5);
    expect(stepWeight(72.5, 1, 'kg')).toBe(75);
  });

  it('steps down by 2.5 from a grid point', () => {
    expect(stepWeight(72.5, -1, 'kg')).toBe(70);
    expect(stepWeight(75, -1, 'kg')).toBe(72.5);
  });

  it('snaps an off-grid value onto the grid rather than adding to it', () => {
    expect(stepWeight(72.3, 1, 'kg')).toBe(72.5);
    expect(stepWeight(72.3, -1, 'kg')).toBe(70);
    expect(stepWeight(71, 1, 'kg')).toBe(72.5);
    expect(stepWeight(71, -1, 'kg')).toBe(70);
  });

  it('always moves strictly in the requested direction', () => {
    for (const start of [0, 0.1, 1, 2.4, 2.5, 2.6, 70, 72.49, 72.5, 72.51, 100, 137.5]) {
      expect(stepWeight(start, 1, 'kg')).toBeGreaterThan(start);
      if (start > 0) expect(stepWeight(start, -1, 'kg')).toBeLessThan(start);
    }
  });

  it('floors at zero instead of going negative', () => {
    expect(stepWeight(0, -1, 'kg')).toBe(0);
    expect(stepWeight(2.5, -1, 'kg')).toBe(0);
    expect(stepWeight(1, -1, 'kg')).toBe(0);
    expect(stepWeight(-5, -1, 'kg')).toBe(0);
  });

  it('steps up to the first grid point from an empty field', () => {
    expect(stepWeight(null, 1, 'kg')).toBe(2.5);
    expect(stepWeight(null, -1, 'kg')).toBe(0);
  });

  it('never drifts: repeated stepping stays exact', () => {
    let value = 0;
    for (let i = 0; i < 80; i += 1) value = stepWeight(value, 1, 'kg');
    expect(value).toBe(200);

    for (let i = 0; i < 80; i += 1) value = stepWeight(value, -1, 'kg');
    expect(value).toBe(0);
  });

  it('72.5 + 2.5 shows 75, never 74.99999', () => {
    const result = stepWeight(72.5, 1, 'kg');
    expect(result).toBe(75);
    expect(String(result)).toBe('75');
  });
});

describe('stepWeight in lb', () => {
  it('uses 5 lb increments', () => {
    expect(WEIGHT_STEP.lb).toBe(5);
    expect(stepWeight(160, 1, 'lb')).toBe(165);
    expect(stepWeight(160, -1, 'lb')).toBe(155);
  });

  it('snaps an off-grid pound value', () => {
    expect(stepWeight(159.8, 1, 'lb')).toBe(160);
    expect(stepWeight(159.8, -1, 'lb')).toBe(155);
  });

  it('never drifts across many steps', () => {
    let value = 0;
    for (let i = 0; i < 100; i += 1) value = stepWeight(value, 1, 'lb');
    expect(value).toBe(500);
  });
});

describe('every lb grid point round-trips at one decimal place', () => {
  it('survives lb -> kg -> lb for the whole usable range', () => {
    const points = gridPoints('lb', 1000);
    expect(points.length).toBeGreaterThan(200);

    for (const lb of points) {
      const storedKg = toStorageWeight(lb, 'lb');
      expect(toDisplayWeight(storedKg, 'lb')).toBe(lb);
    }
  });

  it('survives kg -> lb -> kg for every kg grid point', () => {
    for (const kg of gridPoints('kg', 500)) {
      const asLb = toDisplayWeight(toStorageWeight(kg, 'kg'), 'lb');
      const backToKg = toDisplayWeight(toStorageWeight(asLb, 'lb'), 'kg');
      // One conversion through a rounded pound value, so allow the rounding itself.
      expect(Math.abs(backToKg - kg)).toBeLessThan(0.05);
    }
  });

  it('keeps a stepped lb value stable through storage', () => {
    let lb = 0;
    for (let i = 0; i < 40; i += 1) {
      lb = stepWeight(lb, 1, 'lb');
      expect(toDisplayWeight(toStorageWeight(lb, 'lb'), 'lb')).toBe(lb);
    }
  });

  it('stores kg unchanged in kg mode', () => {
    for (const kg of gridPoints('kg', 300)) {
      expect(toStorageWeight(kg, 'kg')).toBe(kg);
      expect(toDisplayWeight(kg, 'kg')).toBe(kg);
    }
  });
});
