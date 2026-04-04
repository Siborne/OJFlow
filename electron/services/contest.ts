import axios from 'axios';
import * as cheerio from 'cheerio';
import type { RawContest } from '../../shared/types';

interface AppConfig {
  crawl: { defaultDays: number; minDays: number; maxDays: number };
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const appConfig: AppConfig = require('../app.config.json');

class RecentContestService {
  private _leetcodeUrl = 'https://leetcode.cn/graphql';
  private _atcoderUrl = 'https://atcoder.jp/contests/';
  private _codeforcesUrl = 'https://codeforces.com/api/contest.list?gym=false';
  private _luoguUrl = 'https://www.luogu.com.cn/contest/list?page=1&_contentOnly=1';
  private _lanqiaoUrl =
    'https://www.lanqiao.cn/api/v2/contests/?sort=opentime&paginate=0&status=not_finished&game_type_code=2';
  private _nowcoderUrl = 'https://ac.nowcoder.com/acm/contest/vip-index';

  private _defaultDays: number;
  private _queryEndSeconds: number;

  constructor() {
    this._defaultDays = appConfig?.crawl?.defaultDays ?? 7;
    this._queryEndSeconds = this._defaultDays * 24 * 60 * 60;
  }

  setDay(day: number): void {
    const n = Number(day);
    const d = Number.isFinite(n) ? n : this._defaultDays;
    this._queryEndSeconds = d * 24 * 60 * 60;
  }

  private _isIntime(startTime = 0, duration = 0): 0 | 1 | 2 {
    const endTime = startTime + duration;
    const now = new Date();
    const ms = Math.floor(now.getTime() / 1000) - now.getHours() * 3600;

    if (startTime > this._queryEndSeconds + ms || duration >= 24 * 60 * 60) {
      return 1; // Too late or too long
    } else if (endTime < ms) {
      return 2; // Already finished
    }
    return 0;
  }

  async getLeetcodeContests(): Promise<RawContest[]> {
    try {
      const response = await axios.post(this._leetcodeUrl, {
        query: `
          {
            contestUpcomingContests {
              title
              startTime
              duration
              titleSlug
            }
          }
        `,
      });

      if (response.status === 200) {
        const contestList = response.data.data.contestUpcomingContests;
        const contests: RawContest[] = [];
        for (let i = 0; i < Math.min(2, contestList.length); i++) {
          const item = contestList[i];
          const name: string = item.title;
          const startTime: number = item.startTime;
          const duration: number = item.duration;
          const link = `https://leetcode.cn/contest/${item.titleSlug}`;

          const status = this._isIntime(startTime, duration);
          if (status === 1) continue;
          if (status === 2) break;

          contests.push({ name, startTime, duration, platform: '\u529b\u6263', link });
        }
        return contests;
      }
    } catch (e) {
      console.error('LeetCode Error:', e);
    }
    return [];
  }

  async getCodeforcesContests(): Promise<RawContest[]> {
    try {
      const response = await axios.get(this._codeforcesUrl);
      if (response.status === 200) {
        const contests: RawContest[] = [];
        const contestList = response.data.result;
        contestList.sort(
          (a: { startTimeSeconds: number }, b: { startTimeSeconds: number }) =>
            b.startTimeSeconds - a.startTimeSeconds,
        );

        for (const item of contestList) {
          const startTime: number = item.startTimeSeconds;
          const duration: number = item.durationSeconds;

          const status = this._isIntime(startTime, duration);
          if (status === 1) continue;
          if (status === 2) break;

          contests.push({
            name: item.name,
            startTime,
            duration,
            platform: 'Codeforces',
            link: 'https://codeforces.com/contests',
          });
        }
        return contests;
      }
    } catch (e) {
      console.error('Codeforces Error:', e);
    }
    return [];
  }

  async getNowcoderContests(): Promise<RawContest[]> {
    try {
      const response = await axios.get(this._nowcoderUrl);
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const contests: RawContest[] = [];
        $('.platform-item-main').each((_i, el) => {
          const title = $(el).find('a').first().text();
          const link = `https://ac.nowcoder.com${$(el).find('a').first().attr('href')}`;
          const timeText = $(el).find('.match-time-icon').first().text();

          const timeRegExp = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/g;
          const matches = timeText.match(timeRegExp);

          if (matches && matches.length >= 2) {
            const startTimeStr = matches[0];
            const endTimeStr = matches[1];

            const startTime = Math.floor(new Date(startTimeStr).getTime() / 1000);
            const endTime = Math.floor(new Date(endTimeStr).getTime() / 1000);
            const duration = endTime - startTime;

            const status = this._isIntime(startTime, duration);
            if (status !== 1 && status !== 2) {
              contests.push({ name: title, startTime, duration, platform: '\u725b\u5ba2', link });
            }
          }
        });
        return contests;
      }
    } catch (e) {
      console.error('Nowcoder Error:', e);
    }
    return [];
  }

