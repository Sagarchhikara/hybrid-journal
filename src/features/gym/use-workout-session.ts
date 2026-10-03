import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useSettings } from '@/db';
import { getWorkoutDetail, replaceWorkout, saveWorkout } from '@/db/queries/gym';
import { clearGymDraft, readGymDraft, writeGymDraft } from '@/db/queries/gym-draft';
import { getLastSessions, type LastSession } from '@/db/queries/last-session';
import { todayLocal } from '@/lib/dates';
import type { WeightUnit } from '@/lib/units';

import {
  createDraft,
  draftReducer,
  isUntouched,
  type DraftAction,
  type WorkoutDraft,
} from './draft';
import { draftFromWorkout, validateDraft, type DraftValidation } from './draft-rows';
import { lastSessionToDraftSets } from './format-sets';
import { createDraftWriter } from './draft-writer';

export interface WorkoutSession {
  draft: WorkoutDraft | null;
  dispatch: (action: DraftAction) => void;
  loading: boolean;
  /** True while editing a finished workout rather than logging a new one. */
  editing: boolean;
  unit: WeightUnit;
  validation: DraftValidation;
  /** Previous appearance of each exercise on screen, keyed by exercise id. */
  lastSessions: Map<number, LastSession>;
  saving: boolean;
  error: string | undefined;
  /** Writes real rows in one transaction. Resolves true on success. */
  finish: () => Promise<boolean>;
  /** Throws the draft away without writing anything. */
  discard: () => Promise<void>;
}

export interface UseWorkoutSessionOptions {
  /** Present when editing a finished workout. */
  workoutId?: number;
  /** Used when starting fresh and no stored draft exists. */
  initialName?: string;
}

/**
 * Owns the draft for the logging screen.
 *
 * A new workout's draft is persisted to app_settings, debounced, so killing the app
 * mid-session loses nothing. An EDIT of a finished workout is held in memory only: it
 * already exists as rows, and writing it to the draft slot would make "resume workout"
 * offer to resume something that is not in progress.
 */
/**
 * The draft is null until loaded, so the pure reducer is wrapped rather than given a fake
 * initial value. Only `replace` can create a draft from nothing.
 */
const EMPTY_SESSIONS: Map<number, LastSession> = new Map();

function sessionReducer(state: WorkoutDraft | null, action: DraftAction): WorkoutDraft | null {
  if (action.type === 'replace') return action.draft;
  if (state === null) return state;
  return draftReducer(state, action);
}

