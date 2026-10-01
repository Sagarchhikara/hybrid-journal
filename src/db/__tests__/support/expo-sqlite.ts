/**
 * A stand-in for `expo-sqlite` backed by Node's built-in SQLite, aliased in place of
 * the real module by vitest.config.mts.
 *
 * The point is to run the *actual* query functions in src/db/queries against a real
 * SQLite engine, rather than re-implementing their SQL in a test and verifying the copy.
 * It implements only the surface Drizzle's expo-sqlite session touches:
 * `prepareSync`, `statement.executeSync(params)` -> { changes, lastInsertRowId,
 * getAllSync, getFirstSync }, and `executeForRawResultSync` for positional rows.
 */
import { DatabaseSync, type StatementSync } from 'node:sqlite';

type Param = null | number | string | bigint | Uint8Array;

function toParams(params: readonly unknown[]): Param[] {
  return params.map((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (
      typeof value === 'number' ||
      typeof value === 'string' ||
      typeof value === 'bigint' ||
      value instanceof Uint8Array
    ) {
      return value;
    }
    return String(value);
  });
}

interface ExecuteResult {
  changes: number;
  lastInsertRowId: number;
  getAllSync: () => unknown[];
  getFirstSync: () => unknown;
}

class ShimStatement {
  constructor(
    private readonly database: DatabaseSync,
    private readonly sql: string,
  ) {}

  private prepare(returnArrays: boolean): StatementSync {
    const statement = this.database.prepare(this.sql);
    statement.setReturnArrays(returnArrays);
    return statement;
  }

  private execute(params: readonly unknown[], returnArrays: boolean): ExecuteResult {
    const statement = this.prepare(returnArrays);
    // `all()` executes the statement and yields rows; non-SELECT statements yield [].
    const rows = statement.all(...toParams(params));
    const meta = this.database.prepare('SELECT changes() AS c, last_insert_rowid() AS r');
    meta.setReturnArrays(false);
    const row = meta.get() as { c: number; r: number } | undefined;

    return {
      changes: row?.c ?? 0,
      lastInsertRowId: row?.r ?? 0,
      getAllSync: () => rows,
      getFirstSync: () => rows[0],
    };
  }

  executeSync(params: readonly unknown[] = []): ExecuteResult {
    return this.execute(params, false);
  }

  executeForRawResultSync(params: readonly unknown[] = []): ExecuteResult {
    return this.execute(params, true);
  }

  finalizeSync(): void {
    // Node's statements are garbage collected; nothing to release.
  }
}

export class SQLiteDatabase {
  readonly native: DatabaseSync;

  constructor(readonly databaseName: string) {
    this.native = new DatabaseSync(':memory:');
  }

  prepareSync(sql: string): ShimStatement {
    return new ShimStatement(this.native, sql);
  }

  execSync(sql: string): void {
    this.native.exec(sql);
  }

  closeSync(): void {
    this.native.close();
  }
}

export interface SQLiteOpenOptions {
  enableChangeListener?: boolean;
}

/** Always an in-memory database, so every test file starts from a clean schema. */
export function openDatabaseSync(
  databaseName: string,
  _options?: SQLiteOpenOptions,
): SQLiteDatabase {
  return new SQLiteDatabase(databaseName);
}

export type SQLiteRunResult = { changes: number; lastInsertRowId: number };

/**
 * `drizzle-orm/expo-sqlite`'s live-query module imports this at load time. The query
 * layer under test uses the invalidation hook instead of live queries, so a no-op
 * subscription is enough to let the module load.
 */
export function addDatabaseChangeListener(_listener: (event: unknown) => void): {
  remove: () => void;
} {
  return { remove: () => undefined };
}
