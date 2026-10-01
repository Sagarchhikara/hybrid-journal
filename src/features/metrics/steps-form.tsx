import { getDailyMetric } from '@/db';
import type { DateKey } from '@/lib/dates';

import { MetricForm } from './metric-form';
import { validateSteps } from './validate';

async function readSteps(date: DateKey): Promise<string | null> {
  const row = await getDailyMetric(date);
  return row?.steps === null || row?.steps === undefined ? null : String(row.steps);
}

/** Steps have no unit setting — a step is a step. */
export function StepsForm({ date }: { date?: DateKey }) {
  return (
    <MetricForm
      date={date}
      label="Steps"
      unitLabel="count"
      decimal={false}
      field="steps"
      readExisting={readSteps}
      validate={validateSteps}
      toPatch={(steps) => ({ steps })}
    />
  );
}
