import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'hybrid-journal.db';

/**
 * `enableChangeListener` is what makes `useLiveQuery` re-run on writes.
 * Without it, queries would be read-once snapshots.
 */
export const sqliteDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });

// SQLite defaults foreign keys OFF per connection; our ON DELETE CASCADE rules need it ON.
sqliteDb.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqliteDb, { schema });

export type Db = typeof db;
export { schema };
