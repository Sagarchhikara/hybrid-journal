import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createRun, deleteRun, getRun, getRunsForDate, updateRun } from '@/db/queries/runs';

import { applyMigrations, resetTables } from './support/test-db';

beforeAll(applyMigrations);
beforeEach(resetTables);

const INPUT = {
  date: '2026-10-01',
  distanceKm: 6.2,
  durationSec: 2661,
  type: 'easy' as const,
  notes: null,
};

describe('run CRUD', () => {
  it('creates and reads back exactly what was stored', async () => {
    const id = await createRun(INPUT);
    const run = await getRun(id);

    expect(run?.date).toBe('2026-10-01');
    expect(run?.distanceKm).toBeCloseTo(6.2, 10);
    expect(run?.durationSec).toBe(2661);
    expect(run?.type).toBe('easy');
    expect(run?.notes).toBeNull();
  });

  it('stores no pace column — pace is always derived', async () => {
    const id = await createRun(INPUT);
    const run = await getRun(id);
    expect(run).toBeDefined();
    expect(Object.keys(run!)).toEqual([
      'id',
      'date',
      'distanceKm',
      'durationSec',
      'type',
      'notes',
      'createdAt',
    ]);
  });

  it('updates every editable field, including moving the run to another date', async () => {
    const id = await createRun(INPUT);
    await updateRun(id, {
      date: '2026-09-15',
      distanceKm: 21.1,
      durationSec: 7200,
      type: 'long',
      notes: 'felt good',
    });

    const run = await getRun(id);
    expect(run?.date).toBe('2026-09-15');
    expect(run?.distanceKm).toBeCloseTo(21.1, 10);
    expect(run?.durationSec).toBe(7200);
    expect(run?.type).toBe('long');
    expect(run?.notes).toBe('felt good');
  });

  it('can clear notes back to null', async () => {
    const id = await createRun({ ...INPUT, notes: 'windy' });
    await updateRun(id, { ...INPUT, notes: null });
    expect((await getRun(id))?.notes).toBeNull();
  });

  it('deletes only the targeted run', async () => {
    const keep = await createRun(INPUT);
    const drop = await createRun({ ...INPUT, date: '2026-10-02' });

    await deleteRun(drop);

    expect(await getRun(drop)).toBeUndefined();
    expect(await getRun(keep)).toBeDefined();
  });

  it('returns undefined for a missing id rather than throwing', async () => {
    expect(await getRun(9999)).toBeUndefined();
  });

  it('lists several runs logged on the same date', async () => {
    await createRun(INPUT);
    await createRun({ ...INPUT, distanceKm: 3 });
    expect(await getRunsForDate('2026-10-01')).toHaveLength(2);
    expect(await getRunsForDate('2026-10-02')).toHaveLength(0);
  });

  it('accepts every run type', async () => {
    for (const type of ['easy', 'long', 'tempo', 'interval', 'race'] as const) {
      const id = await createRun({ ...INPUT, type });
      expect((await getRun(id))?.type).toBe(type);
    }
  });
});
