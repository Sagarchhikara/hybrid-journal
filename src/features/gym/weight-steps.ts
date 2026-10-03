import { fromStoredWeightKg, toStoredWeightKg, type WeightUnit } from '@/lib/units';

/** Plate-realistic increments, in the unit the user reads. */
export const WEIGHT_STEP: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };

/** Display weights are shown and round-tripped at one decimal place. */
export const WEIGHT_DECIMALS = 1;

export function roundDisplayWeight(value: number): number {
  return Number(value.toFixed(WEIGHT_DECIMALS));
}

/** Stored kg -> the number the input shows. */
export function toDisplayWeight(weightKg: number, unit: WeightUnit): number {
  return roundDisplayWeight(fromStoredWeightKg(weightKg, unit));
}

/** The number the input shows -> kg for storage. */
export function toStorageWeight(display: number, unit: WeightUnit): number {
  return toStoredWeightKg(display, unit);
}

/**
 * Snaps to the next grid point strictly above or below `current`, in the display unit.
 *
 * Snapping rather than adding means 72.3 steps up to 72.5, not 74.8 — it pulls a value
 * back onto real plate increments instead of carrying an offset forward forever, and it
 * keeps every value the buttons can produce exactly representable at one decimal place.
 * Floored at zero. A null current value (empty field) steps up to the first grid point.
 */
export function stepWeight(current: number | null, direction: 1 | -1, unit: WeightUnit): number {
  const step = WEIGHT_STEP[unit];
  const from = current === null || !Number.isFinite(current) ? 0 : Math.max(0, current);

  // The epsilon keeps a value already sitting on the grid from being treated as just
  // below it by floating point, which would make the button appear to do nothing.
  const epsilon = step * 1e-9;

  const next =
    direction === 1
      ? (Math.floor(from / step + epsilon) + 1) * step
      : (Math.ceil(from / step - epsilon) - 1) * step;

  return roundDisplayWeight(Math.max(0, next));
}

/** Every grid point from zero up to and including `max`, for tests and pickers. */
export function gridPoints(unit: WeightUnit, max: number): number[] {
  const step = WEIGHT_STEP[unit];
  const points: number[] = [];
  for (let value = 0; value <= max + step / 2; value += step) {
    points.push(roundDisplayWeight(value));
  }
  return points;
}
