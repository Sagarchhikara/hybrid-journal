import { todayLocal, type DateKey } from '@/lib/dates';

/**
 * A workout in progress.
 *
 * Fields are held as the raw strings the inputs show, in the user's display unit, so
 * partial entry like '72.' survives a re-render. Conversion to kg and validation happen
 * in draft-rows.ts, once, on Finish.
 *
 * `localId` values are unique within a draft and come from `nextLocalId`, which keeps the
 * whole model pure and JSON-serialisable: no counters outside the data, no crypto.
 */
export interface DraftSet {
  localId: number;
  /** Display-unit weight. Empty means no load: bodyweight, or not yet entered. */
  weight: string;
  reps: string;
}

export interface DraftExercise {
  localId: number;
  exerciseId: number;
  /** Denormalised so the card renders without a join, and so a draft survives alone. */
  name: string;
  isBodyweight: boolean;
  sets: DraftSet[];
}

export interface WorkoutDraft {
  /** Set when editing a finished workout; null for a new one. */
  workoutId: number | null;
  date: DateKey;
  name: string;
  notes: string;
  exercises: DraftExercise[];
  nextLocalId: number;
}

export interface NewExerciseInput {
  exerciseId: number;
  name: string;
  isBodyweight: boolean;
}

export function createDraft(
  options: {
    name?: string;
    date?: DateKey;
    workoutId?: number | null;
  } = {},
): WorkoutDraft {
  return {
    workoutId: options.workoutId ?? null,
    date: options.date ?? todayLocal(),
    name: options.name ?? '',
    notes: '',
    exercises: [],
    nextLocalId: 1,
  };
}

export function emptySet(localId: number): DraftSet {
  return { localId, weight: '', reps: '' };
}

/** True when a set has nothing in it at all. These are dropped silently on Finish. */
export function isSetBlank(set: DraftSet): boolean {
  return set.weight.trim() === '' && set.reps.trim() === '';
}

/** True when the user has typed anything into this exercise. */
export function hasTypedSets(exercise: DraftExercise): boolean {
  return exercise.sets.some((set) => !isSetBlank(set));
}

