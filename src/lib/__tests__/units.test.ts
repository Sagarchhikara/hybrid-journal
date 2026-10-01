import { describe, expect, it } from 'vitest';

import {
  formatDistance,
  formatSetWeight,
  formatSteps,
  formatWeight,
  fromStoredDistanceKm,
  fromStoredWeightKg,
  kgToLb,
  kmToMi,
  lbToKg,
  miToKm,
  toStoredDistanceKm,
  toStoredWeightKg,
} from '../units';

describe('weight conversion', () => {
  it('uses the international avoirdupois pound', () => {
    expect(lbToKg(1)).toBeCloseTo(0.45359237, 10);
    expect(kgToLb(1)).toBeCloseTo(2.2046226218, 8);
  });

  it('round-trips kg -> lb -> kg without drift', () => {
    for (const kg of [0, 0.5, 45.3, 72.4, 83.25, 150, 227.9]) {
      expect(kgToLb(lbToKg(kg))).toBeCloseTo(kg, 10);
      expect(lbToKg(kgToLb(kg))).toBeCloseTo(kg, 10);
    }
  });

  it('round-trips through the storage helpers in both units', () => {
    for (const unit of ['kg', 'lb'] as const) {
      for (const entered of [60, 72.4, 180.5]) {
        const stored = toStoredWeightKg(entered, unit);
        expect(fromStoredWeightKg(stored, unit)).toBeCloseTo(entered, 10);
      }
    }
  });

  it('is a no-op when the unit is already kg', () => {
    expect(toStoredWeightKg(72.4, 'kg')).toBe(72.4);
    expect(fromStoredWeightKg(72.4, 'kg')).toBe(72.4);
  });
});

describe('distance conversion', () => {
  it('uses the international mile', () => {
    expect(miToKm(1)).toBeCloseTo(1.609344, 10);
    expect(kmToMi(1)).toBeCloseTo(0.6213711922, 8);
  });

  it('round-trips km -> mi -> km', () => {
    for (const km of [0, 1, 5, 6.2, 10, 21.0975, 42.195]) {
      expect(miToKm(kmToMi(km))).toBeCloseTo(km, 10);
    }
  });

  it('converts a 5 km race to miles', () => {
    expect(kmToMi(5)).toBeCloseTo(3.10686, 4);
  });

  it('round-trips through the storage helpers in both units', () => {
    for (const unit of ['km', 'mi'] as const) {
      for (const entered of [3.1, 6.2, 13.1, 26.2]) {
        const stored = toStoredDistanceKm(entered, unit);
        expect(fromStoredDistanceKm(stored, unit)).toBeCloseTo(entered, 10);
      }
    }
  });

  it('is a no-op when the unit is already km', () => {
    expect(toStoredDistanceKm(6.2, 'km')).toBe(6.2);
    expect(fromStoredDistanceKm(6.2, 'km')).toBe(6.2);
  });
});

describe('formatters', () => {
  it('formats distance in the chosen unit', () => {
    expect(formatDistance(6.2, 'km')).toBe('6.20 km');
    expect(formatDistance(6.2, 'mi')).toBe('3.85 mi');
  });

  it('formats weight to one decimal in the chosen unit', () => {
    expect(formatWeight(72.4, 'kg')).toBe('72.4 kg');
    expect(formatWeight(72.4, 'lb')).toBe('159.6 lb');
  });

  it('shows bodyweight sets as BW', () => {
    expect(formatSetWeight(null, 'kg')).toBe('BW');
    expect(formatSetWeight(100, 'kg')).toBe('100.0 kg');
  });

  it('groups thousands in step counts', () => {
    expect(formatSteps(9412)).toBe('9,412');
    expect(formatSteps(812)).toBe('812');
  });
});
