ALTER TABLE `exercises` ADD `is_bodyweight` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `workout_exercises_exercise_idx` ON `workout_exercises` (`exercise_id`,`workout_id`);--> statement-breakpoint
-- Data backfill, appended by hand to this freshly generated migration (drizzle-kit does
-- not generate DML). Flags the bodyweight movements in the starter library so installs
-- created before this migration read the same as a fresh seed. The `name` column is
-- NOCASE, so these match whatever case the rows were written in. Renamed or
-- user-created exercises are untouched and keep the column default of false.
UPDATE `exercises` SET `is_bodyweight` = true
WHERE `name` IN ('Push-Up', 'Pull-Up', 'Dip', 'Plank', 'Hanging Leg Raise');
