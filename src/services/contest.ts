import type { Contest, RawContest } from '../types';
import type { ContestFetchResponse, PlatformFetchStatus } from '../../shared/types';
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
    const response = await window.api.getRecentContests(day);
    const rawContests: RawContest[] = Array.isArray(response)
      ? response
      : (response?.contests ?? []);

    const contests = rawContests.map(contest =>
      ContestUtils.createContest(
        contest.name,
        contest.startTime,
        contest.duration,
        contest.platform,
        contest.link,
      ),
    );

    if (Array.isArray(response)) {
      return {
        contests,
        platformStatus: [],
        totalElapsed: 0,
        fromCache: false,
        cachedAt: null,
      };
    }

    const result: ContestFetchResponse = response;
    return {
      contests,
      platformStatus: result.platformStatus,
      totalElapsed: result.totalElapsed,
      fromCache: result.fromCache,
      cachedAt: result.cachedAt,
    };
  }

  static async openUrl(url: string): Promise<void> {
    await window.api.openUrl(url);
  }

  static async installUpdate(url: string): Promise<void> {
    await window.api.installUpdate(url);
  }

  static async clearCache(): Promise<void> {
    await window.api.clearCache();
  }
}
