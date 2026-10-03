import { View } from 'react-native';

import { Card, ProgressRing, Stat, StatRow, Text } from '@/components';
import { getWeekSummary, useDbQuery, useSettings } from '@/db';
import { formatDateKeyShort } from '@/lib/dates';
import { formatHoursMinutes } from '@/lib/duration';
import { formatDistanceCompact } from '@/lib/units';
import { useTheme } from '@/theme';

/** Nothing logged reads as a dash, not a zero — they are different facts. */
const DASH = '—';

/** The denominator on the sleep ring: a week has seven nights in it. */
const NIGHTS_IN_WEEK = 7;

export function WeekCard() {
  const { colors, spacing, borderWidths } = useTheme();
  const { settings } = useSettings();
  const { data, loading } = useDbQuery(getWeekSummary, []);

  const pending = loading && data === undefined;

  const runDistance =
    data?.totalRunKm === null || data?.totalRunKm === undefined
      ? DASH
      : formatDistanceCompact(data.totalRunKm, settings.distanceUnit);

  const runCount = data === undefined ? DASH : String(data.runCount);

  const sleep =
    data?.averageSleepMin === null || data?.averageSleepMin === undefined
      ? DASH
      : formatHoursMinutes(data.averageSleepMin);

  const nights = data?.sleepDaysLogged ?? 0;

  return (
    <Card style={{ gap: spacing.lg }}>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="heading">This week</Text>
        {data ? (
          <Text variant="caption" color="muted">
            {formatDateKeyShort(data.range.start)} – {formatDateKeyShort(data.range.end)}
          </Text>
        ) : null}
      </View>

      <StatRow>
        <Stat
          label="Run"
          value={pending ? DASH : runDistance}
          tint="run"
          muted={pending || runDistance === DASH}
        />
        <Stat
          label="Runs"
          value={pending ? DASH : runCount}
          tint="run"
          muted={pending || runCount === DASH}
        />
        <Stat
          label="Avg sleep"
          value={pending ? DASH : sleep}
          tint="sleep"
          muted={pending || sleep === DASH}
        />
      </StatRow>

      <View style={{ height: borderWidths.hairline, backgroundColor: colors.divider }} />

      {/* The only ring on the card. Nights logged out of seven is a fraction the week
          itself supplies; the totals above have no denominator, so they stay numbers. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <ProgressRing
          value={nights}
          max={NIGHTS_IN_WEEK}
          tint="sleep"
          caption="nights"
          accessibilityLabel={`Sleep logged on ${nights} of ${NIGHTS_IN_WEEK} nights this week`}
        />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="heading">Sleep logged</Text>
          <Text variant="caption" color="muted">
            {nights === 0
              ? 'No nights logged yet this week.'
              : `${nights} of ${NIGHTS_IN_WEEK} nights. The average above covers those ${nights === 1 ? 'night' : 'nights'} only.`}
          </Text>
        </View>
      </View>
    </Card>
  );
}
