import { DISTANCE_UNITS, WEIGHT_UNITS, type DistanceUnit, type WeightUnit } from '@/lib/units';

import { bumpDataVersion } from '../data-version';
import { db } from '../client';
import { appSettings } from '../schema';

export const SETTING_KEYS = {
  weightUnit: 'weight_unit',
  distanceUnit: 'distance_unit',
} as const;

export interface Settings {
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
}

export const DEFAULT_SETTINGS: Settings = { weightUnit: 'kg', distanceUnit: 'km' };

function parseWeightUnit(value: string | undefined): WeightUnit {
  return WEIGHT_UNITS.find((unit) => unit === value) ?? DEFAULT_SETTINGS.weightUnit;
}

function parseDistanceUnit(value: string | undefined): DistanceUnit {
  return DISTANCE_UNITS.find((unit) => unit === value) ?? DEFAULT_SETTINGS.distanceUnit;
}

/** Unknown or absent keys fall back to kg/km, so a fresh install needs no seed row. */
export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(appSettings);
  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  return {
    weightUnit: parseWeightUnit(byKey.get(SETTING_KEYS.weightUnit)),
    distanceUnit: parseDistanceUnit(byKey.get(SETTING_KEYS.distanceUnit)),
  };
}

async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
  bumpDataVersion();
}

export async function setWeightUnit(unit: WeightUnit): Promise<void> {
  await setSetting(SETTING_KEYS.weightUnit, unit);
}

export async function setDistanceUnit(unit: DistanceUnit): Promise<void> {
  await setSetting(SETTING_KEYS.distanceUnit, unit);
}
