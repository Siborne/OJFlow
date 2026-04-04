import { BaseAdapter } from './base-adapter';
import type { RawContest, Rating, SolvedNum } from '../../../shared/types';

export class CodeforcesAdapter extends BaseAdapter {
  readonly id = 'codeforces';
  readonly displayName = 'Codeforces';

  private readonly contestApiUrl = 'https://codeforces.com/api/contest.list?gym=false';
  private readonly userInfoUrl = 'https://codeforces.com/api/user.info';
  private readonly ojhuntUrl = 'https://ojhunt.com/api/crawlers/codeforces';

  async fetchContests(days: number): Promise<RawContest[]> {
    const response = await this.http.get(this.contestApiUrl);

    if (response.data?.status !== 'OK') {
      throw new Error('Codeforces API returned non-OK status');
    }

    const contestList = response.data.result;
    if (!Array.isArray(contestList)) {
      throw new Error('Invalid contest list format');
    }

    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400) - new Date().getTimezoneOffset() * 60;
    const queryEnd = todayStart + days * 86400;

    return contestList
      .filter((item: { startTimeSeconds: number; durationSeconds: number }) => {
        const start = item.startTimeSeconds;
        const end = start + item.durationSeconds;
        return end >= todayStart && start <= queryEnd && item.durationSeconds < 86400;
      })
      .map((item: { name: string; startTimeSeconds: number; durationSeconds: number }) => ({
        name: item.name,
        startTime: item.startTimeSeconds,
        duration: item.durationSeconds,
        platform: this.displayName,
        link: 'https://codeforces.com/contests',
      }))
      .sort((a: RawContest, b: RawContest) => b.startTime - a.startTime);
  }

  async fetchRating(handle: string): Promise<Rating> {
    if (!handle || typeof handle !== 'string') {
      throw new Error('Invalid handle');
    }

    const url = `${this.userInfoUrl}?handles=${encodeURIComponent(handle)}&checkHistoricHandles=false`;
    const response = await this.http.get(url);

    if (response.data?.status !== 'OK' || !response.data.result?.[0]) {
      throw new Error('User not found or API error');
    }

    const result = response.data.result[0];
    return {
      name: handle,
      curRating: typeof result.rating === 'number' ? result.rating : 0,
      maxRating: typeof result.maxRating === 'number' ? result.maxRating : 0,
    };
  }

  async fetchSolvedCount(handle: string): Promise<SolvedNum> {
    const url = `${this.ojhuntUrl}/${encodeURIComponent(handle)}`;
    const response = await this.http.get(url);

    if (!response.data?.data?.solved && response.data?.data?.solved !== 0) {
      throw new Error('Invalid API response');
    }

    return {
      name: handle,
      solvedNum: response.data.data.solved,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.http.get(this.contestApiUrl, { timeout: 5000 });
      return response.data?.status === 'OK';
    } catch {
      return false;
    }
  }
}
