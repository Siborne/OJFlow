import { create } from 'zustand';
import type { Contest } from '../types';
import type { ContestsPartialPayload, PlatformFetchStatus } from '../../shared/types';
import { ContestService } from '../services/contest';
import { ContestUtils } from '../utils/contest_utils';
import appConfig from '../../electron/app.config.json';
import { useScheduleStore } from './schedule';

const PLATFORMS = ['Codeforces', 'AtCoder', '洛谷', '蓝桥云课', '力扣', '牛客'];
const MAX_CRAWL_DAYS_KEY = 'max_crawl_days';
const HIDE_DATE_KEY = 'hide_date';
const SHOW_EMPTY_DAY_KEY = 'show_empty_day';
const DEFAULT_DAYS = appConfig?.crawl?.defaultDays ?? 7;
const MIN_DAYS = appConfig?.crawl?.minDays ?? 1;
const MAX_DAYS = appConfig?.crawl?.maxDays ?? 30;

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' && value.trim() === '') return fallback;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  if (i < min) return min;
  if (i > max) return max;
  return i;
}

function readLocalStorageDays(): number {
  try {
    return clampInt(localStorage.getItem(MAX_CRAWL_DAYS_KEY), MIN_DAYS, MAX_DAYS, DEFAULT_DAYS);
  } catch {
    return DEFAULT_DAYS;
  }
}

function readLocalStorageFavorites(): Contest[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem('favourite_contests_list') || '[]');
    return Array.isArray(parsed) ? (parsed as Contest[]) : [];
  } catch {
    return [];
  }
}

function readLocalStorageHideDate(): boolean {
  try {
    return localStorage.getItem(HIDE_DATE_KEY) === '1';
  } catch {
    return false;
  }
}

