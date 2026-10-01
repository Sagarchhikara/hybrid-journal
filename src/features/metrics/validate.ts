import { parseDecimalInput, parseIntegerInput } from '@/lib/input';
import { fromStoredWeightKg, toStoredWeightKg, type WeightUnit } from '@/lib/units';

/** Roughly double the highest verified daily step count; beyond this it is a typo. */
export const MAX_STEPS = 200_000;

export const MIN_WEIGHT_KG = 20;
export const MAX_WEIGHT_KG = 500;

export interface SingleValueValidation {
  error: string | undefined;
  /** Present only when valid. Weight is always in kg, whatever unit was typed. */
  value: number | null;
}

export function validateSteps(raw: string): SingleValueValidation {
  if (raw.trim() === '') return { error: 'Enter a step count', value: null };

  // parseIntegerInput maps junk to 0, so a non-empty field reading 0 is either a real
  // zero or malformed; either way it is not a step count worth storing.
  const steps = parseIntegerInput(raw);
  if (steps <= 0) return { error: 'Enter a whole number above zero', value: null };
  if (steps > MAX_STEPS)
    return { error: `Must be under ${MAX_STEPS.toLocaleString('en-US')}`, value: null };

  return { error: undefined, value: steps };
}

/** Bounds are checked in kg but reported in the user's unit, so the message is actionable. */
export function validateWeight(raw: string, unit: WeightUnit): SingleValueValidation {
  if (raw.trim() === '') return { error: 'Enter a weight', value: null };

  const entered = parseDecimalInput(raw);
  if (entered === null) return { error: 'Not a number', value: null };
  if (entered <= 0) return { error: 'Must be more than zero', value: null };

  const weightKg = toStoredWeightKg(entered, unit);
  const low = Number(fromStoredWeightKg(MIN_WEIGHT_KG, unit).toFixed(0));
  const high = Number(fromStoredWeightKg(MAX_WEIGHT_KG, unit).toFixed(0));

  if (weightKg < MIN_WEIGHT_KG || weightKg > MAX_WEIGHT_KG) {
    return { error: `Must be between ${low} and ${high} ${unit}`, value: null };
  }

  return { error: undefined, value: weightKg };
}
