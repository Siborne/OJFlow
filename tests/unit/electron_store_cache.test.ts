import { beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { ContestFetchResponse, Rating, SolvedNum } from '../../shared/types';

function clone<T>(value: T): T {
  return structuredClone(value);
}

class FakeElectronStore {
  static last: FakeElectronStore | undefined;
  private data: Record<string, unknown>;

  constructor(options: { defaults?: Record<string, unknown> }) {
    this.data = clone(options.defaults ?? {});
    FakeElectronStore.last = this;
  }

  get store(): Record<string, unknown> {
    return this.data;
  }

  private path(key: string): string[] {
    return key.split('.');
  }

  get(key: string): unknown {
    let current: unknown = this.data;
    for (const part of this.path(key)) {
      if (!current || typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return clone(current);
  }

  set(key: string, value: unknown): void {
    const parts = this.path(key);
    let current = this.data;
    for (const part of parts.slice(0, -1)) {
      const child = current[part];
      if (!child || typeof child !== 'object') current[part] = {};
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = clone(value);
  }

  delete(key: string): void {
    const parts = this.path(key);
    let current: Record<string, unknown> = this.data;
    for (const part of parts.slice(0, -1)) {
      const child = current[part];
      if (!child || typeof child !== 'object') return;
      current = child as Record<string, unknown>;
    }
    delete current[parts[parts.length - 1]];
  }
}

mock.module('electron-store', () => ({ default: FakeElectronStore }));

const { store } = await import('../../electron/store');
const cache = await import('../../electron/services/cache-service');
const originalNow = Date.now;

describe('electron store schema defaults', () => {
  test('creates a complete default configuration', () => {
    expect(store.get('ui.themeScheme')).toBe('ocean');
    expect(store.get('ui.colorMode')).toBe('auto');
    expect(store.get('ui.locale')).toBe('zh-CN');
    expect(store.get('ui.surfaceStyle')).toBe('glass');
    expect(store.get('ui.startAtLogin')).toBe(false);
    expect(store.get('ui.closeBehavior')).toBe('tray');
    expect(store.get('ui.appMode')).toBe('simple');
    expect(store.get('ui.features.enableProblemSearch')).toBe(true);
    expect(store.get('contest.maxCrawlDays')).toBe(7);
    expect(store.get('contest.showEmptyDay')).toBe(false);
    expect(store.get('notification.reminderMinutes')).toBe(15);
    expect(store.get('schedule')).toEqual([]);
    expect(FakeElectronStore.last).toBeDefined();
  });
});

describe('cache service', () => {
  beforeEach(() => {
    Date.now = originalNow;
    cache.clearAllCache();
  });

  test('stores and returns contest cache entries', () => {
    const response: ContestFetchResponse = {
      contests: [
        {
          name: 'Round',
          startTime: 1_800_000_000,
          duration: 7200,
          platform: 'Codeforces',
        },
      ],
      platformStatus: [],
      totalElapsed: 12,
      fromCache: false,
      cachedAt: null,
    };
    Date.now = () => 1_000_000;
    cache.setCachedContests(response);
    const cached = cache.getCachedContests();
    expect(cached?.fromCache).toBe(true);
    expect(cached?.cachedAt).toBe(1_000_000);
    expect(cached?.contests).toEqual(response.contests);
  });

  test('returns null after contest TTL expires', () => {
    Date.now = () => 2_000_000;
    cache.setCachedContests({
      contests: [],
      platformStatus: [],
      totalElapsed: 0,
      fromCache: false,
      cachedAt: null,
    });
    Date.now = () => 2_000_000 + cache.CACHE_TTL.contests + 1;
    expect(cache.getCachedContests()).toBeNull();
  });

  test('stores and reads rating cache entries', () => {
    const rating: Rating = { name: 'tourist', curRating: 3800, maxRating: 4000 };
    Date.now = () => 3_000_000;
    cache.setCachedRating('Codeforces', 'tourist', {
      rating,
      fromCache: false,
      cachedAt: null,
    });
    expect(cache.getCachedRating('Codeforces', 'tourist')?.rating).toEqual(rating);
    expect(cache.getCachedRating('AtCoder', 'tourist')).toBeNull();
  });

  test('stores and reads solved cache entries', () => {
    const solved: SolvedNum = { name: 'user', solvedNum: 123 };
    Date.now = () => 4_000_000;
    cache.setCachedSolved('洛谷', 'user', { solved: solved, fromCache: false, cachedAt: null });
    expect(cache.getCachedSolved('洛谷', 'user')?.solved).toEqual(solved);
  });

  test('supports scoped and global invalidation', () => {
    const contestResponse: ContestFetchResponse = {
      contests: [],
      platformStatus: [],
      totalElapsed: 0,
      fromCache: false,
      cachedAt: null,
    };
    cache.setCachedContests(contestResponse);
    cache.setCachedRating('Codeforces', 'a', {
      rating: { name: 'a', curRating: 1, maxRating: 1 },
      fromCache: false,
      cachedAt: null,
    });
    cache.setCachedSolved('QOJ', 'a', {
      solved: { name: 'a', solvedNum: 1 },
      fromCache: false,
      cachedAt: null,
    });

    cache.clearContestCache();
    expect(cache.getCachedContests()).toBeNull();
    cache.clearRatingCache();
    expect(cache.getCachedRating('Codeforces', 'a')).toBeNull();
    cache.clearSolvedCache();
    expect(cache.getCachedSolved('QOJ', 'a')).toBeNull();

    cache.clearAllCache();
    expect(store.get('cache')).toEqual({});
  });
});

beforeAll(() => {
  Date.now = originalNow;
});
