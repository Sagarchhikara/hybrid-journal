import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { Button, DateField, Field, FormScreen, NumberField, Text } from '@/components';
import { clearDailyMetricField, upsertDailyMetric, type DailyMetricPatch } from '@/db';
import { todayLocal, type DateKey } from '@/lib/dates';

export interface MetricFormProps {
  /** Which date to edit. Defaults to today. */
  date?: DateKey;
  label: string;
  unitLabel: string;
  hint?: string;
  decimal: boolean;
  /** Reads the existing value for a date and renders it for the input. */
  readExisting: (date: DateKey) => Promise<string | null>;
  validate: (raw: string) => { error: string | undefined; value: number | null };
  toPatch: (value: number) => DailyMetricPatch;
  field: 'steps' | 'weightKg';
}

/**
 * Shared shell for the two single-value daily metrics.
 *
 * Steps and weight live in the same `daily_metrics` row but are independent facts, so
 * each writes through an upsert that names only its own column — saving steps leaves
 * that day's weight exactly as it was, and vice versa.
 */
export function MetricForm({
  date: initialDate,
  label,
  unitLabel,
  hint,
  decimal,
  readExisting,
  validate,
  toPatch,
  field,
}: MetricFormProps) {
  const router = useRouter();

  const [date, setDate] = useState<DateKey>(initialDate ?? todayLocal());
  const [raw, setRaw] = useState('');
  const [existing, setExisting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-runs on date change, so stepping days shows each day's own value.
  useEffect(() => {
    let active = true;

    readExisting(date)
      .then((value) => {
        if (!active) return;
        setExisting(value);
        setRaw(value ?? '');
      })
      .catch(() => {
        if (active) setExisting(null);
      });

    return () => {
      active = false;
    };
    // `readExisting` is a stable module-level function at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const { error, value } = validate(raw);

  async function save(): Promise<void> {
    if (value === null) return;
    setSaving(true);
    try {
      await upsertDailyMetric(date, toPatch(value));
      router.back();
    } catch (cause) {
      setSaving(false);
      Alert.alert('Could not save', cause instanceof Error ? cause.message : String(cause));
    }
  }

  function confirmDelete(): void {
    Alert.alert(`Delete this ${label.toLowerCase()} entry?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void clearDailyMetricField(date, field)
            .then(() => router.back())
            .catch((cause: unknown) =>
              Alert.alert(
                'Could not delete',
                cause instanceof Error ? cause.message : String(cause),
              ),
            );
        },
      },
    ]);
  }

  return (
    <FormScreen
      footer={
        <>
          <Button
            label={
              existing === null ? `Save ${label.toLowerCase()}` : `Update ${label.toLowerCase()}`
            }
            onPress={() => void save()}
            disabled={value === null}
            loading={saving}
          />
          {existing === null ? null : (
            <Button label="Delete entry" variant="secondary" onPress={confirmDelete} />
          )}
        </>
      }>
      <Field label="Date">
        <DateField value={date} onChange={setDate} />
      </Field>

      <Field label={`${label} (${unitLabel})`} error={error} hint={hint}>
        <NumberField
          decimal={decimal}
          value={raw}
          onChangeText={setRaw}
          placeholder={decimal ? '0.0' : '0'}
          invalid={error !== undefined}
          autoFocus
          maxLength={decimal ? 6 : 7}
          accessibilityLabel={`${label} in ${unitLabel}`}
        />
      </Field>

      {existing === null ? null : (
        <Text variant="caption" color="muted">
          Already logged for this date. Saving replaces it and leaves the day&apos;s other entries
          untouched.
        </Text>
      )}
    </FormScreen>
  );
}
