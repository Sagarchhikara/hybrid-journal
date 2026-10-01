import type { DistanceUnit } from './units';

import { fromStoredDistanceKm } from './units';

/**
 * Pace is always derived, never stored (see src/db/schema.ts). These take the stored
 * km/second values and produce a pace in whichever unit the user reads in.
 */

/** Seconds per unit distance, or null when it cannot be computed. */
export function paceSecondsPer(
  distanceKm: number,
  durationSec: number,
  unit: DistanceUnit,
): number | null {
  if (!Number.isFinite(distanceKm) || !Number.isFinite(durationSec)) return null;
  if (distanceKm <= 0 || durationSec <= 0) return null;

  const distance = fromStoredDistanceKm(distanceKm, unit);
  if (distance <= 0) return null;

  return durationSec / distance;
}

/** "7:09/km". Returns null when distance or duration is zero, so callers choose the dash. */
export function formatPace(
  distanceKm: number,
  durationSec: number,
  unit: DistanceUnit,
): string | null {
  const secondsPer = paceSecondsPer(distanceKm, durationSec, unit);
  if (secondsPer === null) return null;

  const rounded = Math.round(secondsPer);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}/${unit}`;
}

/** Average speed in km/h, for anyone who thinks in speed rather than pace. */
export function speedKmh(distanceKm: number, durationSec: number): number | null {
  if (distanceKm <= 0 || durationSec <= 0) return null;
  return distanceKm / (durationSec / 3600);
}
