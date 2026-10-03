import { format } from 'date-fns';

import type { LastSession } from '@/db/queries/last-session';
import { fromDateKey, type DateKey } from '@/lib/dates';
import type { WeightUnit } from '@/lib/units';

import { toDisplayWeight } from './weight-steps';

export interface SetLike {
  weightKg: number | null;
  reps: number;
  isDropSet?: boolean;
}

/**
 * One set as text. The reading of `weightKg` depends on whether the exercise is
 * bodyweight — see the schema comment on exercise_sets.
 */
export function formatSet(set: SetLike, isBodyweight: boolean, unit: WeightUnit): string {
  const drop = set.isDropSet === true ? ' (drop)' : '';

  if (set.weightKg === null) {
    return isBodyweight ? `BW × ${set.reps}${drop}` : `× ${set.reps}${drop}`;
  }

  const weight = toDisplayWeight(set.weightKg, unit);
  return isBodyweight
    ? `BW +${weight} ${unit} × ${set.reps}${drop}`
    : `${weight} ${unit} × ${set.reps}${drop}`;
}

/** Compact form for a recall line: the unit is stated once at the end, not per set. */
function formatSetCompact(set: SetLike, isBodyweight: boolean, unit: WeightUnit): string {
  // A lowercase 'd' rather than '(drop)': this form has to fit on one recall line.
  const drop = set.isDropSet === true ? 'd' : '';
  if (set.weightKg === null)
    return isBodyweight ? `BW × ${set.reps}${drop}` : `× ${set.reps}${drop}`;
  const weight = toDisplayWeight(set.weightKg, unit);
  return isBodyweight ? `BW+${weight} × ${set.reps}${drop}` : `${weight} × ${set.reps}${drop}`;
}

export function formatSetList(
  sets: readonly SetLike[],
  isBodyweight: boolean,
  unit: WeightUnit,
): string {
  return sets.map((set) => formatSetCompact(set, isBodyweight, unit)).join(' / ');
}

/** 'Sep 28' — short enough to sit at the end of a recall line. */
export function formatRecallDate(date: DateKey): string {
  return format(fromDateKey(date), 'MMM d');
}

/**
 * The LAST SESSION line on an exercise card, e.g.
 * 'Last: 72.5 × 6 / 70 × 8 / 70 × 8 (Sep 28)'. Returns null when there is no history,
 * so the card can say something friendlier instead of showing an empty label.
 */
export function formatLastSession(
  session: LastSession | undefined,
  isBodyweight: boolean,
  unit: WeightUnit,
): string | null {
  if (!session || session.sets.length === 0) return null;
  return `Last: ${formatSetList(session.sets, isBodyweight, unit)} (${formatRecallDate(session.date)})`;
}

/** Turns a last session into draft set fields, for "Fill from last". */
export function lastSessionToDraftSets(
  session: LastSession,
  unit: WeightUnit,
): { weight: string; reps: string; isDropSet: boolean }[] {
  return session.sets.map((set) => ({
    weight: set.weightKg === null ? '' : String(toDisplayWeight(set.weightKg, unit)),
    reps: String(set.reps),
    isDropSet: set.isDropSet,
  }));
}