  async getAtCoderContests(): Promise<RawContest[]> {
    try {
      const response = await axios.get(this._atcoderUrl);
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const contests: RawContest[] = [];
        const rows = $('#contest-table-upcoming tbody tr');

        rows.each((_i, el) => {
          const cols = $(el).find('td');
          if (cols.length > 0) {
            const timeText = $(cols[0]).find('a').text();
            const titleLink = $(cols[1]).find('a');
            const title = titleLink.text();
            const link = `https://atcoder.jp${titleLink.attr('href')}`;
            const durationText = $(cols[2]).text();

            const startTime = Math.floor(new Date(timeText).getTime() / 1000);

            const [h, m] = durationText.split(':').map(Number);
            const duration = h * 3600 + m * 60;

            const name = title.includes('\uff08')
              ? title.split('\uff08')[1].split('\uff09')[0]
              : title;

            const status = this._isIntime(startTime, duration);
            if (status !== 1 && status !== 2) {
              contests.push({ name, startTime, duration, platform: 'AtCoder', link });
            }
          }
        });
        return contests;
      }
    } catch (e) {
      console.error('AtCoder Error:', e);
    }
    return [];
  }

  async getLuoguContests(isRated = true): Promise<RawContest[]> {
    try {
      const response = await axios.get(this._luoguUrl, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (response.status === 200) {
        const contests: RawContest[] = [];
        let contestList: any[];

        // Luogu now returns HTML with embedded JSON in <script type="application/json">
        const raw = response.data;
        if (typeof raw === 'object' && raw?.currentData?.contests?.result) {
          // Legacy pure-JSON response (kept for backward compatibility)
          contestList = raw.currentData.contests.result;
        } else {
          const html = typeof raw === 'string' ? raw : JSON.stringify(raw);
          const $ = cheerio.load(html);
          const jsonScript = $('script[type="application/json"]').first().html();
          if (!jsonScript) {
            console.warn('Luogu: no embedded JSON found');
            return [];
          }
          const parsed = JSON.parse(jsonScript);
          contestList = parsed?.data?.contests?.result;
          if (!Array.isArray(contestList)) {
            console.warn('Luogu: unexpected data structure');
            return [];
          }
        }

        for (const item of contestList) {
          // rated field changed from boolean to number: 0 = unrated, >0 = rated
          if (!item.rated && isRated) continue;

          const name: string = item.name;
          const link = `https://www.luogu.com.cn/contest/${item.id}`;
          const startTime: number = item.startTime;
          const duration: number = item.endTime - startTime;

          const status = this._isIntime(startTime, duration);
          if (status === 1) continue;
          if (status === 2) break;

          contests.push({ name, startTime, duration, platform: '\u6d1b\u8c37', link });
        }
        return contests;
      }
    } catch (e) {
      console.error('Luogu Error:', e);
    }
    return [];
  }

  async getLanqiaoContests(): Promise<RawContest[]> {
    try {
      const response = await axios.get(this._lanqiaoUrl);
      if (response.status === 200) {
        const contests: RawContest[] = [];
        for (const item of response.data) {
          const name: string = item.name;
          const link = `https://www.lanqiao.cn${item.html_url}`;
          const startTime = Math.floor(new Date(item.open_at).getTime() / 1000);
          const endTime = Math.floor(new Date(item.end_at).getTime() / 1000);
          const duration = endTime - startTime;

          const status = this._isIntime(startTime, duration);
          if (status === 1) continue;
          if (status === 2) break;

          contests.push({ name, startTime, duration, platform: '\u84dd\u6865\u4e91\u8bfe', link });
        }
        return contests;
      }
    } catch (e) {
      console.error('Lanqiao Error:', e);
    }
    return [];
  }

  async getAllContests(day: number): Promise<RawContest[]> {
    this.setDay(day);
    const results = await Promise.all([
      this.getLeetcodeContests(),
      this.getCodeforcesContests(),
      this.getNowcoderContests(),
      this.getAtCoderContests(),
      this.getLuoguContests(),
      this.getLanqiaoContests(),
    ]);
    return results.flat();
  }
}

export default new RecentContestService();