function readLocalStorageShowEmptyDay(): boolean {
  try {
    return localStorage.getItem(SHOW_EMPTY_DAY_KEY) === '1';
  } catch {
    return false;
  }
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function getContestFavoriteKey(contest: Partial<Contest>): string {
  const platform = normalizeText(contest.platform);
  const start = Number(contest.startTimeSeconds ?? 0);
  const link = normalizeText(contest.link);
  const name = normalizeText(contest.name);
  if (link) return `${platform}|${start}|${link}`;
  return `${platform}|${start}|${name}`;
}

function getElectronStore(): StoreApi | undefined {
  return typeof window !== 'undefined' ? window.store : undefined;
}

interface ContestState {
  contests: Contest[];
  loading: boolean;
  day: number;
  showEmptyDay: boolean;
  selectedPlatforms: Record<string, boolean>;
  favorites: Contest[];
  hideDate: boolean;
  initialized: boolean;
  platformStatus: PlatformFetchStatus[];
  fromCache: boolean;
  cachedAt: number | null;
  totalElapsed: number;
  error: string | null;
  lastUpdatedAt: number | null;

  init: () => Promise<void>;
  fetchContests: () => Promise<void>;
  applyContestsPartial: (payload: ContestsPartialPayload) => void;
  setMaxCrawlDays: (nextDay: number) => Promise<void>;
  togglePlatform: (platform: string, value: boolean) => void;
  toggleShowEmptyDay: (value: boolean) => void;
  toggleHideDate: (value: boolean) => void;
  toggleFavorite: (contest: Contest) => void;
  removeFavorite: (contestName: string) => { deleted: string[]; notFound: string[] };
  removeFavorites: (contestNames: string[]) => { deleted: string[]; notFound: string[] };
  isFavorite: (contestOrName: Contest | string) => boolean;
  addManualContest: (contest: Contest) => void;
  getTimeContests: () => Contest[][];
}

function persistFavorites(nextFavorites: Contest[], prevFavorites: Contest[]) {
  const nextSnapshot = nextFavorites.map(item => ({ ...item }));
  const prevSnapshot = prevFavorites.map(item => ({ ...item }));
  try {
    localStorage.setItem('favourite_contests_list', JSON.stringify(nextSnapshot));
  } catch (error) {
    try {
      localStorage.setItem('favourite_contests_list', JSON.stringify(prevSnapshot));
    } catch {
      // Ignore
    }
    throw error;
  }
  const eStore = getElectronStore();
  if (eStore) {
    eStore.set('favorites', nextSnapshot).catch(() => {});
  }
}

function persistMaxCrawlDays(nextDay: number, prevDay: number) {
  try {
    localStorage.setItem(MAX_CRAWL_DAYS_KEY, String(nextDay));
  } catch (error) {
    try {
      localStorage.setItem(MAX_CRAWL_DAYS_KEY, String(prevDay));
    } catch {
      // Ignore
    }
    throw error;
  }
  const eStoreD = getElectronStore();
  if (eStoreD) {
    eStoreD.set('contest.maxCrawlDays', nextDay).catch(() => {});
  }
}

function persistHideDate(nextHide: boolean, prevHide: boolean) {
  try {
    localStorage.setItem(HIDE_DATE_KEY, nextHide ? '1' : '0');
  } catch (error) {
    try {
      localStorage.setItem(HIDE_DATE_KEY, prevHide ? '1' : '0');
    } catch {
      // Ignore
    }
    throw error;
  }
  const eStoreH = getElectronStore();
  if (eStoreH) {
    eStoreH.set('contest.hideDate', nextHide).catch(() => {});
  }
}

function persistShowEmptyDay(nextValue: boolean) {
  try {
    localStorage.setItem(SHOW_EMPTY_DAY_KEY, nextValue ? '1' : '0');
  } catch {
    // Keep the in-memory preference when localStorage is unavailable.
  }
  getElectronStore()
    ?.set('contest.showEmptyDay', nextValue)
    .catch(() => {});
}

export const useContestStore = create<ContestState>((set, get) => ({
  contests: [],
  loading: false,
  day: readLocalStorageDays(),
  showEmptyDay: readLocalStorageShowEmptyDay(),
  selectedPlatforms: PLATFORMS.reduce(
    (acc, p) => ({ ...acc, [p]: true }),
    {} as Record<string, boolean>,
  ),
  favorites: readLocalStorageFavorites(),
  hideDate: readLocalStorageHideDate(),
  initialized: false,
  platformStatus: [],
  fromCache: false,
  cachedAt: null,
  totalElapsed: 0,
  error: null,
  lastUpdatedAt: null,

  init: async () => {
    if (get().initialized) return;

    const eStore = getElectronStore();
    try {
      if (eStore) {
        const [contestConfig, favorites] = await Promise.all([
          eStore.get('contest') as Promise<
            | {
                maxCrawlDays?: number;
                hideDate?: boolean;
                showEmptyDay?: boolean;
                selectedPlatforms?: Record<string, boolean>;
              }
            | undefined
          >,
          eStore.get('favorites') as Promise<Contest[] | undefined>,
        ]);

        const patch: Partial<ContestState> = {};
        if (contestConfig) {
          if (typeof contestConfig.maxCrawlDays === 'number') {
            patch.day = clampInt(contestConfig.maxCrawlDays, MIN_DAYS, MAX_DAYS, get().day);
          }
          if (typeof contestConfig.hideDate === 'boolean') {
            patch.hideDate = contestConfig.hideDate;
          }
          if (typeof contestConfig.showEmptyDay === 'boolean') {
            patch.showEmptyDay = contestConfig.showEmptyDay;
          }
          if (contestConfig.selectedPlatforms) {
            patch.selectedPlatforms = {
              ...get().selectedPlatforms,
              ...contestConfig.selectedPlatforms,
            };
          }
        }
        if (Array.isArray(favorites)) {
          patch.favorites = favorites;
        }
        if (Object.keys(patch).length > 0) set(patch);
      }
    } catch {
      // Keep localStorage-loaded defaults on error
    }

    set({ initialized: true });
  },

  fetchContests: async () => {
    set({ loading: true, error: null });
    try {
      const result = await ContestService.getRecentContests(get().day);
      set({
        contests: result.contests,
        platformStatus: result.platformStatus,
        fromCache: result.fromCache,
        cachedAt: result.cachedAt,
        totalElapsed: result.totalElapsed,
        error: null,
        lastUpdatedAt: Date.now(),
      });
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : '比赛数据加载失败' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  applyContestsPartial: (payload: ContestsPartialPayload) => {
    if (payload.day !== get().day || !Array.isArray(payload.contests)) return;
    const incoming = payload.contests
      .map(contest =>
        ContestUtils.createContest(
          contest.name,
          contest.startTime,
          contest.duration,
          contest.platform,
          contest.link,
        ),
      )
      .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
    const remaining = get().contests.filter(c => c.platform !== payload.platform);
    set({
      contests: [...remaining, ...incoming].sort((a, b) => a.startTimeSeconds - b.startTimeSeconds),
      lastUpdatedAt: Date.now(),
    });
  },

  setMaxCrawlDays: async (nextDay: number) => {
    const day = clampInt(nextDay, MIN_DAYS, MAX_DAYS, get().day);
    if (day === get().day) return;

    const prevDay = get().day;
    set({ day });
    try {
      persistMaxCrawlDays(day, prevDay);
    } catch (error) {
      set({ day: prevDay });
      throw error;
    }

    try {
      await get().fetchContests();
    } catch (error) {
      set({ day: prevDay });
      try {
        persistMaxCrawlDays(prevDay, day);
      } catch {
        // Ignore
      }
      throw error;
    }
  },

  togglePlatform: (platform: string, value: boolean) => {
    const next = { ...get().selectedPlatforms, [platform]: value };
    set({ selectedPlatforms: next });
    const eStoreP = getElectronStore();
    if (eStoreP) {
      eStoreP.set('contest.selectedPlatforms', next).catch(() => {});
    }
  },

  toggleShowEmptyDay: (value: boolean) => {
    set({ showEmptyDay: value });
    persistShowEmptyDay(value);
  },

  toggleHideDate: (value: boolean) => {
    const prevHide = get().hideDate;
    set({ hideDate: value });
    try {
      persistHideDate(value, prevHide);
    } catch (error) {
      set({ hideDate: prevHide });
      throw error;
    }
  },

  toggleFavorite: (contest: Contest) => {
    const prevFavorites = get().favorites.slice();
    const targetKey = getContestFavoriteKey(contest);
    const index = prevFavorites.findIndex(c => getContestFavoriteKey(c) === targetKey);
    let nextFavorites: Contest[];
    if (index > -1) {
      nextFavorites = [...prevFavorites.slice(0, index), ...prevFavorites.slice(index + 1)];
    } else {
      nextFavorites = [...prevFavorites, contest];
    }
    set({ favorites: nextFavorites });
    try {
      persistFavorites(nextFavorites, prevFavorites);
    } catch (error) {
      set({ favorites: prevFavorites });
      throw error;
    }
    useScheduleStore.getState().syncFavoriteContest(contest, index === -1);
  },

  removeFavorite: (contestName: string) => {
    return get().removeFavorites([contestName]);
  },

  removeFavorites: (contestNames: string[]) => {
    const uniqueNames = Array.from(new Set(contestNames)).filter(Boolean);
    if (uniqueNames.length === 0) return { deleted: [] as string[], notFound: [] as string[] };

    const prevFavorites = get().favorites.slice();
    const existingNames = new Set(prevFavorites.map(c => c.name));

    const deleted: string[] = [];
    const notFound: string[] = [];

    for (const name of uniqueNames) {
      if (existingNames.has(name)) {
        deleted.push(name);
      } else {
        notFound.push(name);
      }
    }

    if (deleted.length === 0) return { deleted, notFound };

    const deletedSet = new Set(deleted);
    const nextFavorites = prevFavorites.filter(c => !deletedSet.has(c.name));
    const removedContests = prevFavorites.filter(c => deletedSet.has(c.name));

    set({ favorites: nextFavorites });
    try {
      persistFavorites(nextFavorites, prevFavorites);
    } catch (error) {
      set({ favorites: prevFavorites });
      throw error;
    }
    for (const contest of removedContests) {
      useScheduleStore.getState().syncFavoriteContest(contest, false);
    }

    return { deleted, notFound };
  },

  isFavorite: (contestOrName: Contest | string): boolean => {
    const { favorites } = get();
    if (typeof contestOrName === 'string') {
      const targetName = normalizeText(contestOrName);
      return favorites.some(c => normalizeText(c.name) === targetName);
    }
    const targetKey = getContestFavoriteKey(contestOrName);
    return favorites.some(c => getContestFavoriteKey(c) === targetKey);
  },

  addManualContest: (contest: Contest) => {
    const { favorites } = get();
    if (favorites.some(c => c.name === contest.name)) {
      throw new Error('已存在同名收藏比赛');
    }
    const prevFavorites = favorites.slice();
    const nextFavorites = [...prevFavorites, contest];
    set({ favorites: nextFavorites });
    try {
      persistFavorites(nextFavorites, prevFavorites);
    } catch (error) {
      set({ favorites: prevFavorites });
      throw error;
    }
    useScheduleStore.getState().syncFavoriteContest(contest, true);
  },

  getTimeContests: (): Contest[][] => {
    const { contests, day } = get();
    const grouped: Contest[][] = Array.from({ length: day }, () => []);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;

    contests.forEach(contest => {
      const contestStart = contest.startTimeSeconds;
      const diffSeconds = contestStart - todayStart;
      const dayIndex = Math.floor(diffSeconds / (24 * 3600));
      if (dayIndex >= 0 && dayIndex < day) {
        grouped[dayIndex].push(contest);
      }
    });

    grouped.forEach(dayList => {
      dayList.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
    });

    return grouped;
  },
}));
