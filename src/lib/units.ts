/**
 * Unit conversion and display formatting.
 *
 * Storage is always kg and km (see src/db/schema.ts). Units are a display and input
 * concern only: forms convert the user's entry into kg/km before saving, and formatters
 * convert back out. Nothing here is persisted.
 */

export const WEIGHT_UNITS = ['kg', 'lb'] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export const DISTANCE_UNITS = ['km', 'mi'] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

export const KG_PER_LB = 0.45359237;
export const KM_PER_MI = 1.609344;

export function lbToKg(pounds: number): number {
  return pounds * KG_PER_LB;
}

export function kgToLb(kilograms: number): number {
  return kilograms / KG_PER_LB;
}

export function miToKm(miles: number): number {
  return miles * KM_PER_MI;
}

export function kmToMi(kilometres: number): number {
  return kilometres / KM_PER_MI;
}

/** User's entered weight -> kg for storage. */
export function toStoredWeightKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : lbToKg(value);
}

/** Stored kg -> the user's unit, for display and for prefilling a form. */
export function fromStoredWeightKg(weightKg: number, unit: WeightUnit): number {
  return unit === 'kg' ? weightKg : kgToLb(weightKg);
}

/** User's entered distance -> km for storage. */
export function toStoredDistanceKm(value: number, unit: DistanceUnit): number {
  return unit === 'km' ? value : miToKm(value);
}

/** Stored km -> the user's unit. */
export function fromStoredDistanceKm(distanceKm: number, unit: DistanceUnit): number {
  return unit === 'km' ? distanceKm : kmToMi(distanceKm);
}

export function formatDistance(distanceKm: number, unit: DistanceUnit): string {
  return `${fromStoredDistanceKm(distanceKm, unit).toFixed(2)} ${unit}`;
}

/**
 * Like formatDistance but without trailing zeros: '6.2 km', not '6.20 km'. Used in list
 * rows, where a fixed two decimals is noise.
 */
export function formatDistanceCompact(distanceKm: number, unit: DistanceUnit): string {
  const value = fromStoredDistanceKm(distanceKm, unit);
  return `${Number(value.toFixed(2))} ${unit}`;
}

export function formatWeight(weightKg: number, unit: WeightUnit): string {
  return `${fromStoredWeightKg(weightKg, unit).toFixed(1)} ${unit}`;
}

/** Bodyweight sets store no weight at all. */
export function formatSetWeight(weightKg: number | null, unit: WeightUnit): string {
  return weightKg === null ? 'BW' : formatWeight(weightKg, unit);
}

export function formatSteps(steps: number): string {
  return steps.toLocaleString('en-US');
}
