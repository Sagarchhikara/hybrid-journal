import { isDateKey, type DateKey } from '@/lib/dates';

import type { DraftExercise, DraftSet, WorkoutDraft } from './draft';

/** Bumped if the draft shape ever changes incompatibly; older payloads are discarded. */
export const DRAFT_VERSION = 1;

interface StoredDraft {
  version: number;
  draft: WorkoutDraft;
}

export function serializeDraft(draft: WorkoutDraft): string {
  const payload: StoredDraft = { version: DRAFT_VERSION, draft };
  return JSON.stringify(payload);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseSet(value: unknown): DraftSet | null {
  if (!isRecord(value)) return null;
  const localId = asFiniteNumber(value.localId);
  const weight = asString(value.weight);
  const reps = asString(value.reps);
  if (localId === null || weight === null || reps === null) return null;
  return { localId, weight, reps };
}

function parseExercise(value: unknown): DraftExercise | null {
  if (!isRecord(value)) return null;
  const localId = asFiniteNumber(value.localId);
  const exerciseId = asFiniteNumber(value.exerciseId);
  const name = asString(value.name);
  if (localId === null || exerciseId === null || name === null) return null;
  if (!Array.isArray(value.sets)) return null;

  const sets: DraftSet[] = [];
  for (const raw of value.sets) {
    const set = parseSet(raw);
    if (set === null) return null;
    sets.push(set);
  }

  return {
    localId,
    exerciseId,
    name,
    isBodyweight: value.isBodyweight === true,
    sets,
  };
}

/**
 * Parses a stored draft, returning null for anything unusable.
 *
 * This runs on every launch, so it has to treat the stored string as untrusted: a crash
 * here would be an app that cannot start, recoverable only by reinstalling. Every field
 * is checked rather than cast, and a null return tells the caller to drop the row.
 */
export function deserializeDraft(raw: string | null | undefined): WorkoutDraft | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  if (asFiniteNumber(parsed.version) !== DRAFT_VERSION) return null;
  if (!isRecord(parsed.draft)) return null;

  const draft = parsed.draft;
  const date = asString(draft.date);
  const name = asString(draft.name);
  const notes = asString(draft.notes);
  const nextLocalId = asFiniteNumber(draft.nextLocalId);

  if (date === null || !isDateKey(date)) return null;
  if (name === null || notes === null || nextLocalId === null) return null;
  if (!Array.isArray(draft.exercises)) return null;

  const exercises: DraftExercise[] = [];
  for (const raw of draft.exercises) {
    const exercise = parseExercise(raw);
    if (exercise === null) return null;
    exercises.push(exercise);
  }

  const workoutId = draft.workoutId === null ? null : asFiniteNumber(draft.workoutId);

  // Keep localIds from colliding if a stored draft was written with a stale counter.
  const highestLocalId = exercises.reduce(
    (highest, exercise) =>
      exercise.sets.reduce(
        (inner, set) => Math.max(inner, set.localId),
        Math.max(highest, exercise.localId),
      ),
    0,
  );

  return {
    workoutId,
    date: date as DateKey,
    name,
    notes,
    exercises,
    nextLocalId: Math.max(nextLocalId, highestLocalId + 1),
  };
}
