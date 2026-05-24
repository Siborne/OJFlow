import { BaseAdapter } from './base-adapter';
import type { RawContest, SolvedNum } from '../../../shared/types';

export class LanqiaoAdapter extends BaseAdapter {
  readonly id = 'lanqiao';
  readonly displayName = '\u84dd\u6865\u4e91\u8bfe';

  private readonly contestUrl =
    'https://www.lanqiao.cn/api/v2/contests/?sort=opentime&paginate=0&status=not_finished&game_type_code=2';

  async fetchContests(days: number): Promise<RawContest[]> {
    const response = await this.http.get(this.contestUrl);

    if (response.status !== 200 || !Array.isArray(response.data)) {
      throw new Error('Lanqiao API response invalid');
    }

    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400) - new Date().getTimezoneOffset() * 60;
    const queryEnd = todayStart + days * 86400;
    const contests: RawContest[] = [];

    for (const item of response.data) {
      const startTime = Math.floor(new Date(item.open_at).getTime() / 1000);
      const endTime = Math.floor(new Date(item.end_at).getTime() / 1000);
      const duration = endTime - startTime;

      if (startTime > queryEnd || duration >= 86400) continue;
      if (endTime < todayStart) continue;

      contests.push({
        name: item.name,
        startTime,
        duration,
        platform: this.displayName,
        link: `https://www.lanqiao.cn${item.html_url}`,
      });
    }

    return contests;
  }

  async fetchSolvedCount(handle: string): Promise<SolvedNum> {
    // Verify user exists first
    const userUrl = `https://www.lanqiao.cn/users/${encodeURIComponent(handle)}/`;
    const userRes = await this.http.get(userUrl, { validateStatus: () => true });
    if (userRes.status !== 200) {
      throw new Error(`Lanqiao user not found: ${handle}`);
    }

    // Search through paginated problem-rank API to find user
    for (let page = 1; page <= 50; page++) {
      try {
        const url = `https://www.lanqiao.cn/api/v2/user/prepare-match/problem-rank/?page_size=100&page=${page}`;
        const res = await this.http.get(url);
        if (res.status !== 200 || !Array.isArray(res.data?.data)) break;

        for (const item of res.data.data) {
          if (String(item.user_id) === handle && typeof item.problem_count === 'number') {
            return { name: handle, solvedNum: item.problem_count };
          }
        }

        if (res.data.data.length < 100) break; // last page
      } catch {
        break;
      }
    }

    throw new Error(`Lanqiao: user ${handle} not found in problem-rank`);
  }
}
