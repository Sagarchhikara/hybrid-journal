import { DEFAULT_SETTINGS, getSettings, type Settings } from './queries/settings';
import { useDbQuery } from './use-db-query';

export interface UseSettingsResult {
  settings: Settings;
  loading: boolean;
}

/**
 * Falls back to kg/km while the first read is in flight, so no screen has to handle an
 * undefined unit. Writes through setWeightUnit/setDistanceUnit bump the data version,
 * which re-runs this automatically.
 */
export function useSettings(): UseSettingsResult {
  const { data, loading } = useDbQuery(getSettings, []);
  return { settings: data ?? DEFAULT_SETTINGS, loading };
}
