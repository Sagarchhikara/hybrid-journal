import { describe, expect, it } from 'vitest';

import { formatSet, formatSetList } from '@/features/gym/format-sets';

describe('formatSet reads a stored weight against the exercise', () => {
  it('shows a weighted set in kg', () => {
    expect(formatSet({ weightKg: 80, reps: 5 }, false, 'kg')).toBe('80 kg × 5');
  });

  it('converts to lb when that is the preference', () => {
    // 80 kg is 176.37 lb, which roundDisplayWeight takes to one decimal.
    expect(formatSet({ weightKg: 80, reps: 5 }, false, 'lb')).toBe('176.4 lb × 5');
  });

  it('keeps a half-plate weight exact in kg', () => {
    expect(formatSet({ weightKg: 72.5, reps: 8 }, false, 'kg')).toBe('72.5 kg × 8');
  });

  it('reads null on a bodyweight lift as plain bodyweight', () => {
    expect(formatSet({ weightKg: null, reps: 10 }, true, 'kg')).toBe('BW × 10');
  });

  it('reads a weight on a bodyweight lift as added load', () => {
    expect(formatSet({ weightKg: 10, reps: 8 }, true, 'kg')).toBe('BW +10 kg × 8');
    expect(formatSet({ weightKg: 10, reps: 8 }, true, 'lb')).toBe('BW +22 lb × 8');
  });

  it('shows reps alone for a null weight on a weighted lift', () => {
    // Not reachable through the editor, which rejects it, but history may hold one.
    expect(formatSet({ weightKg: null, reps: 6 }, false, 'kg')).toBe('× 6');
  });
});

describe('formatSetList', () => {
  it('joins sets and states the unit once, at the end', () => {
    const sets = [
      { weightKg: 72.5, reps: 6 },
      { weightKg: 70, reps: 8 },
      { weightKg: 70, reps: 8 },
    ];

    expect(formatSetList(sets, false, 'kg')).toBe('72.5 × 6 / 70 × 8 / 70 × 8');
  });

  it('marks bodyweight sets and added load', () => {
    const sets = [
      { weightKg: null, reps: 10 },
      { weightKg: 10, reps: 8 },
    ];

    expect(formatSetList(sets, true, 'kg')).toBe('BW × 10 / BW+10 × 8');
  });

  it('is empty for no sets', () => {
    expect(formatSetList([], false, 'kg')).toBe('');
  });
});
