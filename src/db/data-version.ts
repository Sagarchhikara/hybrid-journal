import { create } from 'zustand';

interface DataVersionState {
  version: number;
  bump: () => void;
}

/**
 * A single counter that every write bumps. Read hooks list it as a dependency and
 * refetch when it moves.
 *
 * Why not `useLiveQuery` everywhere: the history list is a paginated merge across
 * three tables, which a single live SELECT cannot express. Rather than run two
 * different refresh mechanisms side by side — and have to work out which one failed
 * when a screen goes stale — every mutation in src/db/queries bumps this, and every
 * read goes through useDbQuery. Coarse by design: a counter, not per-table keys,
 * because at journal scale a full refetch is a handful of indexed rows.
 */
export const useDataVersion = create<DataVersionState>((set) => ({
  version: 0,
  bump: () => set((state) => ({ version: state.version + 1 })),
}));

/**
 * Called from inside the mutation functions themselves, so a new call site cannot
 * forget to invalidate.
 */
export function bumpDataVersion(): void {
  useDataVersion.getState().bump();
}
