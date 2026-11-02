import { describe, expect, test } from 'bun:test';
import type { BrowserWindow } from 'electron';
import type { PlatformAdapter } from '../../electron/services/adapters/types';
import { fetchAllContests } from '../../electron/services/contest-aggregator';
import { fetchRating } from '../../electron/services/rating-aggregator';
import { fetchSolvedCount } from '../../electron/services/solved-aggregator';

const future = Math.floor(Date.now() / 1000) + 3600;

describe('contest aggregator', () => {
  test('aggregates, sorts, filters and streams results', async () => {
    const sent: unknown[] = [];
    const win = {
      isDestroyed: () => false,
      webContents: {
        send: (_channel: string, payload: unknown) => sent.push(payload),
      },
    } as unknown as BrowserWindow;

    let requestedDays = 0;
    const adapters: PlatformAdapter[] = [
      {
        id: 'a',
        displayName: 'Platform A',
        fetchContests: async days => {
          requestedDays = days;
          return [
            { name: 'Later', startTime: future + 600, duration: 3600, platform: 'Platform A' },
            { name: 'Earlier', startTime: future, duration: 3600, platform: 'Platform A' },
            { name: 'Invalid', startTime: 1, duration: 3600, platform: 'Platform A' },
          ];
        },
      },
      {
        id: 'b',
        displayName: 'Platform B',
        fetchContests: async () => {
          throw new Error('offline');
        },
      },
    ];

    const result = await fetchAllContests(99, win, adapters);
    expect(requestedDays).toBe(30);
    expect(result.contests.map(contest => contest.name)).toEqual(['Earlier', 'Later']);
    expect(result.platformStatus).toHaveLength(2);
    expect(result.platformStatus[0].success).toBe(true);
    expect(result.platformStatus[1]).toMatchObject({
      platform: 'Platform B',
      success: false,
      error: 'offline',
    });
    expect(result.totalElapsed).toBeGreaterThanOrEqual(0);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ day: 30, platform: 'Platform A' });
  });

  test('falls back to default days for invalid input and tolerates no window', async () => {
    let requestedDays = 0;
    const adapters: PlatformAdapter[] = [
      {
        id: 'a',
        displayName: 'A',
        fetchContests: async days => {
          requestedDays = days;
          return [];
        },
      },
    ];
    await fetchAllContests(Number.NaN, null, adapters);
    expect(requestedDays).toBe(7);
  });
});

describe('rating aggregator', () => {
  test('returns validated rating data', async () => {
    const adapter: PlatformAdapter = {
      id: 'codeforces',
      displayName: 'Codeforces',
      fetchRating: async handle => ({ name: handle, curRating: 1800, maxRating: 2000 }),
    };
    await expect(fetchRating('Codeforces', 'u', adapter)).resolves.toEqual({
      rating: { name: 'u', curRating: 1800, maxRating: 2000 },
      fromCache: false,
      cachedAt: null,
    });
  });

  test('returns a safe zero result for invalid adapter data', async () => {
    const adapter: PlatformAdapter = {
      id: 'codeforces',
      displayName: 'Codeforces',
      fetchRating: async () =>
        ({ name: 'u', curRating: 'bad', maxRating: 0 }) as unknown as {
          name: string;
          curRating: number;
          maxRating: number;
        },
    };
    const result = await fetchRating('Codeforces', 'u', adapter);
    expect(result.rating).toEqual({ name: 'u', curRating: 0, maxRating: 0 });
  });

  test('rejects unsupported platforms and missing capability', async () => {
    await expect(fetchRating('Unknown', 'u')).rejects.toThrow('Unsupported');
    await expect(
      fetchRating('Codeforces', 'u', { id: 'codeforces', displayName: 'Codeforces' }),
    ).rejects.toThrow('does not support');
  });
});

describe('solved aggregator', () => {
  test('returns validated solved data', async () => {
    const adapter: PlatformAdapter = {
      id: 'qoj',
      displayName: 'QOJ',
      fetchSolvedCount: async handle => ({ name: handle, solvedNum: 99 }),
    };
    await expect(fetchSolvedCount('QOJ', 'u', adapter)).resolves.toEqual({
      solved: { name: 'u', solvedNum: 99 },
      fromCache: false,
      cachedAt: null,
    });
  });

  test('returns zero for malformed adapter data', async () => {
    const adapter: PlatformAdapter = {
      id: 'qoj',
      displayName: 'QOJ',
      fetchSolvedCount: async () =>
        ({ name: 'u', solvedNum: -1 }) as unknown as { name: string; solvedNum: number },
    };
    const result = await fetchSolvedCount('QOJ', 'u', adapter);
    expect(result.solved).toEqual({ name: 'u', solvedNum: 0 });
  });

  test('rejects unsupported or missing capability', async () => {
    await expect(fetchSolvedCount('Unknown', 'u')).rejects.toThrow('Unsupported');
    await expect(fetchSolvedCount('QOJ', 'u', { id: 'qoj', displayName: 'QOJ' })).rejects.toThrow(
      'does not support',
    );
  });
});
