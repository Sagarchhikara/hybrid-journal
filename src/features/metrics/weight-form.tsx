import { getDailyMetric, useSettings } from '@/db';
import type { DateKey } from '@/lib/dates';
import { fromStoredWeightKg } from '@/lib/units';

import { MetricForm } from './metric-form';
import { validateWeight } from './validate';

export function WeightForm({ date }: { date?: DateKey }) {
  const { settings } = useSettings();
  const unit = settings.weightUnit;

  return (
    <MetricForm
      date={date}
      label="Weight"
      unitLabel={unit}
      hint="Stored in kg; shown in your chosen unit."
      decimal
      field="weightKg"
      readExisting={async (date) => {
        const row = await getDailyMetric(date);
        if (row?.weightKg === null || row?.weightKg === undefined) return null;
        // Prefill in the unit being displayed, not the stored kg.
        return String(Number(fromStoredWeightKg(row.weightKg, unit).toFixed(1)));
      }}
      validate={(raw) => validateWeight(raw, unit)}
      toPatch={(weightKg) => ({ weightKg })}
    />
  );
}
