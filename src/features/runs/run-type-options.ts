import type { RunType } from '@/db/schema';

export const RUN_TYPE_OPTIONS: readonly { value: RunType; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'long', label: 'Long' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'interval', label: 'Interval' },
  { value: 'race', label: 'Race' },
];
