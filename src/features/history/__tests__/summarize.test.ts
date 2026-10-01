import { describe, expect, it } from 'vitest';

import type { HistoryEntry } from '@/db/queries/history';
import type { Settings } from '@/db/queries/settings';
import type { Run } from '@/db/schema';

import { historyEntryTitle, summarizeHistoryEntry } from '../summarize';

const METRIC: Settings = { weightUnit: 'kg', distanceUnit: 'km' };
const IMPERIAL: Settings = { weightUnit: 'lb', distanceUnit: 'mi' };

function run(overrides: Partial<Run> = {}): HistoryEntry {
  const value: Run = {
    id: 1,
    date: '2026-10-01',
    distanceKm: 6.2,
    durationSec: 2661,
    type: 'easy',
    notes: null,
    createdAt: new Date(0),
    ...overrides,
  };
  return { kind: 'run', id: 'run-1', date: value.date, loggedAt: 0, run: value };
}

describe('summarizeHistoryEntry for runs', () => {
  it('matches the format from the spec', () => {
    expect(summarizeHistoryEntry(run(), METRIC)).toBe('6.2 km · 44:21 · 7:09/km · Easy');
  });

  it('drops trailing zeros from the distance', () => {
    expect(summarizeHistoryEntry(run({ distanceKm: 10 }), METRIC)).toContain('10 km');
    expect(summarizeHistoryEntry(run({ distanceKm: 21.1 }), METRIC)).toContain('21.1 km');
  });

  it('renders in the chosen units', () => {
    expect(summarizeHistoryEntry(run(), IMPERIAL)).toBe('3.85 mi · 44:21 · 11:31/mi · Easy');
  });

  it('shows hours for a long run', () => {
    expect(
      summarizeHistoryEntry(run({ distanceKm: 21.1, durationSec: 7265, type: 'long' }), METRIC),
    ).toBe('21.1 km · 2:01:05 · 5:44/km · Long');
  });

  it('labels every run type', () => {
    const labels = (['easy', 'long', 'tempo', 'interval', 'race'] as const).map((type) =>
      summarizeHistoryEntry(run({ type }), METRIC).split(' · ').at(-1),
    );
    expect(labels).toEqual(['Easy', 'Long', 'Tempo', 'Interval', 'Race']);
  });

  it('omits pace rather than printing a dash when distance is zero', () => {
    const summary = summarizeHistoryEntry(run({ distanceKm: 0 }), METRIC);
    expect(summary).toBe('0 km · 44:21 · Easy');
    expect(summary).not.toContain('/km');
  });
});

describe('summarizeHistoryEntry for the other kinds', () => {
  it('formats sleep', () => {
    const entry: HistoryEntry = {
      kind: 'sleep',
      id: 'sleep-2026-10-01',
      date: '2026-10-01',
      loggedAt: 0,
      durationMin: 462,
    };
    expect(summarizeHistoryEntry(entry, METRIC)).toBe('7h 42m');
  });

  it('formats steps with a thousands separator', () => {
    const entry: HistoryEntry = {
      kind: 'steps',
      id: 'steps-2026-10-01',
      date: '2026-10-01',
      loggedAt: 0,
      steps: 9412,
    };
    expect(summarizeHistoryEntry(entry, METRIC)).toBe('9,412 steps');
  });

  it('formats weight in the chosen unit', () => {
    const entry: HistoryEntry = {
      kind: 'weight',
      id: 'weight-2026-10-01',
      date: '2026-10-01',
      loggedAt: 0,
      weightKg: 72.4,
    };
    expect(summarizeHistoryEntry(entry, METRIC)).toBe('Weight 72.4 kg');
    expect(summarizeHistoryEntry(entry, IMPERIAL)).toBe('Weight 159.6 lb');
  });
});

describe('historyEntryTitle', () => {
  it('names each kind', () => {
    expect(historyEntryTitle(run())).toBe('Run');
  });
});
