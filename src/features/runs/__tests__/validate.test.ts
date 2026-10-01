import { describe, expect, it } from 'vitest';

import { MAX_DISTANCE_KM, draftToHms, validateRun, type RunDraft } from '../validate';

const EMPTY: RunDraft = { distance: '', hours: '', minutes: '', seconds: '' };
const VALID: RunDraft = { distance: '6.2', hours: '', minutes: '44', seconds: '21' };

describe('draftToHms', () => {
  it('reads the three duration fields', () => {
    expect(draftToHms({ ...EMPTY, hours: '1', minutes: '12', seconds: '5' })).toEqual({
      hours: 1,
      minutes: 12,
      seconds: 5,
    });
  });

  it('treats blank fields as zero so 44:21 needs no leading zero hour', () => {
    expect(draftToHms(VALID)).toEqual({ hours: 0, minutes: 44, seconds: 21 });
  });
});

describe('validateRun', () => {
  it('accepts a complete draft and converts to km', () => {
    const result = validateRun(VALID, 'km');
    expect(result.errors).toEqual({});
    expect(result.value).toEqual({ distanceKm: 6.2, durationSec: 2661 });
  });

  it('converts a draft entered in miles to km for storage', () => {
    const result = validateRun({ ...VALID, distance: '3.1' }, 'mi');
    expect(result.value?.distanceKm).toBeCloseTo(4.98897, 5);
    expect(result.value?.durationSec).toBe(2661);
  });

  it('requires a distance', () => {
    expect(validateRun(EMPTY, 'km').errors.distance).toBe('Enter a distance');
    expect(validateRun(EMPTY, 'km').value).toBeNull();
  });

  it('rejects zero distance', () => {
    expect(validateRun({ ...VALID, distance: '0' }, 'km').errors.distance).toBe(
      'Must be more than zero',
    );
  });

  it('rejects a non-numeric distance', () => {
    expect(validateRun({ ...VALID, distance: 'abc' }, 'km').errors.distance).toBe('Not a number');
  });

  it('rejects an absurd distance, in whichever unit was entered', () => {
    expect(validateRun({ ...VALID, distance: '501' }, 'km').errors.distance).toContain('under');
    // 400 miles is 643 km, so it must fail even though 400 < 500.
    expect(validateRun({ ...VALID, distance: '400' }, 'mi').errors.distance).toContain('under');
    // 300 miles is 483 km, which is under the cap.
    expect(validateRun({ ...VALID, distance: '300' }, 'mi').errors.distance).toBeUndefined();
  });

  it('accepts exactly the cap', () => {
    expect(
      validateRun({ ...VALID, distance: String(MAX_DISTANCE_KM) }, 'km').errors.distance,
    ).toBeUndefined();
  });

  it('requires a duration', () => {
    expect(validateRun({ ...VALID, minutes: '', seconds: '' }, 'km').errors.duration).toBe(
      'Enter a duration',
    );
  });

  it('rejects an all-zero duration', () => {
    const draft = { ...VALID, hours: '0', minutes: '0', seconds: '0' };
    expect(validateRun(draft, 'km').errors.duration).toBe('Enter a duration');
  });

  it('accepts a one-second duration', () => {
    expect(validateRun({ ...VALID, minutes: '', seconds: '1' }, 'km').value?.durationSec).toBe(1);
  });

  it('rejects 24 hours or more', () => {
    expect(
      validateRun({ ...VALID, hours: '24', minutes: '0', seconds: '0' }, 'km').errors.duration,
    ).toBe('Must be under 24 hours');
    expect(
      validateRun({ ...VALID, hours: '23', minutes: '59', seconds: '59' }, 'km').errors.duration,
    ).toBeUndefined();
  });

  it('rolls 59:59 plus a second into an hour instead of rejecting it', () => {
    const draft = { ...VALID, hours: '0', minutes: '59', seconds: '60' };
    expect(validateRun(draft, 'km').value?.durationSec).toBe(3600);
  });

  it('reports both errors at once so the user fixes them in one pass', () => {
    const result = validateRun(EMPTY, 'km');
    expect(result.errors.distance).toBeDefined();
    expect(result.errors.duration).toBeDefined();
  });

  it('exposes a partial distance and duration for the live pace readout', () => {
    const result = validateRun({ distance: '10', hours: '', minutes: '50', seconds: '' }, 'km');
    expect(result.partial.distanceKm).toBe(10);
    expect(result.partial.durationSec).toBe(3000);
  });

  it('gives a null partial distance before anything is typed', () => {
    expect(validateRun(EMPTY, 'km').partial).toEqual({ distanceKm: null, durationSec: 0 });
  });
});
