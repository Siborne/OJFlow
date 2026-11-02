import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  clearQuerySnapshots,
  closeQueryDatabase,
  getAllPersistedQuerySnapshots,
  getPersistedQuerySnapshot,
  getQueryDatabasePath,
  initQueryDatabase,
  persistQuerySnapshot,
} from '../../electron/services/query-store';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ojflow-query-store-'));

beforeEach(() => {
  closeQueryDatabase();
});

afterAll(() => {
  closeQueryDatabase();
  fs.rmSync(root, { recursive: true, force: true });
});

describe('SQLite query store', () => {
  test('persists and reads rating and solved snapshots across reopen', async () => {
    const file = path.join(root, 'ojflow.sqlite');
    await initQueryDatabase(file);
    persistQuerySnapshot('rating', 'Codeforces', 'tourist', {
      name: 'tourist',
      curRating: 3800,
      maxRating: 4000,
    });
    persistQuerySnapshot('solved', 'Codeforces', 'tourist', {
      name: 'tourist',
      solvedNum: 1234,
    });

    expect(getPersistedQuerySnapshot('rating', 'Codeforces', 'tourist')?.payload).toMatchObject({
      curRating: 3800,
    });
    expect(getQueryDatabasePath()).toBe(file);
    expect(fs.existsSync(file)).toBe(true);

    closeQueryDatabase();
    await initQueryDatabase(file);
    expect(getPersistedQuerySnapshot('solved', 'Codeforces', 'tourist')?.payload).toMatchObject({
      solvedNum: 1234,
    });
  });

  test('respects max age and supports listing and clearing snapshots', async () => {
    await initQueryDatabase(path.join(root, 'aging.sqlite'));
    persistQuerySnapshot('contests', 'all', 'days-7', { contests: [], totalElapsed: 1 });
    persistQuerySnapshot(
      'rating',
      'AtCoder',
      'chokudai',
      { name: 'chokudai', curRating: 2500, maxRating: 2800 },
      Date.now() - 10_000,
    );

    expect(getPersistedQuerySnapshot('rating', 'AtCoder', 'chokudai', 1_000)).toBeNull();
    expect(getAllPersistedQuerySnapshots('rating')).toHaveLength(1);
    clearQuerySnapshots();
    expect(getAllPersistedQuerySnapshots('rating')).toHaveLength(0);
  });
});
