import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDraft, type WorkoutDraft } from '../draft';
import { createDraftWriter } from '../draft-writer';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function draft(name: string): WorkoutDraft {
  return createDraft({ date: '2026-10-01', name });
}

describe('debouncing', () => {
  it('writes once after the delay, not once per change', async () => {
    const write = vi.fn(async (_draft: WorkoutDraft) => undefined);
    const writer = createDraftWriter({ write, delayMs: 500 });

    writer.schedule(draft('a'));
    writer.schedule(draft('b'));
    writer.schedule(draft('c'));
    expect(write).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0]![0]).toMatchObject({ name: 'c' });
  });

  it('does not write before the delay elapses', async () => {
    const write = vi.fn(async (_draft: WorkoutDraft) => undefined);
    const writer = createDraftWriter({ write, delayMs: 500 });

    writer.schedule(draft('a'));
    await vi.advanceTimersByTimeAsync(499);
    expect(write).not.toHaveBeenCalled();
  });

  it('flush writes the pending draft immediately, for backgrounding', async () => {
    const write = vi.fn(async (_draft: WorkoutDraft) => undefined);
    const writer = createDraftWriter({ write, delayMs: 5000 });

    writer.schedule(draft('a'));
    await writer.flush();

    expect(write).toHaveBeenCalledTimes(1);
    expect(writer.hasPending()).toBe(false);
  });

  it('flush with nothing pending does nothing', async () => {
    const write = vi.fn(async (_draft: WorkoutDraft) => undefined);
    const writer = createDraftWriter({ write });
    await writer.flush();
    expect(write).not.toHaveBeenCalled();
  });

  it('does not write the same pending draft twice after a flush', async () => {
    const write = vi.fn(async (_draft: WorkoutDraft) => undefined);
    const writer = createDraftWriter({ write, delayMs: 500 });

    writer.schedule(draft('a'));
    await writer.flush();
    await vi.advanceTimersByTimeAsync(1000);

    expect(write).toHaveBeenCalledTimes(1);
  });
});

/**
 * The failure this prevents: Finish turns the draft into real rows and clears the stored
 * draft, then a timer that was already in flight writes it back, and the next launch
 * offers to resume a workout that has already been saved.
 */
describe('disable, so a finished workout cannot reappear as a draft', () => {
  it('cancels a pending write', async () => {
    const write = vi.fn(async (_draft: WorkoutDraft) => undefined);
    const writer = createDraftWriter({ write, delayMs: 500 });

    writer.schedule(draft('a'));
    writer.disable();
    await vi.advanceTimersByTimeAsync(5000);

    expect(write).not.toHaveBeenCalled();
    expect(writer.isDisabled()).toBe(true);
  });

  it('ignores every later schedule', async () => {
    const write = vi.fn(async (_draft: WorkoutDraft) => undefined);
    const writer = createDraftWriter({ write, delayMs: 500 });

    writer.disable();
    writer.schedule(draft('a'));
    writer.schedule(draft('b'));
    await vi.advanceTimersByTimeAsync(5000);

    expect(write).not.toHaveBeenCalled();
    expect(writer.hasPending()).toBe(false);
  });

  it('ignores a later flush, including one from a background transition', async () => {
    const write = vi.fn(async (_draft: WorkoutDraft) => undefined);
    const writer = createDraftWriter({ write, delayMs: 500 });

    writer.schedule(draft('a'));
    writer.disable();
    await writer.flush();

    expect(write).not.toHaveBeenCalled();
  });

  it('drops a write whose timer fired but which was disabled while the write awaited', async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const write = vi.fn(async (_draft: WorkoutDraft) => {
      await gate;
    });
    const writer = createDraftWriter({ write, delayMs: 100 });

    writer.schedule(draft('a'));
    await vi.advanceTimersByTimeAsync(100);
    expect(write).toHaveBeenCalledTimes(1);

    // A second change lands, then Finish disables before the timer fires.
    writer.schedule(draft('b'));
    writer.disable();
    release?.();
    await vi.advanceTimersByTimeAsync(5000);

    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0]![0]).toMatchObject({ name: 'a' });
  });

  it('can be re-armed after a failed save', async () => {
    const write = vi.fn(async (_draft: WorkoutDraft) => undefined);
    const writer = createDraftWriter({ write, delayMs: 500 });

    writer.disable();
    writer.enable();
    writer.schedule(draft('a'));
    await vi.advanceTimersByTimeAsync(500);

    expect(write).toHaveBeenCalledTimes(1);
    expect(writer.isDisabled()).toBe(false);
  });
});
