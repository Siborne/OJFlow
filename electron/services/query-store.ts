import * as fs from 'node:fs';
import * as path from 'node:path';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';

export type QuerySnapshotKind = 'rating' | 'solved' | 'contests';

export interface QuerySnapshot<T = unknown> {
  kind: QuerySnapshotKind;
  platform: string;
  handle: string;
  payload: T;
  fetchedAt: number;
}

let SQL: SqlJsStatic | null = null;
let database: Database | null = null;
let databasePath = '';
let initPromise: Promise<void> | null = null;

function ensureSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS query_snapshots (
      kind TEXT NOT NULL,
      platform TEXT NOT NULL,
      handle TEXT NOT NULL,
      payload TEXT NOT NULL,
      fetched_at INTEGER NOT NULL,
      PRIMARY KEY (kind, platform, handle)
    );
    CREATE INDEX IF NOT EXISTS idx_query_snapshots_kind
      ON query_snapshots(kind, fetched_at DESC);
  `);
}

function flushDatabase(): void {
  if (!database || !databasePath) return;
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  fs.writeFileSync(databasePath, Buffer.from(database.export()));
}

export async function initQueryDatabase(filePath: string): Promise<void> {
  if (database) {
    if (databasePath === filePath) return;
    closeQueryDatabase();
  }
  if (initPromise) return initPromise;

  initPromise = (async () => {
    SQL =
      SQL ??
      (await initSqlJs({
        locateFile: file => path.join(path.dirname(require.resolve('sql.js')), file),
      }));
    databasePath = filePath;
    database = fs.existsSync(filePath)
      ? new SQL.Database(fs.readFileSync(filePath))
      : new SQL.Database();
    ensureSchema(database);
    flushDatabase();
  })().finally(() => {
    initPromise = null;
  });

  return initPromise;
}

export async function waitForQueryDatabase(): Promise<void> {
  if (database) return;
  if (initPromise) await initPromise;
}

export function persistQuerySnapshot<T>(
  kind: QuerySnapshotKind,
  platform: string,
  handle: string,
  payload: T,
  fetchedAt = Date.now(),
): void {
  if (!database) throw new Error('Query database is not initialized');
  database.run(
    `INSERT INTO query_snapshots (kind, platform, handle, payload, fetched_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(kind, platform, handle)
     DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`,
    [kind, platform, handle, JSON.stringify(payload), fetchedAt],
  );
  flushDatabase();
}

export function getPersistedQuerySnapshot<T>(
  kind: QuerySnapshotKind,
  platform: string,
  handle: string,
  maxAgeMs?: number,
): QuerySnapshot<T> | null {
  if (!database) return null;
  const statement = database.prepare(
    `SELECT kind, platform, handle, payload, fetched_at
     FROM query_snapshots
     WHERE kind = ? AND platform = ? AND handle = ?
     LIMIT 1`,
  );
  try {
    statement.bind([kind, platform, handle]);
    if (!statement.step()) return null;
    const row = statement.getAsObject() as {
      kind: QuerySnapshotKind;
      platform: string;
      handle: string;
      payload: string;
      fetched_at: number;
    };
    if (maxAgeMs !== undefined && Date.now() - row.fetched_at > maxAgeMs) return null;
    return {
      kind: row.kind,
      platform: row.platform,
      handle: row.handle,
      payload: JSON.parse(row.payload) as T,
      fetchedAt: row.fetched_at,
    };
  } finally {
    statement.free();
  }
}

export function getAllPersistedQuerySnapshots<T>(kind: QuerySnapshotKind): Array<QuerySnapshot<T>> {
  if (!database) return [];
  const statement = database.prepare(
    `SELECT kind, platform, handle, payload, fetched_at
     FROM query_snapshots
     WHERE kind = ?
     ORDER BY fetched_at DESC`,
  );
  try {
    statement.bind([kind]);
    const rows: Array<QuerySnapshot<T>> = [];
    while (statement.step()) {
      const row = statement.getAsObject() as {
        kind: QuerySnapshotKind;
        platform: string;
        handle: string;
        payload: string;
        fetched_at: number;
      };
      rows.push({
        kind: row.kind,
        platform: row.platform,
        handle: row.handle,
        payload: JSON.parse(row.payload) as T,
        fetchedAt: row.fetched_at,
      });
    }
    return rows;
  } finally {
    statement.free();
  }
}

export function clearQuerySnapshots(): void {
  if (!database) return;
  database.run('DELETE FROM query_snapshots');
  flushDatabase();
}

export function closeQueryDatabase(): void {
  if (database) {
    flushDatabase();
    database.close();
  }
  database = null;
  databasePath = '';
}

export function getQueryDatabasePath(): string {
  return databasePath;
}
