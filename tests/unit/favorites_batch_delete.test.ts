import { describe, it, expect } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useContestStore } from '../../src/stores/contest';
import type { Contest } from '../../src/types';

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
}

function createContest(name: string, startTimeSeconds: number): Contest {
  return {
    name,
    startTime: '2026-01-01 00:00',
    endTime: '2026-01-01 01:00',
    duration: '1 小时 0 分钟',
    platform: 'Codeforces',
    link: `https://example.com/${encodeURIComponent(name)}`,
    startHourMinute: '00:00',
    endHourMinute: '01:00',
    startTimeSeconds,
    durationSeconds: 3600,
    formattedStartTime: '2026-01-01 00:00',
    formattedEndTime: '2026-01-01 01:00',
    fomattedDuration: '1 小时 0 分钟',
  };
}

describe('收藏批量删除', () => {
  it('应支持数组参数批量删除并同步持久化', () => {
    const storage = createMemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

    const initial = [createContest('A', 1), createContest('B', 2), createContest('C', 3)];
    localStorage.setItem('favourite_contests_list', JSON.stringify(initial));

    setActivePinia(createPinia());
    const store = useContestStore();

    const result = store.removeFavorites(['A', 'C']);
    expect(result.deleted.sort()).toEqual(['A', 'C']);
    expect(result.notFound).toEqual([]);
    expect(store.favorites.map(c => c.name)).toEqual(['B']);

    const persisted = JSON.parse(localStorage.getItem('favourite_contests_list') || '[]') as Contest[];
    expect(persisted.map(c => c.name)).toEqual(['B']);
  });

  it('应处理空选择与不存在项（部分删除）', () => {
    const storage = createMemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

    const initial = [createContest('A', 1), createContest('B', 2)];
    localStorage.setItem('favourite_contests_list', JSON.stringify(initial));

    setActivePinia(createPinia());
    const store = useContestStore();

    const empty = store.removeFavorites([]);
    expect(empty.deleted).toEqual([]);
    expect(empty.notFound).toEqual([]);
    expect(store.favorites.map(c => c.name)).toEqual(['A', 'B']);

    const partial = store.removeFavorites(['A', 'X', 'B', 'X']);
    expect(partial.deleted.sort()).toEqual(['A', 'B']);
    expect(partial.notFound).toEqual(['X']);
    expect(store.favorites.map(c => c.name)).toEqual([]);
  });

  it('持久化失败时应回滚内存状态', () => {
    const baseStorage = createMemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: baseStorage, configurable: true });

    const initial = [createContest('A', 1), createContest('B', 2)];
    localStorage.setItem('favourite_contests_list', JSON.stringify(initial));

    setActivePinia(createPinia());
    const store = useContestStore();

    const throwingStorage = {
      ...baseStorage,
      setItem() {
        throw new Error('QuotaExceededError');
      }
    };
    Object.defineProperty(globalThis, 'localStorage', { value: throwingStorage, configurable: true });

    expect(() => store.removeFavorites(['A'])).toThrow();
    expect(store.favorites.map(c => c.name)).toEqual(['A', 'B']);
  });

  it('500+ 条数据量应保持线性复杂度的删除路径', () => {
    const storage = createMemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

    const initial: Contest[] = [];
    for (let i = 0; i < 600; i++) {
      initial.push(createContest(`C${i}`, i));
    }
    localStorage.setItem('favourite_contests_list', JSON.stringify(initial));

    setActivePinia(createPinia());
    const store = useContestStore();

    const toDelete: string[] = [];
    for (let i = 0; i < 520; i++) {
      toDelete.push(`C${i}`);
    }

    const result = store.removeFavorites(toDelete);
    expect(result.deleted.length).toBe(520);
    expect(store.favorites.length).toBe(80);
  });
});

