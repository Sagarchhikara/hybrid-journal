import type { Exercise } from '@/db/schema';

export interface LibrarySections {
  active: Exercise[];
  /** Kept out of the main list: archived lifts are history, not choices. */
  archived: Exercise[];
}

/**
 * Splits a library listing into its two sections, preserving the query's own ordering
 * within each. Active comes first because that is what the screen is for; archived stays
 * reachable because archiving is the only way a lift leaves the picker, and it has to be
 * undoable.
 */
export function splitLibrary(exercises: readonly Exercise[]): LibrarySections {
  const active: Exercise[] = [];
  const archived: Exercise[] = [];

  for (const exercise of exercises) {
    if (exercise.archivedAt === null) active.push(exercise);
    else archived.push(exercise);
  }

  return { active, archived };
}

/**
 * Whether the bodyweight flag can still be changed, and why not when it cannot.
 *
 * `is_bodyweight` decides how a set's stored `weight_kg` is READ: null means plain
 * bodyweight on a bodyweight lift, and on a weighted lift it is not a valid lift at all.
 * Flipping the flag under existing sets would silently reinterpret every one of them —
 * 10 reps at bodyweight would become 10 reps at no load. So the flag is frozen once
 * anything is logged, rather than offering an edit that quietly rewrites history.
 */
export function bodyweightLock(loggedSets: number): { editable: boolean; reason?: string } {
  if (loggedSets === 0) return { editable: true };

  return {
    editable: false,
    reason: `Fixed once sets are logged. ${loggedSets} ${
      loggedSets === 1 ? 'set reads' : 'sets read'
    } its weight using this setting.`,
  };
}
