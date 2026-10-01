import { useCallback, useEffect, useState } from 'react';

import { useDataVersion } from '@/db';
import { getHistoryPage, type HistoryEntry, type HistoryFilter } from '@/db/queries/history';
import type { DateKey } from '@/lib/dates';

interface Loaded {
  key: string;
  entries: HistoryEntry[];
  nextBefore: DateKey | null;
}

const NOTHING: Loaded = { key: '', entries: [], nextBefore: null };

export interface UseHistoryResult {
  entries: HistoryEntry[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: Error | undefined;
}

/**
 * Paginated history for one filter.
 *
 * Depth is tracked per filter, so switching to Runs and back does not throw away how far
 * you had scrolled. On a write the data version changes and the same number of pages is
 * re-fetched, so saving a run does not snap the list back to the top page.
 *
 * Nothing calls setState synchronously inside an effect: the loaded result carries the
 * key it was fetched for, and `loading` is derived from comparing keys.
 */
export function useHistory(filter: HistoryFilter): UseHistoryResult {
  const version = useDataVersion((state) => state.version);
  const [pagesByFilter, setPagesByFilter] = useState<Partial<Record<HistoryFilter, number>>>({});
  const [loaded, setLoaded] = useState<Loaded>(NOTHING);
  const [error, setError] = useState<Error>();

  const pages = pagesByFilter[filter] ?? 1;
  const key = `${filter}:${version}:${pages}`;

  useEffect(() => {
    let active = true;

    (async () => {
      const entries: HistoryEntry[] = [];
      let before: DateKey | undefined;
      let nextBefore: DateKey | null = null;

      for (let index = 0; index < pages; index += 1) {
        const page = await getHistoryPage({ before, filter });
        entries.push(...page.entries);
        nextBefore = page.nextBefore;
        if (page.nextBefore === null) break;
        before = page.nextBefore;
      }

      if (active) {
        setLoaded({ key, entries, nextBefore });
        setError(undefined);
      }
    })().catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause : new Error(String(cause)));
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const isFresh = loaded.key === key;
  // Keep showing rows while a write refetches; clear them when the filter changes.
  const sameFilter = loaded.key.startsWith(`${filter}:`);

  const loadMore = useCallback(() => {
    setPagesByFilter((current) => ({ ...current, [filter]: (current[filter] ?? 1) + 1 }));
  }, [filter]);

  return {
    entries: sameFilter ? loaded.entries : [],
    loading: !isFresh,
    hasMore: isFresh && loaded.nextBefore !== null,
    loadMore,
    error,
  };
}
