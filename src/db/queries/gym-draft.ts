import { eq } from 'drizzle-orm';

import { deserializeDraft, serializeDraft } from '@/features/gym/draft-serialize';
import type { WorkoutDraft } from '@/features/gym/draft';

import { db } from '../client';
import { bumpDataVersion } from '../data-version';
import { appSettings } from '../schema';

export const GYM_DRAFT_KEY = 'gym_draft';

/**
 * Reads the in-progress workout. A draft lives in app_settings rather than in
 * gym_workouts so an unfinished session can never appear in History, Home or any
 * rollup — only Finish writes real rows.
 *
 * Unparseable JSON is discarded rather than thrown, and the bad row is deleted so a
 * single corrupt write cannot wedge every subsequent launch.
 */
export async function readGymDraft(): Promise<WorkoutDraft | null> {
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, GYM_DRAFT_KEY))
    .limit(1);

  if (!row) return null;

  const draft = deserializeDraft(row.value);
  if (draft === null) {
    await clearGymDraft();
    return null;
  }
  return draft;
}

export interface WriteGymDraftOptions {
  /**
   * Skip the data-version bump. Used by the logging screen's autosave, which fires every
   * few hundred milliseconds while sets are being typed: bumping there would re-run every
   * read hook in the app on that cadence, and any screen that renders a spinner while its
   * query is in flight would flicker. Nothing but the start screen's "workout in
   * progress" card reads the draft, and that refetches when it regains focus.
   */
  silent?: boolean;
}

export async function writeGymDraft(
  draft: WorkoutDraft,
  options: WriteGymDraftOptions = {},
): Promise<void> {
  const value = serializeDraft(draft);
  await db
    .insert(appSettings)
    .values({ key: GYM_DRAFT_KEY, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });
  if (!options.silent) bumpDataVersion();
}

export async function clearGymDraft(): Promise<void> {
  await db.delete(appSettings).where(eq(appSettings.key, GYM_DRAFT_KEY));
  bumpDataVersion();
}

export async function hasGymDraft(): Promise<boolean> {
  return (await readGymDraft()) !== null;
}
