import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { todayLocal } from '@/lib/dates';

import { bumpDataVersion } from './data-version';

/** How often to notice a date rollover while the app stays in the foreground. */
const ROLLOVER_CHECK_MS = 30_000;

/**
 * Keeps date-relative reads honest.
 *
 * Two things invalidate a cached read without any write happening:
 *  - the app was backgrounded and data changed, or simply time passed;
 *  - the local calendar date rolled over, which moves "this week" and "today" even
 *    though nothing in the database changed.
 *
 * Mounted once from the root layout. It bumps the same data version writes use, so
 * every useDbQuery refetches.
 */
export function useDataFreshness(): void {
  const lastSeenDate = useRef(todayLocal());

  useEffect(() => {
    function refreshIfDateChanged(): boolean {
      const today = todayLocal();
      if (today === lastSeenDate.current) return false;
      lastSeenDate.current = today;
      bumpDataVersion();
      return true;
    }

    function onAppStateChange(status: AppStateStatus): void {
      if (status !== 'active') return;
      // Returning to the foreground always refetches; the date check only decides
      // whether this was also a rollover, since both paths bump the same counter.
      if (!refreshIfDateChanged()) bumpDataVersion();
    }

    const subscription = AppState.addEventListener('change', onAppStateChange);
    const interval = setInterval(refreshIfDateChanged, ROLLOVER_CHECK_MS);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);
}
