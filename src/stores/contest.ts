import { defineStore } from 'pinia';
import { Contest } from '../types';
import { ContestService } from '../services/contest';
import { ContestUtils } from '../utils/contest_utils';
import appConfig from '../../electron/app.config.json';

interface ContestState {
  contests: Contest[];
  loading: boolean;
  day: number;
  showEmptyDay: boolean;
  selectedPlatforms: Record<string, boolean>;
  favorites: Contest[]; // Store full contest objects
  hideDate: boolean;
}

const PLATFORMS = ['Codeforces', 'AtCoder', '洛谷', '蓝桥云课', '力扣', '牛客'];
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

export const useContestStore = defineStore('contest', {
  state: (): ContestState => ({
    contests: [],
    loading: false,
    day: clampInt(localStorage.getItem(MAX_CRAWL_DAYS_KEY), MIN_DAYS, MAX_DAYS, DEFAULT_DAYS),
    showEmptyDay: true, // Default to true based on logic
    selectedPlatforms: PLATFORMS.reduce((acc, p) => ({ ...acc, [p]: true }), {} as Record<string, boolean>),
    favorites: JSON.parse(localStorage.getItem('favourite_contests_list') || '[]'),
    hideDate: localStorage.getItem(HIDE_DATE_KEY) === '1',
  }),
  getters: {
    timeContests(state): Contest[][] {
      // Group by day (0 to day-1)
      const grouped: Contest[][] = Array.from({ length: state.day }, () => []);
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;

      state.contests.forEach(contest => {
        const contestStart = contest.startTimeSeconds;
        const diffSeconds = contestStart - todayStart;
        const dayIndex = Math.floor(diffSeconds / (24 * 3600));

        if (dayIndex >= 0 && dayIndex < state.day) {
          grouped[dayIndex].push(contest);
        }
      });
      
      // Sort each day by time
      grouped.forEach(dayList => {
        dayList.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
      });

      return grouped;
    },
  },
  actions: {
    persistFavorites(nextFavorites: Contest[], prevFavorites: Contest[]) {
      try {
        localStorage.setItem('favourite_contests_list', JSON.stringify(nextFavorites));
      } catch (error) {
        try {
          localStorage.setItem('favourite_contests_list', JSON.stringify(prevFavorites));
        } catch {
        }
        throw error;
      }
    },
    persistMaxCrawlDays(nextDay: number, prevDay: number) {
      try {
        localStorage.setItem(MAX_CRAWL_DAYS_KEY, String(nextDay));
      } catch (error) {
        try {
          localStorage.setItem(MAX_CRAWL_DAYS_KEY, String(prevDay));
        } catch {
        }
        throw error;
      }
    },
    persistHideDate(nextHide: boolean, prevHide: boolean) {
      try {
        localStorage.setItem(HIDE_DATE_KEY, nextHide ? '1' : '0');
      } catch (error) {
        try {
          localStorage.setItem(HIDE_DATE_KEY, prevHide ? '1' : '0');
        } catch {
        }
        throw error;
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
        }
        throw error;
      }
    },
    togglePlatform(platform: string, value: boolean) {
      this.selectedPlatforms[platform] = value;
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
    }
  },
});
