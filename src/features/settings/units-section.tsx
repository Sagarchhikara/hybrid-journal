import { View } from 'react-native';

import { Field, SegmentedControl, Text } from '@/components';
import { setDistanceUnit, setWeightUnit, useSettings } from '@/db';
import { DISTANCE_UNITS, WEIGHT_UNITS } from '@/lib/units';
import { useTheme } from '@/theme';

const DISTANCE_OPTIONS = DISTANCE_UNITS.map((unit) => ({
  value: unit,
  label: unit === 'km' ? 'Kilometres' : 'Miles',
}));

const WEIGHT_OPTIONS = WEIGHT_UNITS.map((unit) => ({
  value: unit,
  label: unit === 'kg' ? 'Kilograms' : 'Pounds',
}));

/**
 * Display units only. Everything is stored in kg and km, so switching these changes what
 * you read and how your typing is interpreted — it never rewrites a stored row.
 */
export function UnitsSection() {
  const { spacing } = useTheme();
  const { settings } = useSettings();

  return (
    <View style={{ gap: spacing.lg }}>
      <Text variant="heading">Units</Text>

      <Field label="Distance">
        <SegmentedControl
          options={DISTANCE_OPTIONS}
          value={settings.distanceUnit}
          onChange={(unit) => void setDistanceUnit(unit)}
        />
      </Field>

      <Field label="Weight" hint="Stored in kg and km regardless; this only changes what is shown.">
        <SegmentedControl
          options={WEIGHT_OPTIONS}
          value={settings.weightUnit}
          onChange={(unit) => void setWeightUnit(unit)}
        />
      </Field>
    </View>
  );
}
