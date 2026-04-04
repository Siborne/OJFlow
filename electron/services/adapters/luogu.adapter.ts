import { BaseAdapter } from './base-adapter';
import type { RawContest, Rating, SolvedNum } from '../../../shared/types';

export class LuoguAdapter extends BaseAdapter {
  readonly id = 'luogu';
  readonly displayName = '\u6d1b\u8c37';

  private readonly contestUrl =
    'https://www.luogu.com.cn/contest/list?page=1&_contentOnly=1';
  private readonly searchUrl = 'https://www.luogu.com.cn/api/user/search';

  constructor() {
    super({ timeoutMs: 12_000 });
  }

  async fetchContests(days: number): Promise<RawContest[]> {
    const response = await this.http.get(this.contestUrl, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (response.status !== 200) {
      throw new Error(`Luogu returned ${response.status}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let contestList: any[];

    const raw = response.data;
    if (typeof raw === 'object' && raw?.currentData?.contests?.result) {
      contestList = raw.currentData.contests.result;
    } else {
      const html = typeof raw === 'string' ? raw : JSON.stringify(raw);
      const $ = this.parseHtml(html);
      const jsonScript = $('script[type="application/json"]').first().html();
      if (!jsonScript) {
        throw new Error('Luogu: no embedded JSON found');
      }
      const parsed = JSON.parse(jsonScript);
      contestList = parsed?.data?.contests?.result;
      if (!Array.isArray(contestList)) {
        throw new Error('Luogu: unexpected data structure');
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400) - new Date().getTimezoneOffset() * 60;
    const queryEnd = todayStart + days * 86400;
    const contests: RawContest[] = [];

    for (const item of contestList) {
      if (!item.rated) continue;

      const startTime: number = item.startTime;
      const duration: number = item.endTime - startTime;
      const endTime = startTime + duration;

      if (startTime > queryEnd || duration >= 86400) continue;
      if (endTime < todayStart) continue;

      contests.push({
        name: item.name,
        startTime,
        duration,
        platform: this.displayName,
        link: `https://www.luogu.com.cn/contest/${item.id}`,
      });
    }

    return contests;
  }

  async fetchRating(handle: string): Promise<Rating> {
    const searchRes = await this.http.get(
      `${this.searchUrl}?keyword=${encodeURIComponent(handle)}`,
      { headers: { 'X-Requested-With': 'XMLHttpRequest' } },
    );

    if (!searchRes.data?.users?.length) {
      throw new Error('User not found');
    }

    const userId = searchRes.data.users[0].uid;
    const userPageRes = await this.http.get(
      `https://www.luogu.com.cn/user/${userId}`,
      { maxRedirects: 3, timeout: 8000 },
    );

    const html =
      typeof userPageRes.data === 'string'
        ? userPageRes.data
        : JSON.stringify(userPageRes.data);

    const $ = this.parseHtml(html);
    const jsonScript = $('script[type="application/json"]').first().html();
    if (jsonScript) {
      const parsed = JSON.parse(jsonScript);
      const ratingData = parsed?.data?.user?.rating;
      if (typeof ratingData === 'number') {
        return { name: handle, curRating: ratingData, maxRating: ratingData };
      }
    }

    return { name: handle, curRating: 0, maxRating: 0 };
  }

  async fetchSolvedCount(handle: string): Promise<SolvedNum> {
    const searchRes = await this.http.get(
      `${this.searchUrl}?keyword=${encodeURIComponent(handle)}`,
      { headers: { 'X-Requested-With': 'XMLHttpRequest' } },
    );

    if (!searchRes.data?.users?.length) {
      return { name: handle, solvedNum: 0 };
    }

    const userId = searchRes.data.users[0].uid;
    const userRes = await this.http.get(
      `https://www.luogu.com.cn/user/${userId}`,
      { maxRedirects: 3, timeout: 8000 },
    );

    const html =
      typeof userRes.data === 'string'
        ? userRes.data
        : JSON.stringify(userRes.data);

    const $ = this.parseHtml(html);
    const jsonScript = $('script[type="application/json"]').first().html();
    if (jsonScript) {
      const parsed = JSON.parse(jsonScript);
      const passedCount = parsed?.data?.user?.passedProblemCount;
      if (typeof passedCount === 'number') {
        return { name: handle, solvedNum: passedCount };
      }
    }

    // Regex fallback
    const match = html.match(/passedProblemCount["']?\s*[:=]\s*(\d+)/);
    if (match) {
      return { name: handle, solvedNum: parseInt(match[1], 10) };
    }

    return { name: handle, solvedNum: 0 };
  }
}
