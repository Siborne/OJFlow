import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserSettings, Contest, UserStatistics, UserAccount } from '@/types';

interface AppState {
  settings: UserSettings;
  contests: Contest[];
  statistics: UserStatistics;
  accounts: Record<string, UserAccount>; // Map platform_id to UserAccount
  isLoading: boolean;
  
  setSettings: (settings: UserSettings) => void;
  setContests: (contests: Contest[]) => void;
  setStatistics: (stats: UserStatistics) => void;
  setAccount: (platformId: string, account: UserAccount) => void;
  removeAccount: (platformId: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      settings: {
        theme: 'system',
        language: 'zh',
        sync_interval: 60,
        auto_sync: true,
      },
      contests: [],
      statistics: {
        total_solved: 0,
        platform_stats: {},
        difficulty_stats: {},
        recent_activity: [],
        tag_stats: {},
      },
      accounts: {
        'codeforces': { id: 'cf', platform_id: 'codeforces', username: '', handle: '', solved_count: 0 },
        'atcoder': { id: 'ac', platform_id: 'atcoder', username: '', handle: '', solved_count: 0 },
        'leetcode': { id: 'lc', platform_id: 'leetcode', username: '', handle: '', solved_count: 0 },
        'luogu': { id: 'lg', platform_id: 'luogu', username: '', handle: '', solved_count: 0 },
        'nowcoder': { id: 'nc', platform_id: 'nowcoder', username: '', handle: '', solved_count: 0 },
        'vjudge': { id: 'vj', platform_id: 'vjudge', username: '', handle: '', solved_count: 0 },
        'hdu': { id: 'hdu', platform_id: 'hdu', username: '', handle: '', solved_count: 0 },
        'poj': { id: 'poj', platform_id: 'poj', username: '', handle: '', solved_count: 0 },
        'lanqiao': { id: 'lq', platform_id: 'lanqiao', username: '', handle: '', solved_count: 0 },
      },
      isLoading: false,

      setSettings: (settings) => set({ settings }),
      setContests: (contests) => set({ contests }),
      setStatistics: (stats) => set({ statistics: stats }),
      setAccount: (platformId, account) => set((state) => ({
        accounts: { ...state.accounts, [platformId]: account }
      })),
      removeAccount: (platformId) => set((state) => {
        const newAccounts = { ...state.accounts };
        // Reset instead of delete to keep the card structure
        if (newAccounts[platformId]) {
           newAccounts[platformId] = { ...newAccounts[platformId], username: '', handle: '', solved_count: 0, error: undefined };
        }
        return { accounts: newAccounts };
      }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'ojflow-storage',
    }
  )
);
