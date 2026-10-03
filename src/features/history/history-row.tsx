import { useRouter, type Href } from 'expo-router';
import { Alert } from 'react-native';

import { ListRow, type IconName } from '@/components';
import { deleteWorkout } from '@/db/queries/gym';
import { deleteRun } from '@/db/queries/runs';
import { clearDailyMetricField } from '@/db/queries/metrics';
import { deleteSleep } from '@/db/queries/sleep';
import type { HistoryEntry } from '@/db/queries/history';
import type { Settings } from '@/db/queries/settings';
import type { ColorToken } from '@/theme';

import { historyEntryTitle, summarizeHistoryEntry } from './summarize';

/** Icon, accent colour and edit route for each kind, in one place. */
function presentation(entry: HistoryEntry): { icon: IconName; color: ColorToken; href: Href } {
  switch (entry.kind) {
    case 'gym':
      // A read-only view rather than the editor: reading back what you lifted should not
      // look the same as changing it. Edit is a button inside that screen.
      return {
        icon: 'gym',
        color: 'gym',
        href: `/workout/${entry.workout.workoutId}`,
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
    <ListRow
      // The kind of entry leads, then what it was: scanning History is scanning for
      // "when did I last run", not for the distance.
      kicker={title}
      title={summarizeHistoryEntry(entry, settings)}
      icon={icon}
      tint={color}
      edge
      accessibilityLabel={`${title}. ${summarizeHistoryEntry(entry, settings)}`}
      accessibilityHint="Tap to edit. Long press to delete."
      onPress={() => router.push(href)}
      onLongPress={confirmDelete}
    />
  );
}
