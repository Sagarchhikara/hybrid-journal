/** The split names most people train on, offered as one-tap chips. */
export const WORKOUT_NAME_PRESETS: readonly string[] = [
  'Push',
  'Pull',
  'Legs',
  'Upper',
  'Lower',
  'Full body',
];

export function isPresetName(name: string): boolean {
  return WORKOUT_NAME_PRESETS.includes(name);
}
