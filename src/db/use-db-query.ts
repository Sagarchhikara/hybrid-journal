import { useCallback, useEffect, useState } from 'react';

import { useDataVersion } from './data-version';

export interface DbQueryResult<T> {
  /**
   * The most recent settled result. While a refetch is in flight this still holds the
   * previous value, so lists keep their rows instead of flashing an empty state.
   * Pair it with `loading` when that distinction matters.
   */
  data: T | undefined;
  error: Error | undefined;
  /** True until a result for the current deps has settled. */
  loading: boolean;
  refetch: () => void;
}

interface Settled<T> {
  key: string;
  data?: T;
  error?: Error;
}

function toError(cause: unknown): Error {
  return cause instanceof Error ? cause : new Error(String(cause));
}

/**
 * Runs an async query, re-running whenever `deps` change or anything is written.
 *
 * `loading` is derived by comparing the settled result's key against the current one
 * rather than flipped with a synchronous setState — that would be a cascading render,
 * which the React Compiler lint rejects. Results for a superseded key are ignored, so a
 * fast filter change cannot be overwritten by a slower earlier query.
 *
 * `deps` must be JSON-serialisable primitives; they are what identifies a query run.
 */
export function useDbQuery<T>(query: () => Promise<T>, deps: readonly unknown[]): DbQueryResult<T> {
  const version = useDataVersion((state) => state.version);
  const [manualVersion, setManualVersion] = useState(0);
  const [settled, setSettled] = useState<Settled<T>>();

  const key = JSON.stringify([deps, version, manualVersion]);

  useEffect(() => {
    let active = true;

    query()
      .then((data) => {
        if (active) setSettled({ key, data });
      })
      .catch((cause: unknown) => {
        if (active) setSettled({ key, error: toError(cause) });
      });

    return () => {
      active = false;
    };
    // `query` is an inline closure at every call site; `key` is the contract for when
    // it needs re-running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const refetch = useCallback(() => setManualVersion((value) => value + 1), []);
  const isFresh = settled?.key === key;

  return {
    data: settled?.data,
    error: isFresh ? settled?.error : undefined,
    loading: !isFresh,
    refetch,
  };
}
