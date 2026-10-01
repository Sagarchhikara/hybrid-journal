import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

export type SystemColorScheme = 'light' | 'dark' | null;

function subscribe(onChange: () => void): () => void {
  const subscription = Appearance.addChangeListener(onChange);
  return () => subscription.remove();
}

function getSnapshot(): SystemColorScheme {
  // React Native can also report 'unspecified'; treat it as "no preference".
  const scheme = Appearance.getColorScheme();
  return scheme === 'light' || scheme === 'dark' ? scheme : null;
}

/**
 * React Native's own `useColorScheme` reads `matchMedia` during render, which
 * mismatches between static web output and the hydrated client. Going through
 * `useSyncExternalStore` with an explicit server snapshot fixes that without the
 * setState-in-an-effect dance the Expo template uses (which the React Compiler
 * lint rightly rejects), and behaves identically on native.
 */
export function useColorScheme(): SystemColorScheme {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
