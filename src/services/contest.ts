import { Contest } from '../types';
import { ContestUtils } from '../utils/contest_utils';
import appConfig from '../../electron/app.config.json';

const DEFAULT_DAYS = appConfig?.crawl?.defaultDays ?? 7;

export class ContestService {
  static async getRecentContests(day: number = DEFAULT_DAYS): Promise<Contest[]> {
    try {
      const rawContests = (await window.api.getRecentContests(day)) as Array<{
        name: string;
        startTime: number;
        duration: number;
        platform: string;
        link?: string;
      }>;

      return rawContests.map(c =>
        ContestUtils.createContest(c.name, c.startTime, c.duration, c.platform, c.link),
      );
    } catch (error) {
      console.error('Failed to get contests:', error);
      return [];
    }
  }

  static async openUrl(url: string): Promise<void> {
    await window.api.openUrl(url);
  }

  static async installUpdate(url: string): Promise<void> {
    await window.api.installUpdate(url);
  }
}
