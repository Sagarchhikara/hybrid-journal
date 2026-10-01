import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Chip, DateField, Field, FormScreen, NumberField, Text } from '@/components';
import { deleteSleep, getSleepForDate, upsertSleep } from '@/db';
import { todayLocal, type DateKey } from '@/lib/dates';
import { formatHoursMinutes } from '@/lib/duration';
import { useTheme } from '@/theme';

import {
  SLEEP_QUICK_PICKS,
  sleepDraftFromMinutes,
  validateSleep,
  type SleepDraft,
} from './validate';

const BLANK: SleepDraft = { hours: '', minutes: '' };

export interface SleepFormProps {
  /** Which wake-up date to edit. Defaults to today. */
  date?: DateKey;
}

/**
 * `date` is the WAKE-UP date: last night is logged under today. One entry per date, so
 * opening the form for a date that already has one is editing it, and saving upserts.
 */
export function SleepForm({ date: initialDate }: SleepFormProps) {
  const router = useRouter();
  const { spacing } = useTheme();

  const [date, setDate] = useState<DateKey>(initialDate ?? todayLocal());
  const [draft, setDraft] = useState<SleepDraft>(BLANK);
  const [existing, setExisting] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-runs whenever the date changes, so stepping to another day shows that day's entry.
  useEffect(() => {
    let active = true;

    getSleepForDate(date)
      .then((entry) => {
        if (!active) return;
        setExisting(entry?.durationMin ?? null);
        setDraft(entry ? sleepDraftFromMinutes(entry.durationMin) : BLANK);
      })
      .catch(() => {
        if (active) setExisting(null);
      });

    return () => {
      active = false;
    };
  }, [date]);

  const { error, durationMin, partialMin } = validateSleep(draft);

  async function save(): Promise<void> {
    if (durationMin === null) return;
    setSaving(true);
    try {
      await upsertSleep(date, durationMin);
      router.back();
    } catch (cause) {
      setSaving(false);
      Alert.alert('Could not save', cause instanceof Error ? cause.message : String(cause));
    }
  }

  function confirmDelete(): void {
    Alert.alert('Delete this sleep entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteSleep(date)
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
            label={existing === null ? 'Save sleep' : 'Update sleep'}
            onPress={() => void save()}
            disabled={durationMin === null}
            loading={saving}
          />
          {existing === null ? null : (
            <Button label="Delete entry" variant="secondary" onPress={confirmDelete} />
          )}
        </>
      }>
      <Field label="Woke up on" hint="Last night's sleep belongs to the day you woke up — today.">
        <DateField value={date} onChange={setDate} />
      </Field>

      <Field label="Quick pick">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {SLEEP_QUICK_PICKS.map((minutes) => (
            <Chip
              key={minutes}
              label={formatQuickPick(minutes)}
              tint="sleep"
              selected={partialMin === minutes}
              onPress={() => setDraft(sleepDraftFromMinutes(minutes))}
            />
          ))}
        </View>
      </Field>

      <Field label="Time asleep" error={error}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
          <Part
            label="hr"
            value={draft.hours}
            onChangeText={(hours) => setDraft((current) => ({ ...current, hours }))}
            invalid={error !== undefined}
          />
          <Part
            label="min"
            value={draft.minutes}
            onChangeText={(minutes) => setDraft((current) => ({ ...current, minutes }))}
            invalid={error !== undefined}
          />
        </View>
      </Field>

      <Text variant="title" color={partialMin > 0 ? 'sleep' : 'muted'}>
        {partialMin > 0 ? formatHoursMinutes(partialMin) : '—'}
      </Text>

      {existing === null ? null : (
        <Text variant="caption" color="muted">
          Already logged for this date: {formatHoursMinutes(existing)}. Saving replaces it.
        </Text>
      )}
    </FormScreen>
  );
}

/** '6h' and '6h 30' read faster than '360 min' when you are half awake. */
function formatQuickPick(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}`;
}

function Part({
  label,
  value,
  onChangeText,
  invalid,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  invalid: boolean;
}) {
  const { spacing } = useTheme();

  return (
    <View style={{ flex: 1, gap: spacing.xs }}>
      <NumberField
        value={value}
        onChangeText={(next) => onChangeText(next.replace(/\D/g, '').slice(0, 2))}
        placeholder="00"
        align="center"
        invalid={invalid}
        maxLength={2}
        accessibilityLabel={label}
      />
      <Text variant="caption" color="muted" style={{ textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}
