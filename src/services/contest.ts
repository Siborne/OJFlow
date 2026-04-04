import type { Contest } from '../types';
import type { PlatformFetchStatus } from '../../shared/types';
import { ContestUtils } from '../utils/contest_utils';
import appConfig from '../../electron/app.config.json';

const DEFAULT_DAYS = appConfig?.crawl?.defaultDays ?? 7;

export interface ContestFetchResult {
  contests: Contest[];
  platformStatus: PlatformFetchStatus[];
  totalElapsed: number;
  fromCache: boolean;
  cachedAt: number | null;
}

export class ContestService {
  static async getRecentContests(day: number = DEFAULT_DAYS): Promise<ContestFetchResult> {
    try {
      const response = (await window.api.getRecentContests(day)) as any;

      // Handle both new ContestFetchResponse and legacy RawContest[] formats
      let rawContests: any[];
      let platformStatus: PlatformFetchStatus[] = [];
      let totalElapsed = 0;
      let fromCache = false;
      let cachedAt: number | null = null;

      if (response && Array.isArray(response.contests)) {
        // New format: ContestFetchResponse
        rawContests = response.contests;
        platformStatus = response.platformStatus || [];
        totalElapsed = response.totalElapsed || 0;
        fromCache = response.fromCache || false;
        cachedAt = response.cachedAt || null;
      } else if (Array.isArray(response)) {
        // Legacy format: RawContest[]
        rawContests = response;
      } else {
        rawContests = [];
      }

      const contests = rawContests.map((c: any) =>
        ContestUtils.createContest(c.name, c.startTime, c.duration, c.platform, c.link),
      );

      return { contests, platformStatus, totalElapsed, fromCache, cachedAt };
    } catch (error) {
      console.error('Failed to get contests:', error);
      return { contests: [], platformStatus: [], totalElapsed: 0, fromCache: false, cachedAt: null };
    }
  }

  static async openUrl(url: string): Promise<void> {
    await window.api.openUrl(url);
  }

  static async installUpdate(url: string): Promise<void> {
    await window.api.installUpdate(url);
  }
}