export function useWorkoutSession(options: UseWorkoutSessionOptions = {}): WorkoutSession {
  const { workoutId, initialName } = options;
  const editing = workoutId !== undefined;

  const { settings, loading: settingsLoading } = useSettings();
  const unit = settings.weightUnit;

  const [draft, dispatch] = useReducer(sessionReducer, null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [lastSessions, setLastSessions] = useState<Map<number, LastSession>>(new Map());

  // Only a new workout's draft is persisted; see the note above.
  const writer = useMemo(
    () => createDraftWriter({ write: (next) => writeGymDraft(next, { silent: true }) }),
    [],
  );
  const loadedFor = useRef<string | null>(null);

  // --- load -----------------------------------------------------------------
  useEffect(() => {
    const key = `${workoutId ?? 'new'}:${settingsLoading}`;
    if (settingsLoading || loadedFor.current === key) return;
    loadedFor.current = key;

    let active = true;

    (async () => {
      if (editing) {
        const detail = await getWorkoutDetail(workoutId);
        if (!active) return;
        if (!detail) {
          setError('That workout no longer exists');
        } else {
          dispatch({ type: 'replace', draft: draftFromWorkout(detail, unit) });
        }
      } else {
        const stored = await readGymDraft();
        if (!active) return;
        dispatch({
          type: 'replace',
          draft: stored ?? createDraft({ date: todayLocal(), name: initialName ?? '' }),
        });
      }
      if (active) setLoading(false);
    })().catch((cause: unknown) => {
      if (!active) return;
      setError(cause instanceof Error ? cause.message : String(cause));
      setLoading(false);
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutId, settingsLoading]);

  // --- persist --------------------------------------------------------------
  useEffect(() => {
    if (editing || draft === null || loading) return;
    writer.schedule(draft);
  }, [draft, editing, loading, writer]);

  // Flush on the way to the background: a debounce timer does not survive being killed.
  useEffect(() => {
    if (editing) return;

    function onAppStateChange(status: AppStateStatus): void {
      if (status !== 'active') void writer.flush();
    }

    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, [editing, writer]);

  // --- last-session recall --------------------------------------------------
  const exerciseKey = draft?.exercises.map((exercise) => exercise.exerciseId).join(',') ?? '';

  useEffect(() => {
    if (draft === null) return;
    const ids = draft.exercises.map((exercise) => exercise.exerciseId);
    if (ids.length === 0) return;

    let active = true;
    getLastSessions(ids, { onOrBefore: draft.date, excludeWorkoutId: workoutId })
      .then((sessions) => {
        if (active) setLastSessions(sessions);
      })
      .catch(() => {
        // Recall is a convenience; failing to load it must not block logging.
        if (active) setLastSessions(new Map());
      });

    return () => {
      active = false;
    };
    // Re-runs when the exercise list or the draft's date changes, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseKey, draft?.date, workoutId]);

  // --- prefill from recall ---------------------------------------------------
  // Replaces the old "Fill from last" button: an exercise nobody has typed into is
  // filled with last session's sets, marked recalled so they render lighter. Only
  // untouched exercises are filled, so this can never overwrite entered work, and
  // `filledFor` keeps it to once per exercise — re-filling after a deliberate clear
  // would be the screen arguing with the user.
  const filledFor = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (draft === null || editing) return;

    for (const exercise of draft.exercises) {
      if (filledFor.current.has(exercise.localId)) continue;

      const session = lastSessions.get(exercise.exerciseId);
      if (!session || session.sets.length === 0) continue;
      if (!isUntouched(exercise)) continue;

      filledFor.current.add(exercise.localId);
      dispatch({
        type: 'fillFromLast',
        exerciseLocalId: exercise.localId,
        sets: lastSessionToDraftSets(session, unit),
        recalled: true,
      });
    }
  }, [draft, editing, lastSessions, unit]);

  // Derived rather than cleared inside the effect: with no exercises on screen there is
  // nothing to recall, and setting state synchronously in an effect is a cascading render.
  const visibleLastSessions =
    draft === null || draft.exercises.length === 0 ? EMPTY_SESSIONS : lastSessions;

  const validation = useMemo(
    () =>
      draft === null
        ? { setErrors: new Map<number, string>(), workoutError: undefined, rows: null }
        : validateDraft(draft, unit),
    [draft, unit],
  );

  // --- finish / discard -----------------------------------------------------
  const finish = useCallback(async (): Promise<boolean> => {
    if (draft === null) return false;

    const result = validateDraft(draft, unit);
    if (result.rows === null) {
      setError(result.workoutError ?? 'Fix the highlighted sets first');
      return false;
    }

    // Before any write: a debounced save landing after the draft is cleared would make
    // the app offer to resume a workout that has already been finished.
    writer.disable();
    setSaving(true);
    setError(undefined);

    try {
      if (editing) await replaceWorkout(workoutId, result.rows);
      else {
        await saveWorkout(result.rows);
        await clearGymDraft();
      }
      return true;
    } catch (cause) {
      // Re-arm so the draft keeps persisting while the user retries.
      writer.enable();
      setSaving(false);
      setError(cause instanceof Error ? cause.message : String(cause));
      return false;
    }
  }, [draft, editing, unit, workoutId, writer]);

  const discard = useCallback(async (): Promise<void> => {
    writer.disable();
    if (!editing) await clearGymDraft();
  }, [editing, writer]);

  return {
    draft,
    dispatch,
    // Deliberately NOT `loading || settingsLoading`. The load effect below already waits
    // for settings before reading the draft, so `loading` covers the first render. Every
    // write in the app bumps the data version, which puts useSettings back into its
    // loading state — including the debounced write of this very draft. Folding that in
    // made the screen swap itself for a spinner 600ms after each keystroke, which
    // unmounted the inputs and dismissed the keyboard mid-set.
    loading,
    editing,
    unit,
    validation,
    lastSessions: visibleLastSessions,
    saving,
    error,
    finish,
    discard,
  };
}
