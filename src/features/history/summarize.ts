import type { HistoryEntry } from '@/db/queries/history';
import type { Settings } from '@/db/queries/settings';
import type { RunType } from '@/db/schema';
import { RUN_TYPE_OPTIONS } from '@/features/runs/run-type-options';
import { formatDuration, formatHoursMinutes } from '@/lib/duration';
import { formatPace } from '@/lib/pace';
import { formatDistanceCompact, formatSteps, formatWeight } from '@/lib/units';

/**
 * The one-line summary shown in a history row. Pure string building, kept out of the
 * row component so the exact wording is testable without rendering anything.
 */
export function summarizeHistoryEntry(entry: HistoryEntry, settings: Settings): string {
  switch (entry.kind) {
    case 'run': {
      const { distanceKm, durationSec, type } = entry.run;
      const parts = [
        formatDistanceCompact(distanceKm, settings.distanceUnit),
        formatDuration(durationSec),
      ];
      const pace = formatPace(distanceKm, durationSec, settings.distanceUnit);
      if (pace !== null) parts.push(pace);
      parts.push(runTypeLabel(type));
      return parts.join(' · ');
    }
    case 'sleep':
      return formatHoursMinutes(entry.durationMin);
    case 'steps':
      return `${formatSteps(entry.steps)} steps`;
    case 'weight':
      return `Weight ${formatWeight(entry.weightKg, settings.weightUnit)}`;
  }
}

export function historyEntryTitle(entry: HistoryEntry): string {
  switch (entry.kind) {
    case 'run':
      return 'Run';
    case 'sleep':
      return 'Sleep';
    case 'steps':
      return 'Steps';
    case 'weight':
      return 'Weight';
  }
}

function runTypeLabel(type: RunType): string {
  return RUN_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}
