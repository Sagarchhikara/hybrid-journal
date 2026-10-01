/**
 * Duration conversions. Pure, no React Native imports, so these are unit-testable
 * without a native runtime.
 */

export interface Hms {
  hours: number;
  minutes: number;
  seconds: number;
}

export const MAX_DURATION_SEC = 24 * 3600 - 1;

/**
 * Totals the parts without clamping the individual fields, so 59 minutes 59 seconds
 * plus one second rolls over into 1:00:00 rather than sticking at 59:60. Fractions and
 * negatives are discarded — the inputs come from numeric keypads.
 */
export function hmsToSeconds({ hours, minutes, seconds }: Hms): number {
  const safe = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0);
  return safe(hours) * 3600 + safe(minutes) * 60 + safe(seconds);
}

export function secondsToHms(totalSeconds: number): Hms {
  const total = Number.isFinite(totalSeconds) ? Math.max(0, Math.round(totalSeconds)) : 0;
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

/** '48:20' under an hour, '1:12:05' at or over. */
export function formatDuration(totalSeconds: number): string {
  const { hours, minutes, seconds } = secondsToHms(totalSeconds);
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** '7h 42m', for sleep. */
export function formatHoursMinutes(totalMinutes: number): string {
  const minutes = Number.isFinite(totalMinutes) ? Math.max(0, Math.round(totalMinutes)) : 0;
  return `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;
}
