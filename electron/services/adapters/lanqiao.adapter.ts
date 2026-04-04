import { BaseAdapter } from './base-adapter';
import type { RawContest } from '../../../shared/types';

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
}
