import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  Button,
  DateField,
  Field,
  FormScreen,
  NumberField,
  SegmentedControl,
  Text,
  TextField,
} from '@/components';
import { createRun, deleteRun, getRun, updateRun, useSettings } from '@/db';
import type { RunType } from '@/db/schema';
import { todayLocal, type DateKey } from '@/lib/dates';
import { formatDuration, secondsToHms } from '@/lib/duration';
import { formatPace } from '@/lib/pace';
import { fromStoredDistanceKm } from '@/lib/units';
import { useTheme } from '@/theme';

import { DurationInput } from './duration-input';
import { RUN_TYPE_OPTIONS } from './run-type-options';
import { validateRun, type RunDraft } from './validate';

const BLANK: RunDraft = { distance: '', hours: '', minutes: '', seconds: '' };

export interface RunFormProps {
  /** Omitted when logging a new run; present when editing an existing one. */
  runId?: number;
}

export function RunForm({ runId }: RunFormProps) {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { settings, loading: settingsLoading } = useSettings();

  const [date, setDate] = useState<DateKey>(todayLocal());
  const [draft, setDraft] = useState<RunDraft>(BLANK);
  const [type, setType] = useState<RunType>('easy');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(runId === undefined);

  const prefilledFor = useRef<number | null>(null);

  /**
   * Prefill when editing, exactly once per run, and only after settings have loaded so
   * the distance is written in the unit the user actually reads in. Without the ref the
   * effect would re-run when settings resolve and overwrite anything already typed.
   */
  useEffect(() => {
    if (runId === undefined || settingsLoading || prefilledFor.current === runId) return;
    prefilledFor.current = runId;
    let active = true;

    getRun(runId)
      .then((run) => {
        if (!active || !run) return;
        const { hours, minutes, seconds } = secondsToHms(run.durationSec);
        setDate(run.date);
        setType(run.type);
        setNotes(run.notes ?? '');
        setDraft({
          distance: String(
            Number(fromStoredDistanceKm(run.distanceKm, settings.distanceUnit).toFixed(2)),
          ),
          hours: hours > 0 ? String(hours) : '',
          minutes: String(minutes),
          seconds: String(seconds).padStart(2, '0'),
        });
      })
      .finally(() => {
        if (active) setLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [runId, settingsLoading, settings.distanceUnit]);

  const { errors, value, partial } = validateRun(draft, settings.distanceUnit);
  const pace =
    partial.distanceKm === null
      ? null
      : formatPace(partial.distanceKm, partial.durationSec, settings.distanceUnit);

  function update(part: keyof RunDraft, next: string): void {
    setDraft((current) => ({ ...current, [part]: next }));
  }

  async function save(): Promise<void> {
    if (!value) return;
    setSaving(true);
    try {
      const input = {
        date,
        distanceKm: value.distanceKm,
        durationSec: value.durationSec,
        type,
        notes: notes.trim() === '' ? null : notes.trim(),
      };

      if (runId === undefined) await createRun(input);
      else await updateRun(runId, input);

      router.back();
    } catch (cause) {
      setSaving(false);
      Alert.alert('Could not save', cause instanceof Error ? cause.message : String(cause));
    }
  }

  function confirmDelete(): void {
    if (runId === undefined) return;
    Alert.alert('Delete this run?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteRun(runId)
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

  if (!loaded) {
    return (
      <FormScreen>
        <Text color="muted">Loading…</Text>
      </FormScreen>
    );
  }

  return (
    <FormScreen
      footer={
        <>
          <Button
            label={runId === undefined ? 'Save run' : 'Update run'}
            onPress={() => void save()}
            disabled={value === null}
            loading={saving}
          />
          {runId === undefined ? null : (
            <Button label="Delete run" variant="secondary" onPress={confirmDelete} />
          )}
        </>
      }>
      <Field label="Date">
        <DateField value={date} onChange={setDate} />
      </Field>

      <Field label={`Distance (${settings.distanceUnit})`} error={errors.distance}>
        <NumberField
          decimal
          value={draft.distance}
          onChangeText={(next) => update('distance', next)}
          placeholder="0.00"
          invalid={errors.distance !== undefined}
          autoFocus={runId === undefined}
          maxLength={6}
          accessibilityLabel={`Distance in ${settings.distanceUnit}`}
        />
      </Field>

      <Field label="Duration" error={errors.duration}>
        <DurationInput
          hours={draft.hours}
          minutes={draft.minutes}
          seconds={draft.seconds}
          onChange={update}
          invalid={errors.duration !== undefined}
        />
      </Field>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          backgroundColor: colors.surface,
          borderRadius: spacing.md,
          padding: spacing.lg,
        }}>
        <Labelled label="Pace" value={pace ?? '—'} />
        <Labelled
          label="Time"
          value={partial.durationSec > 0 ? formatDuration(partial.durationSec) : '—'}
        />
      </View>

      <Field label="Type">
        <SegmentedControl options={RUN_TYPE_OPTIONS} value={type} onChange={setType} />
      </Field>

      <Field label="Notes" hint="Optional">
        <TextField
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="How did it feel?"
          maxLength={500}
        />
      </Field>
    </FormScreen>
  );
}

function Labelled({ label, value }: { label: string; value: string }) {
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.xxs }}>
      <Text variant="caption" color="muted">
        {label.toUpperCase()}
      </Text>
      <Text variant="title">{value}</Text>
    </View>
  );
}
