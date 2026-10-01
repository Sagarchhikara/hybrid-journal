/**
 * Parsing for numeric text inputs. Inputs are held as strings so partial entry like '6.'
 * is possible while typing; these run at validation time, not on every keystroke.
 */

/**
 * A plain positive decimal, or null. Rejects '', '.', '1.2.3', '6,2', '-3', '1e5' and
 * 'abc' rather than letting Number() turn them into NaN or something surprising.
 */
export function parseDecimalInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (!/^\d*\.?\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** A whole number, with anything unparseable treated as zero. */
export function parseIntegerInput(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === '' || !/^\d+$/.test(trimmed)) return 0;
  return Number(trimmed);
}
