import { useRouter, type Href } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { Icon, Text, type IconName } from '@/components';
import { deleteWorkout } from '@/db/queries/gym';
import { deleteRun } from '@/db/queries/runs';
import { clearDailyMetricField } from '@/db/queries/metrics';
import { deleteSleep } from '@/db/queries/sleep';
import type { HistoryEntry } from '@/db/queries/history';
import type { Settings } from '@/db/queries/settings';
import { useTheme, type ColorToken } from '@/theme';

import { historyEntryTitle, summarizeHistoryEntry } from './summarize';

/** Icon, accent colour and edit route for each kind, in one place. */
function presentation(entry: HistoryEntry): { icon: IconName; color: ColorToken; href: Href } {
  switch (entry.kind) {
    case 'gym':
      return {
        icon: 'gym',
        color: 'gym',
        href: `/log/gym/session?workoutId=${entry.workout.workoutId}`,
      };
    case 'run':
      return { icon: 'run', color: 'run', href: `/log/run?runId=${entry.run.id}` };
    case 'sleep':
      return { icon: 'sleep', color: 'sleep', href: `/log/sleep?date=${entry.date}` };
    case 'steps':
      return { icon: 'steps', color: 'muted', href: `/log/steps?date=${entry.date}` };
    case 'weight':
      return { icon: 'weight', color: 'muted', href: `/log/weight?date=${entry.date}` };
  }
}

function remove(entry: HistoryEntry): Promise<void> {
  switch (entry.kind) {
    case 'gym':
      return deleteWorkout(entry.workout.workoutId);
    case 'run':
      return deleteRun(entry.run.id);
    case 'sleep':
      return deleteSleep(entry.date);
    case 'steps':
      return clearDailyMetricField(entry.date, 'steps');
    case 'weight':
      return clearDailyMetricField(entry.date, 'weightKg');
  }
}

export interface HistoryRowProps {
  entry: HistoryEntry;
  settings: Settings;
}

export function HistoryRow({ entry, settings }: HistoryRowProps) {
  const { colors, radii, spacing } = useTheme();
  const router = useRouter();
  const { icon, color, href } = presentation(entry);
  const title = historyEntryTitle(entry);

  function confirmDelete(): void {
    Alert.alert(`Delete this ${title.toLowerCase()} entry?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void remove(entry).catch((cause: unknown) =>
            Alert.alert('Could not delete', cause instanceof Error ? cause.message : String(cause)),
          );
        },
      },
    ]);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${summarizeHistoryEntry(entry, settings)}`}
      accessibilityHint="Tap to edit. Long press to delete."
      onPress={() => router.push(href)}
      onLongPress={confirmDelete}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
        backgroundColor: pressed ? colors.surfaceRaised : colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderLeftColor: colors[color],
        borderLeftWidth: 3,
        borderRadius: radii.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        minHeight: 60,
      })}>
      <Icon name={icon} size={22} color={color} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label" color="muted">
          {title}
        </Text>
        <Text variant="body">{summarizeHistoryEntry(entry, settings)}</Text>
      </View>
      <Icon name="chevron" size={16} color="muted" />
    </Pressable>
  );
}
