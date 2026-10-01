import { parseIntegerInput } from '@/lib/input';

/** A night's sleep cannot exceed a day. */
export const MAX_SLEEP_MIN = 24 * 60;

export interface SleepDraft {
  hours: string;
  minutes: string;
}

export interface SleepValidation {
  error: string | undefined;
  /** Present only when valid. */
  durationMin: number | null;
  /** What has been entered so far, for the live readout. */
  partialMin: number;
}

/** Quick picks, in minutes. Covers the range most nights land in. */
export const SLEEP_QUICK_PICKS: readonly number[] = [360, 390, 420, 450, 480];

export function sleepDraftFromMinutes(totalMinutes: number): SleepDraft {
  return {
    hours: String(Math.floor(totalMinutes / 60)),
    minutes: String(totalMinutes % 60).padStart(2, '0'),
  };
}

export function validateSleep(draft: SleepDraft): SleepValidation {
  // Minutes are not clamped to 59, so entering 90 minutes gives 1h30 rather than an error.
  const partialMin = parseIntegerInput(draft.hours) * 60 + parseIntegerInput(draft.minutes);

  let error: string | undefined;
  if (partialMin <= 0) error = 'Enter how long you slept';
  else if (partialMin > MAX_SLEEP_MIN) error = 'Must be under 24 hours';

  return { error, durationMin: error === undefined ? partialMin : null, partialMin };
}
