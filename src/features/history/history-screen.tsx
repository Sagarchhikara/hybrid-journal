import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, EmptyState, Text } from '@/components';
import { useSettings } from '@/db';
import { groupByDate, type HistoryEntry, type HistoryFilter } from '@/db/queries/history';
import { formatDateKeyLong, shiftDateKey, todayLocal } from '@/lib/dates';
import { useTheme } from '@/theme';

import { HistoryRow } from './history-row';
import { useHistory } from './use-history';

const FILTER_LABELS: readonly { value: HistoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'runs', label: 'Runs' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'body', label: 'Body' },
];

/** A date header, or one entry. FlatList wants a flat array, so sections are inlined. */
type Row = { type: 'header'; date: string } | { type: 'entry'; entry: HistoryEntry };

export function HistoryScreen() {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const { settings } = useSettings();
  const { entries, loading, hasMore, loadMore, error } = useHistory(filter);

  const rows = useMemo<Row[]>(
    () =>
      groupByDate(entries).flatMap((group): Row[] => [
        { type: 'header', date: group.date },
        ...group.entries.map((entry): Row => ({ type: 'entry', entry })),
      ]),
    [entries],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.lg }}>
        <Text variant="display">History</Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.lg,
        }}>
        {FILTER_LABELS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            selected={filter === option.value}
            onPress={() => setFilter(option.value)}
          />
        ))}
      </View>

      <FlatList
        data={rows}
        keyExtractor={(row) => (row.type === 'header' ? `h-${row.date}` : row.entry.id)}
        renderItem={({ item }) =>
          item.type === 'header' ? (
            <DateHeader date={item.date} />
          ) : (
            <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
              <HistoryRow entry={item.entry} settings={settings} />
            </View>
          )
        }
        onEndReached={() => {
          if (hasMore && !loading) loadMore();
        }}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing.xxl * 4,
          flexGrow: rows.length === 0 ? 1 : undefined,
        }}
        ListEmptyComponent={
          loading ? null : error ? <ErrorState message={error.message} /> : <HistoryEmptyState />
        }
        ListFooterComponent={
          loading || hasMore ? (
            <ActivityIndicator color={colors.muted} style={{ marginTop: spacing.lg }} />
          ) : null
        }
      />
    </View>
  );
}

function DateHeader({ date }: { date: string }) {
  const { colors, spacing } = useTheme();
  const today = todayLocal();
  const label =
    date === today
      ? 'Today'
      : date === shiftDateKey(today, -1)
        ? 'Yesterday'
        : formatDateKeyLong(date);

  return (
    <View
      style={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.sm,
        backgroundColor: colors.background,
      }}>
      <Text variant="label" color="muted">
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function HistoryEmptyState() {
  const router = useRouter();

  return (
    <EmptyState
      fill
      icon="history"
      title="Nothing logged yet"
      body="Workouts, runs, sleep and body measurements will show up here, newest first."
      action={<Button label="Log something" onPress={() => router.push('/log')} />}
    />
  );
}

function ErrorState({ message }: { message: string }) {
  const { spacing } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.xxl,
        gap: spacing.sm,
      }}>
      <Text variant="title">Could not load your history</Text>
      <Text color="muted">{message}</Text>
    </View>
  );
}
