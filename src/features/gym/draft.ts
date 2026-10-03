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
  /** A drop set: the same exercise continued immediately at a lighter load. */
  isDropSet: boolean;
  /**
   * True while these numbers came from the last session and have not been touched.
   *
   * A recalled set is real: it is what you are about to do again, and Finish logs it
   * unchanged. The flag only drives the lighter styling and is cleared by the first
   * edit, so the card can show at a glance which rows you have confirmed.
   */
  isRecalled: boolean;
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

/**
 * The load a drop set starts at: 20% off, rounded to something you can actually load.
 * A starting point only — it is a text field like any other.
 */
export function dropWeight(weight: string): string {
  const parsed = Number(weight.trim());
  if (weight.trim() === '' || !Number.isFinite(parsed) || parsed <= 0) return '';

  const reduced = parsed * 0.8;
  // Half-kg precision below 20, whole units above: 2.5 off a 10kg dumbbell is a lot.
  const rounded = reduced < 20 ? Math.round(reduced * 2) / 2 : Math.round(reduced);
  return String(rounded);
}

export function emptySet(localId: number): DraftSet {
  return { localId, weight: '', reps: '', isDropSet: false, isRecalled: false };
}

/** True when a set has nothing in it at all. These are dropped silently on Finish. */
export function isSetBlank(set: DraftSet): boolean {
  return set.weight.trim() === '' && set.reps.trim() === '';
}

/** True when the user has typed anything into this exercise. */
export function hasTypedSets(exercise: DraftExercise): boolean {
  return exercise.sets.some((set) => !isSetBlank(set));
}

/**
 * True when nothing in this exercise has been confirmed by hand: every set is either
 * blank or still showing recalled numbers. This is what makes it safe to replace the
 * sets wholesale when the last session finally loads.
 */
export function isUntouched(exercise: DraftExercise): boolean {
  return exercise.sets.every((set) => set.isRecalled || isSetBlank(set));
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
      /** Appends a drop set, pre-reduced from the set above it. */
      drop?: boolean;
    }
  | { type: 'toggleDropSet'; exerciseLocalId: number; setLocalId: number }
  | {
      type: 'updateSet';
      exerciseLocalId: number;
      setLocalId: number;
      patch: Partial<Omit<DraftSet, 'localId'>>;
    }
  | { type: 'removeSet'; exerciseLocalId: number; setLocalId: number }
  | { type: 'duplicateSet'; exerciseLocalId: number; setLocalId: number }
  | { type: 'clearSetWeight'; exerciseLocalId: number; setLocalId: number }
  | {
      type: 'fillFromLast';
      exerciseLocalId: number;
      sets: { weight: string; reps: string; isDropSet: boolean }[];
      /** Marks the filled sets as recalled, so they render lighter until edited. */
      recalled?: boolean;
    }
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

      // A drop starts lighter than the set it follows and with the reps cleared: the
      // whole point is that you do not know yet how many you will get.
      const set: DraftSet = action.drop
        ? {
            localId: draft.nextLocalId,
            weight: dropWeight(seed.weight),
            reps: '',
            isDropSet: true,
            isRecalled: false,
          }
        : {
            localId: draft.nextLocalId,
            weight: seed.weight,
            reps: seed.reps,
            isDropSet: false,
            isRecalled: false,
          };

      return {
        ...mapExercise(draft, action.exerciseLocalId, (item) => ({
          ...item,
          sets: [...item.sets, set],
        })),
        nextLocalId: draft.nextLocalId + 1,
      };
    }

    case 'toggleDropSet':
      return mapExercise(draft, action.exerciseLocalId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) =>
          set.localId === action.setLocalId ? { ...set, isDropSet: !set.isDropSet } : set,
        ),
      }));

    case 'updateSet':
      return mapExercise(draft, action.exerciseLocalId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) =>
          // Touching a recalled set confirms it, which is what drops the lighter styling.
          set.localId === action.setLocalId ? { ...set, ...action.patch, isRecalled: false } : set,
        ),
      }));

    case 'clearSetWeight':
      return mapExercise(draft, action.exerciseLocalId, (exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) =>
          set.localId === action.setLocalId ? { ...set, weight: '', isRecalled: false } : set,
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
        isDropSet: source.isDropSet,
        isRecalled: false,
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
        isDropSet: set.isDropSet,
        isRecalled: action.recalled === true,
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
