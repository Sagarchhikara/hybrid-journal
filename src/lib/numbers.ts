/**
 * Coercion for values arriving from SQLite aggregates.
 *
 * Drizzle types `sum()` and `avg()` as `string | null` and decodes them that way at
 * runtime — a SUM of 16.2 arrives as the string '16.2', and an aggregate over zero rows
 * arrives as null. `count()` is a real number. Every aggregate read goes through here
 * so a missing cast cannot silently produce string concatenation ('6.2' + '10' = '6.210')
 * or NaN in a displayed total.
 */
export function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  // null, undefined, boolean, object, function: no meaningful numeric reading.
  return null;
}

/** `toNumberOrNull` with a floor, for counts that must not be absent. */
export function toNumber(value: unknown, fallback = 0): number {
  return toNumberOrNull(value) ?? fallback;
}
