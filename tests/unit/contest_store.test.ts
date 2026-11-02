import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { createContest, createMemoryStorage, installDom } from './helpers';
import { useContestStore } from '../../src/stores/contest';
import { useScheduleStore } from '../../src/stores/schedule';

let dom: ReturnType<typeof installDom>;
let storage: Storage;

function setStoreApi(store: Partial<StoreApi>): void {
  Object.defineProperty(window, 'store', {
    configurable: true,
    value: store as StoreApi,
  });
}

function resetContestStore(): void {
  useContestStore.setState({
    contests: [],
    loading: false,
    day: 7,
    showEmptyDay: false,
    selectedPlatforms: {
      Codeforces: true,
      AtCoder: true,
      洛谷: true,
      蓝桥云课: true,
      力扣: true,
      牛客: true,
    },
    favorites: [],
    hideDate: false,
    initialized: false,
    platformStatus: [],
    fromCache: false,
    cachedAt: null,
    totalElapsed: 0,
    error: null,
    lastUpdatedAt: null,
  });
}

beforeAll(() => {
  dom = installDom();
});

afterAll(() => {
  dom.window.close();
});

beforeEach(() => {
  storage = createMemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      getRecentContests: async () => ({
        contests: [],
        platformStatus: [],
        totalElapsed: 0,
        fromCache: false,
        cachedAt: null,
      }),
    } as unknown as ElectronApi,
  });
  setStoreApi({
    get: async () => undefined,
    set: async () => {},
    getAll: async () => ({}),
  });
  resetContestStore();
  useScheduleStore.setState({ items: [], initialized: true });
});

