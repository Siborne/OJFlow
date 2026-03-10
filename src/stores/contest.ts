import { defineStore } from 'pinia';
import { Contest } from '../types';
import { ContestService } from '../services/contest';
import { ContestUtils } from '../utils/contest_utils';

interface ContestState {
  contests: Contest[];
  loading: boolean;
  day: number;
  showEmptyDay: boolean;
  selectedPlatforms: Record<string, boolean>;
  favorites: Contest[]; // Store full contest objects
}

const PLATFORMS = ['Codeforces', 'AtCoder', '洛谷', '蓝桥云课', '力扣', '牛客'];

export const useContestStore = defineStore('contest', {
  state: (): ContestState => ({
    contests: [],
    loading: false,
    day: 7,
    showEmptyDay: true, // Default to true based on logic
    selectedPlatforms: PLATFORMS.reduce((acc, p) => ({ ...acc, [p]: true }), {} as Record<string, boolean>),
    favorites: JSON.parse(localStorage.getItem('favourite_contests_list') || '[]'),
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
    async fetchContests() {
      this.loading = true;
      try {
        const rawContests = await ContestService.getRecentContests(this.day);
        this.contests = rawContests;
      } catch (error) {
        console.error(error);
      } finally {
        this.loading = false;
      }
    },
    togglePlatform(platform: string, value: boolean) {
      this.selectedPlatforms[platform] = value;
    },
    toggleShowEmptyDay(value: boolean) {
      this.showEmptyDay = value;
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
