import { View } from 'react-native';

import { Card, Text } from '@/components';
import { getWeekSummary, useDbQuery, useSettings } from '@/db';
import { formatDateKeyShort } from '@/lib/dates';
import { formatHoursMinutes } from '@/lib/duration';
import { formatDistanceCompact } from '@/lib/units';
import { useTheme, type ColorToken } from '@/theme';

/** Nothing logged reads as a dash, not a zero — they are different facts. */
const DASH = '—';

export function WeekCard() {
  const { spacing } = useTheme();
  const { settings } = useSettings();
  const { data, loading } = useDbQuery(getWeekSummary, []);

  const runDistance =
    data?.totalRunKm === null || data?.totalRunKm === undefined
      ? DASH
      : formatDistanceCompact(data.totalRunKm, settings.distanceUnit);

  const runCount = data === undefined ? DASH : String(data.runCount);

  const sleep =
    data?.averageSleepMin === null || data?.averageSleepMin === undefined
      ? DASH
      : formatHoursMinutes(data.averageSleepMin);

  return (
    <Card>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="heading">This week</Text>
        {data ? (
          <Text variant="caption" color="muted">
            {formatDateKeyShort(data.range.start)} – {formatDateKeyShort(data.range.end)}
          </Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md }}>
        <Stat label="Run" value={loading && data === undefined ? DASH : runDistance} tint="run" />
        <Stat label="Runs" value={loading && data === undefined ? DASH : runCount} tint="run" />
        <Stat label="Avg sleep" value={loading && data === undefined ? DASH : sleep} tint="sleep" />
      </View>

      {data && data.sleepDaysLogged > 0 ? (
        <Text variant="caption" color="muted" style={{ marginTop: spacing.sm }}>
          Sleep averaged over {data.sleepDaysLogged}{' '}
          {data.sleepDaysLogged === 1 ? 'night' : 'nights'} logged.
        </Text>
      ) : null}
    </Card>
  );
}

function Stat({ label, value, tint }: { label: string; value: string; tint: ColorToken }) {
  const isEmpty = value === DASH;

  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="title" color={isEmpty ? 'muted' : tint} numberOfLines={1}>
        {value}
      </Text>
      <Text variant="caption" color="muted">
        {label.toUpperCase()}
      </Text>
    </View>
  );
}