export function isDraftEmpty(draft: WorkoutDraft): boolean {
  return draft.exercises.length === 0 && draft.notes.trim() === '';
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type DraftAction =
  | { type: 'setName'; name: string }
  | { type: 'setDate'; date: DateKey }
  | { type: 'setNotes'; notes: string }
  | { type: 'addExercise'; exercise: NewExerciseInput }
  | { type: 'removeExercise'; exerciseLocalId: number }
  | { type: 'moveExercise'; exerciseLocalId: number; direction: -1 | 1 }
  | {
      type: 'addSet';
      exerciseLocalId: number;
      /** Used when there is no previous set in this exercise to copy. */
      fallback?: { weight: string; reps: string };
    }
  | {
      type: 'updateSet';
      exerciseLocalId: number;
      setLocalId: number;
      patch: Partial<Omit<DraftSet, 'localId'>>;
    }
  | { type: 'removeSet'; exerciseLocalId: number; setLocalId: number }
  | { type: 'duplicateSet'; exerciseLocalId: number; setLocalId: number }
  | { type: 'clearSetWeight'; exerciseLocalId: number; setLocalId: number }
  | { type: 'fillFromLast'; exerciseLocalId: number; sets: { weight: string; reps: string }[] }
  | { type: 'replace'; draft: WorkoutDraft };

function mapExercise(
  draft: WorkoutDraft,
  exerciseLocalId: number,
  update: (exercise: DraftExercise) => DraftExercise,
): WorkoutDraft {
  return {
    ...draft,
    exercises: draft.exercises.map((exercise) =>
      exercise.localId === exerciseLocalId ? update(exercise) : exercise,
    ),
  };
}

export function draftReducer(draft: WorkoutDraft, action: DraftAction): WorkoutDraft {
  switch (action.type) {
    case 'setName':
      return { ...draft, name: action.name };

    case 'setDate':
      return { ...draft, date: action.date };

    case 'setNotes':
      return { ...draft, notes: action.notes };

    case 'addExercise': {
      const exercise: DraftExercise = {
        localId: draft.nextLocalId,
        exerciseId: action.exercise.exerciseId,
        name: action.exercise.name,
        isBodyweight: action.exercise.isBodyweight,
        // One empty set up front: the card is immediately ready to type into.
        sets: [emptySet(draft.nextLocalId + 1)],
      };
      return {
        ...draft,
        exercises: [...draft.exercises, exercise],
        nextLocalId: draft.nextLocalId + 2,
      };
    }

    case 'removeExercise':
      return {
        ...draft,
        exercises: draft.exercises.filter(
          (exercise) => exercise.localId !== action.exerciseLocalId,
        ),
      };

    case 'moveExercise': {
      const index = draft.exercises.findIndex(
        (exercise) => exercise.localId === action.exerciseLocalId,
      );
      const target = index + action.direction;
      if (index === -1 || target < 0 || target >= draft.exercises.length) return draft;

      const exercises = [...draft.exercises];
      const [moved] = exercises.splice(index, 1);
      exercises.splice(target, 0, moved!);
      return { ...draft, exercises };
    }

    case 'addSet': {
      const exercise = draft.exercises.find((item) => item.localId === action.exerciseLocalId);
      if (!exercise) return draft;

      // Prefill from the last set in this exercise, else from whatever the caller offers
      // (the same-position set of the last session).
      const previous = exercise.sets.at(-1);
      const seed =
        previous && !isSetBlank(previous)
          ? { weight: previous.weight, reps: previous.reps }
          : (action.fallback ?? { weight: '', reps: '' });

      return {
        ...mapExercise(draft, action.exerciseLocalId, (item) => ({
          ...item,
          sets: [...item.sets, { localId: draft.nextLocalId, ...seed }],
        })),
        nextLocalId: draft.nextLocalId + 1,
      };
    }

    case 'updateSet':
      return mapExercise(draft, action.exerciseLocalId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) =>
          set.localId === action.setLocalId ? { ...set, ...action.patch } : set,
        ),
      }));

    case 'clearSetWeight':
      return mapExercise(draft, action.exerciseLocalId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) =>
          set.localId === action.setLocalId ? { ...set, weight: '' } : set,
        ),
      }));

    case 'removeSet':
      return mapExercise(draft, action.exerciseLocalId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.filter((set) => set.localId !== action.setLocalId),
      }));

    case 'duplicateSet': {
      const exercise = draft.exercises.find((item) => item.localId === action.exerciseLocalId);
      const index = exercise?.sets.findIndex((set) => set.localId === action.setLocalId) ?? -1;
      if (!exercise || index === -1) return draft;

      const source = exercise.sets[index]!;
      const copy: DraftSet = {
        localId: draft.nextLocalId,
        weight: source.weight,
        reps: source.reps,
      };
      const sets = [...exercise.sets];
      sets.splice(index + 1, 0, copy);

      return {
        ...mapExercise(draft, action.exerciseLocalId, (item) => ({ ...item, sets })),
        nextLocalId: draft.nextLocalId + 1,
      };
    }

    case 'fillFromLast': {
      const exercise = draft.exercises.find((item) => item.localId === action.exerciseLocalId);
      if (!exercise || action.sets.length === 0) return draft;

      // Replaces outright. The screen is responsible for confirming first when
      // hasTypedSets() is true, so this stays a plain data operation.
      const sets = action.sets.map((set, offset) => ({
        localId: draft.nextLocalId + offset,
        weight: set.weight,
        reps: set.reps,
      }));

      return {
        ...mapExercise(draft, action.exerciseLocalId, (item) => ({ ...item, sets })),
        nextLocalId: draft.nextLocalId + action.sets.length,
      };
    }

    case 'replace':
      return action.draft;
  }
}