describe('contest store', () => {
  test('initializes from electron-store preferences', async () => {
    setStoreApi({
      get: async key => {
        if (key === 'contest') {
          return {
            maxCrawlDays: 14,
            hideDate: true,
            showEmptyDay: false,
            selectedPlatforms: { Codeforces: false },
          };
        }
        if (key === 'favorites') return [createContest('Fav', 10)];
        return undefined;
      },
      set: async () => {},
      getAll: async () => ({}),
    });
    await useContestStore.getState().init();
    const state = useContestStore.getState();
    expect(state.day).toBe(14);
    expect(state.hideDate).toBe(true);
    expect(state.showEmptyDay).toBe(false);
    expect(state.selectedPlatforms.Codeforces).toBe(false);
    expect(state.selectedPlatforms.AtCoder).toBe(true);
    expect(state.favorites.map(item => item.name)).toEqual(['Fav']);
    expect(state.initialized).toBe(true);
  });

  test('fetches contests and records errors', async () => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getRecentContests: async () => ({
          contests: [
            {
              name: 'Fetched',
              startTime: 1_800_000_000,
              duration: 3600,
              platform: 'Codeforces',
            },
          ],
          platformStatus: [{ platform: 'Codeforces', success: true, elapsed: 1 }],
          totalElapsed: 2,
          fromCache: false,
          cachedAt: null,
        }),
      } as unknown as ElectronApi,
    });
    await useContestStore.getState().fetchContests();
    expect(useContestStore.getState().contests[0].name).toBe('Fetched');
    expect(useContestStore.getState().loading).toBe(false);
    expect(typeof useContestStore.getState().lastUpdatedAt).toBe('number');

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getRecentContests: async () => {
          throw new Error('network down');
        },
      } as unknown as ElectronApi,
    });
    await expect(useContestStore.getState().fetchContests()).rejects.toThrow('network down');
    expect(useContestStore.getState().error).toBe('network down');
  });

  test('clamps and persists crawl days, then refreshes', async () => {
    const writes: unknown[] = [];
    setStoreApi({
      get: async () => undefined,
      set: async (key, value) => {
        writes.push([key, value]);
      },
      getAll: async () => ({}),
    });
    await useContestStore.getState().setMaxCrawlDays(99);
    expect(useContestStore.getState().day).toBe(30);
    expect(localStorage.getItem('max_crawl_days')).toBe('30');
    expect(writes).toContainEqual(['contest.maxCrawlDays', 30]);
  });

  test('toggles platforms and preferences', () => {
    const writes: unknown[] = [];
    setStoreApi({
      get: async () => undefined,
      set: async (key, value) => {
        writes.push([key, value]);
      },
      getAll: async () => ({}),
    });
    useContestStore.getState().togglePlatform('AtCoder', false);
    expect(useContestStore.getState().selectedPlatforms.AtCoder).toBe(false);
    useContestStore.getState().toggleHideDate(true);
    useContestStore.getState().toggleShowEmptyDay(false);
    expect(useContestStore.getState().hideDate).toBe(true);
    expect(useContestStore.getState().showEmptyDay).toBe(false);
    expect(localStorage.getItem('hide_date')).toBe('1');
    expect(localStorage.getItem('show_empty_day')).toBe('0');
    expect(
      writes.some(item => Array.isArray(item) && item[0] === 'contest.selectedPlatforms'),
    ).toBe(true);
  });

  test('adds, removes and toggles favorites with rollback support', () => {
    const a = createContest('A', 1);
    const b = createContest('B', 2);
    useContestStore.getState().toggleFavorite(a);
    useContestStore.getState().toggleFavorite(b);
    expect(useContestStore.getState().favorites.map(item => item.name)).toEqual(['A', 'B']);
    expect(useContestStore.getState().isFavorite(a)).toBe(true);
    expect(useContestStore.getState().isFavorite('a')).toBe(true);

    useContestStore.getState().toggleFavorite(a);
    expect(useContestStore.getState().favorites.map(item => item.name)).toEqual(['B']);

    const removed = useContestStore.getState().removeFavorites(['B', 'B', 'missing']);
    expect(removed.deleted).toEqual(['B']);
    expect(removed.notFound).toEqual(['missing']);
    expect(useContestStore.getState().favorites).toEqual([]);
  });

  test('rejects duplicate manual contests', () => {
    const manual = createContest('Manual', 3);
    manual.isManual = true;
    useContestStore.getState().addManualContest(manual);
    expect(() => useContestStore.getState().addManualContest(manual)).toThrow('同名');
  });

  test('links favorite contests with the dashboard schedule', () => {
    const contest = createContest('Linked Contest', 1_900_000_000);
    useContestStore.getState().toggleFavorite(contest);
    expect(useScheduleStore.getState().items).toHaveLength(1);
    expect(useScheduleStore.getState().items[0].autoCreated).toBe(true);

    useContestStore.getState().toggleFavorite(contest);
    expect(useScheduleStore.getState().items).toHaveLength(0);
  });

  test('applies matching partial contest updates and ignores stale days', () => {
    useContestStore.setState({
      day: 2,
      contests: [createContest('Old', 1)],
    });
    useContestStore.getState().applyContestsPartial({
      day: 3,
      platform: 'AtCoder',
      contests: [],
    });
    expect(useContestStore.getState().contests.map(item => item.name)).toEqual(['Old']);

    useContestStore.getState().applyContestsPartial({
      day: 2,
      platform: 'Codeforces',
      contests: [
        {
          name: 'New',
          startTime: 1_800_000_000,
          duration: 3600,
          platform: 'Codeforces',
        },
      ],
    });
    expect(useContestStore.getState().contests.map(item => item.name)).toEqual(['New']);
    expect(typeof useContestStore.getState().lastUpdatedAt).toBe('number');
  });

  test('groups contests by day', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todaySeconds = Math.floor(today.getTime() / 1000);
    useContestStore.setState({
      day: 3,
      contests: [
        createContest('Today', todaySeconds),
        createContest('Tomorrow', todaySeconds + 86400),
        createContest('Outside', todaySeconds + 4 * 86400),
      ],
    });
    const grouped = useContestStore.getState().getTimeContests();
    expect(grouped).toHaveLength(3);
    expect(grouped[0][0].name).toBe('Today');
    expect(grouped[1][0].name).toBe('Tomorrow');
    expect(grouped.flat().map(item => item.name)).not.toContain('Outside');
  });
});
