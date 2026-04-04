import { defineStore } from 'pinia';
import { Contest } from '../types';
import { ContestService } from '../services/contest';
import appConfig from '../../electron/app.config.json';

interface ContestState {
  contests: Contest[];
  loading: boolean;
  day: number;
  showEmptyDay: boolean;
  selectedPlatforms: Record<string, boolean>;
  favorites: Contest[];
  hideDate: boolean;
  initialized: boolean;
}

const PLATFORMS = ['Codeforces', 'AtCoder', '\u6d1b\u8c37', '\u84dd\u6865\u4e91\u8bfe', '\u529b\u6263', '\u725b\u5ba2'];
const MAX_CRAWL_DAYS_KEY = 'max_crawl_days';
const HIDE_DATE_KEY = 'hide_date';
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
    return JSON.parse(localStorage.getItem('favourite_contests_list') || '[]');
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

function getElectronStore(): StoreApi | undefined {
  return typeof window !== 'undefined' ? window.store : undefined;
}

export const useContestStore = defineStore('contest', {
  state: (): ContestState => ({
    contests: [],
    loading: false,
    day: readLocalStorageDays(),
    showEmptyDay: true,
    selectedPlatforms: PLATFORMS.reduce(
      (acc, p) => ({ ...acc, [p]: true }),
      {} as Record<string, boolean>,
    ),
    favorites: readLocalStorageFavorites(),
    hideDate: readLocalStorageHideDate(),
    initialized: false,
  }),
  getters: {
    timeContests(state): Contest[][] {
      const grouped: Contest[][] = Array.from({ length: state.day }, () => []);
      const now = new Date();
      const todayStart =
        new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;

      state.contests.forEach(contest => {
        const contestStart = contest.startTimeSeconds;
        const diffSeconds = contestStart - todayStart;
        const dayIndex = Math.floor(diffSeconds / (24 * 3600));

        if (dayIndex >= 0 && dayIndex < state.day) {
          grouped[dayIndex].push(contest);
        }
      });

      grouped.forEach(dayList => {
        dayList.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
      });

      return grouped;
    },
  },
  actions: {
    async init() {
      if (this.initialized) return;

      const eStore = getElectronStore();
      try {
        if (eStore) {
          const [contestConfig, favorites] = await Promise.all([
            eStore.get('contest') as Promise<
              | { maxCrawlDays?: number; hideDate?: boolean; selectedPlatforms?: Record<string, boolean> }
              | undefined
            >,
            eStore.get('favorites') as Promise<Contest[] | undefined>,
          ]);

          if (contestConfig) {
            if (typeof contestConfig.maxCrawlDays === 'number') {
              this.day = clampInt(contestConfig.maxCrawlDays, MIN_DAYS, MAX_DAYS, this.day);
            }
            if (typeof contestConfig.hideDate === 'boolean') {
              this.hideDate = contestConfig.hideDate;
            }
            if (contestConfig.selectedPlatforms) {
              this.selectedPlatforms = {
                ...this.selectedPlatforms,
                ...contestConfig.selectedPlatforms,
              };
            }
          }

          if (Array.isArray(favorites) && favorites.length > 0) {
            this.favorites = favorites;
          }
        }
      } catch {
        // Keep localStorage-loaded defaults on error
      }

      this.initialized = true;
    },
    persistFavorites(nextFavorites: Contest[], prevFavorites: Contest[]) {
      try {
        localStorage.setItem('favourite_contests_list', JSON.stringify(nextFavorites));
      } catch (error) {
        try {
          localStorage.setItem('favourite_contests_list', JSON.stringify(prevFavorites));
        } catch {
          // Ignore
        }
        throw error;
      }
      // Also persist to electron-store (async, fire-and-forget)
      const eStore = getElectronStore();
      if (eStore) {
        eStore.set('favorites', nextFavorites).catch(() => {});
      }
    },
    persistMaxCrawlDays(nextDay: number, prevDay: number) {
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
    },
    persistHideDate(nextHide: boolean, prevHide: boolean) {
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
    },
    async fetchContests() {
      this.loading = true;
      try {
        const rawContests = await ContestService.getRecentContests(this.day);
        this.contests = rawContests;
      } catch (error) {
        console.error(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async setMaxCrawlDays(nextDay: number) {
      const day = clampInt(nextDay, MIN_DAYS, MAX_DAYS, this.day);
      if (day === this.day) return;

      const prevDay = this.day;
      this.day = day;
      try {
        this.persistMaxCrawlDays(day, prevDay);
      } catch (error) {
        this.day = prevDay;
        throw error;
      }

      try {
        await this.fetchContests();
      } catch (error) {
        this.day = prevDay;
        try {
          this.persistMaxCrawlDays(prevDay, day);
        } catch {
          // Ignore
        }
        throw error;
      }
    },
    togglePlatform(platform: string, value: boolean) {
      this.selectedPlatforms[platform] = value;
      const eStoreP = getElectronStore();
      if (eStoreP) {
        eStoreP.set('contest.selectedPlatforms', this.selectedPlatforms).catch(() => {});
      }
    },
    toggleShowEmptyDay(value: boolean) {
      this.showEmptyDay = value;
    },
    toggleHideDate(value: boolean) {
      const prevHide = this.hideDate;
      this.hideDate = value;
      try {
        this.persistHideDate(value, prevHide);
      } catch (error) {
        this.hideDate = prevHide;
        throw error;
      }
    },
    toggleFavorite(contest: Contest) {
      const prevFavorites = this.favorites.slice();
      const index = this.favorites.findIndex(c => c.name === contest.name);
      if (index > -1) {
        this.favorites.splice(index, 1);
      } else {
        this.favorites.push(contest);
      }
      try {
        this.persistFavorites(this.favorites, prevFavorites);
      } catch (error) {
        this.favorites = prevFavorites;
        throw error;
      }
    },
    removeFavorite(contestName: string) {
      return this.removeFavorites([contestName]);
    },
    removeFavorites(contestNames: string[]) {
      const uniqueNames = Array.from(new Set(contestNames)).filter(Boolean);
      if (uniqueNames.length === 0) {
        return { deleted: [] as string[], notFound: [] as string[] };
      }

      const prevFavorites = this.favorites.slice();
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

      if (deleted.length === 0) {
        return { deleted, notFound };
      }

      const deletedSet = new Set(deleted);
      const nextFavorites = prevFavorites.filter(c => !deletedSet.has(c.name));

      this.favorites = nextFavorites;
      try {
        this.persistFavorites(nextFavorites, prevFavorites);
      } catch (error) {
        this.favorites = prevFavorites;
        throw error;
      }

      return { deleted, notFound };
    },
    isFavorite(contestName: string): boolean {
      return this.favorites.some(c => c.name === contestName);
    },
  },
});
