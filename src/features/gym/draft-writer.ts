import type { WorkoutDraft } from './draft';

export const DRAFT_DEBOUNCE_MS = 600;

export interface DraftWriterOptions {
  write: (draft: WorkoutDraft) => Promise<void>;
  delayMs?: number;
}

export interface DraftWriter {
  /** Queue a write, replacing any already pending. */
  schedule: (draft: WorkoutDraft) => void;
  /** Write the pending draft immediately. Used when the app goes to the background. */
  flush: () => Promise<void>;
  /**
   * Cancel anything pending and ignore every later schedule or flush. Called before
   * finishing a workout so a debounced write cannot resurrect a draft that has been
   * turned into real rows.
   */
  disable: () => void;
  /** Re-arm after a failed save, so the draft keeps persisting. */
  enable: () => void;
  isDisabled: () => boolean;
  hasPending: () => boolean;
}

/**
 * Debounces draft persistence.
 *
 * Deliberately free of React and of any direct database import so the disable-on-finish
 * behaviour can be tested with fake timers in plain Node.
 */
export function createDraftWriter(options: DraftWriterOptions): DraftWriter {
  const delay = options.delayMs ?? DRAFT_DEBOUNCE_MS;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: WorkoutDraft | null = null;
  let disabled = false;

  function cancelTimer(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  async function writePending(): Promise<void> {
    const draft = pending;
    pending = null;
    cancelTimer();
    // Checked again here, not only on entry: disable() may land while awaiting.
    if (draft === null || disabled) return;
    await options.write(draft);
  }

  return {
    schedule(draft) {
      if (disabled) return;
      pending = draft;
      cancelTimer();
      timer = setTimeout(() => {
        void writePending();
      }, delay);
    },

    async flush() {
      if (disabled) {
        pending = null;
        cancelTimer();
        return;
      }
      await writePending();
    },

    disable() {
      disabled = true;
      pending = null;
      cancelTimer();
    },

    enable() {
      disabled = false;
    },

    isDisabled: () => disabled,
    hasPending: () => pending !== null,
  };
}
