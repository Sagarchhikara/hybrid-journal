import { hmsToSeconds, MAX_DURATION_SEC, type Hms } from '@/lib/duration';
import { parseDecimalInput, parseIntegerInput } from '@/lib/input';
import { toStoredDistanceKm, type DistanceUnit } from '@/lib/units';

/** 500 km covers any ultra anyone is logging by hand; beyond it, it's a typo. */
export const MAX_DISTANCE_KM = 500;

export interface RunDraft {
  distance: string;
  hours: string;
  minutes: string;
  seconds: string;
}

export interface RunErrors {
  distance?: string;
  duration?: string;
}

export function draftToHms(draft: RunDraft): Hms {
  return {
    hours: parseIntegerInput(draft.hours),
    minutes: parseIntegerInput(draft.minutes),
    seconds: parseIntegerInput(draft.seconds),
  };
}

export interface ValidatedRun {
  distanceKm: number;
  durationSec: number;
}

export interface RunValidation {
  errors: RunErrors;
  /** Present only when every field is valid. */
  value: ValidatedRun | null;
  /** Distance in km and duration in seconds as entered so far, for the live pace readout. */
  partial: { distanceKm: number | null; durationSec: number };
}

/**
 * Validates a draft against the user's chosen distance unit, converting to km. The
 * returned `partial` lets the form show a live pace before the draft is complete.
 */
export function validateRun(draft: RunDraft, unit: DistanceUnit): RunValidation {
  const errors: RunErrors = {};

  const enteredDistance = parseDecimalInput(draft.distance);
  const distanceKm = enteredDistance === null ? null : toStoredDistanceKm(enteredDistance, unit);
  const durationSec = hmsToSeconds(draftToHms(draft));

  if (draft.distance.trim() === '') {
    errors.distance = 'Enter a distance';
  } else if (enteredDistance === null) {
    errors.distance = 'Not a number';
  } else if (enteredDistance <= 0) {
    errors.distance = 'Must be more than zero';
  } else if (distanceKm !== null && distanceKm > MAX_DISTANCE_KM) {
    errors.distance = `Must be under ${MAX_DISTANCE_KM} km`;
  }

  if (durationSec <= 0) {
    errors.duration = 'Enter a duration';
  } else if (durationSec > MAX_DURATION_SEC) {
    errors.duration = 'Must be under 24 hours';
  }

  const valid =
    errors.distance === undefined &&
    errors.duration === undefined &&
    distanceKm !== null &&
    distanceKm > 0;

  return {
    errors,
    value: valid ? { distanceKm, durationSec } : null,
    partial: { distanceKm, durationSec },
  };
}
