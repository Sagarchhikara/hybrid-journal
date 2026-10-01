import { describe, expect, it } from 'vitest';

import {
  MAX_SLEEP_MIN,
  SLEEP_QUICK_PICKS,
  sleepDraftFromMinutes,
  validateSleep,
} from '../validate';

describe('validateSleep', () => {
  it('accepts hours and minutes', () => {
    expect(validateSleep({ hours: '7', minutes: '42' }).durationMin).toBe(462);
  });

  it('accepts hours alone', () => {
    expect(validateSleep({ hours: '8', minutes: '' }).durationMin).toBe(480);
  });

  it('accepts minutes alone, for a nap-length entry', () => {
    expect(validateSleep({ hours: '', minutes: '45' }).durationMin).toBe(45);
  });

  it('does not clamp minutes, so 90 becomes an hour and a half', () => {
    expect(validateSleep({ hours: '0', minutes: '90' }).durationMin).toBe(90);
    expect(validateSleep({ hours: '1', minutes: '90' }).durationMin).toBe(150);
  });

  it('requires something', () => {
    expect(validateSleep({ hours: '', minutes: '' }).error).toBe('Enter how long you slept');
    expect(validateSleep({ hours: '0', minutes: '0' }).durationMin).toBeNull();
  });

  it('rejects more than a day', () => {
    expect(validateSleep({ hours: '25', minutes: '' }).error).toBe('Must be under 24 hours');
    expect(validateSleep({ hours: '24', minutes: '1' }).error).toBe('Must be under 24 hours');
    expect(validateSleep({ hours: '24', minutes: '0' }).durationMin).toBe(MAX_SLEEP_MIN);
  });

  it('exposes a partial total even when invalid', () => {
    expect(validateSleep({ hours: '', minutes: '' }).partialMin).toBe(0);
    expect(validateSleep({ hours: '30', minutes: '' }).partialMin).toBe(1800);
  });

  it('ignores non-numeric input rather than producing NaN', () => {
    expect(validateSleep({ hours: 'abc', minutes: '30' }).durationMin).toBe(30);
  });
});

describe('sleepDraftFromMinutes', () => {
  it('splits minutes into padded fields', () => {
    expect(sleepDraftFromMinutes(462)).toEqual({ hours: '7', minutes: '42' });
    expect(sleepDraftFromMinutes(480)).toEqual({ hours: '8', minutes: '00' });
    expect(sleepDraftFromMinutes(390)).toEqual({ hours: '6', minutes: '30' });
  });

  it('round-trips through validateSleep', () => {
    for (const minutes of [1, 45, 360, 390, 462, 480, MAX_SLEEP_MIN]) {
      expect(validateSleep(sleepDraftFromMinutes(minutes)).durationMin).toBe(minutes);
    }
  });
});

describe('SLEEP_QUICK_PICKS', () => {
  it('are the five common durations from 6h to 8h', () => {
    expect(SLEEP_QUICK_PICKS).toEqual([360, 390, 420, 450, 480]);
  });

  it('are all valid', () => {
    for (const minutes of SLEEP_QUICK_PICKS) {
      expect(validateSleep(sleepDraftFromMinutes(minutes)).error).toBeUndefined();
    }
  });
});
