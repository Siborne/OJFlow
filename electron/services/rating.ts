import axios, { type AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import type { Rating } from '../../shared/types';

class RatingService {
  private dio: AxiosInstance;

  constructor() {
    this.dio = axios.create();
  }

  async getCodeforcesRating(name: string): Promise<Rating> {
    const url = `https://codeforces.com/api/user.info?handles=${name}&checkHistoricHandles=false`;
    try {
      const response = await this.dio.get(url);
      if (response.status === 200) {
        const result = response.data.result[0];
        return {
          name,
          curRating: result.rating,
          maxRating: result.maxRating,
        };
      }
    } catch (e) {
      console.error('CF Rating Error:', e);
      throw e;
    }
    return { name, curRating: 0, maxRating: 0 };
  }

  async getAtCoderRating(name: string): Promise<Rating> {
    const url = `https://atcoder.jp/users/${name}`;
    try {
      const response = await this.dio.get(url);
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const rows = $('.dl-table.mt-2').first().find('tr');
        if (rows.length >= 3) {
          const curRating = parseInt($(rows[1]).find('span').first().text());
          const maxRating = parseInt($(rows[2]).find('span').first().text());
          return {
            name,
            curRating: isNaN(curRating) ? 0 : curRating,
            maxRating: isNaN(maxRating) ? 0 : maxRating,
          };
        }
      }
    } catch (e) {
      console.error('AtCoder Rating Error:', e);
      throw e;
    }
    return { name, curRating: 0, maxRating: 0 };
  }

  async getLeetCodeRating(name: string): Promise<Rating> {
    const url = 'https://leetcode.cn/graphql/noj-go/';
    const data = {
      query: `
      query userContestRankingInfo($userSlug: String!) {
        userContestRankingHistory(userSlug: $userSlug) {
          attended
          rating
          ranking
          contest{
            title
            startTime
          }
        }
      }
      `,
      variables: { userSlug: name },
      operationName: 'userContestRankingInfo',
    };

    try {
      const response = await this.dio.post(url, data);
      if (response.status === 200) {
        const ratingList = response.data.data.userContestRankingHistory;
        if (!ratingList || ratingList.length === 0) return { name, curRating: 0, maxRating: 0 };

        let maxRating = 0;
        let curRating = 0;

        const attended = ratingList.filter((r: { attended: boolean }) => r.attended);
        if (attended.length > 0) {
          curRating = attended[attended.length - 1].rating;
          maxRating = Math.max(...attended.map((r: { rating: number }) => r.rating));
        }

        return {
          name,
          curRating: Math.round(curRating),
          maxRating: Math.round(maxRating),
        };
      }
    } catch (e) {
      console.error('LeetCode Rating Error:', e);
      throw e;
    }
    return { name, curRating: 0, maxRating: 0 };
  }

  async getLuoguRating(name: string): Promise<Rating> {
    const baseUrl = `https://www.luogu.com.cn/api/user/search?keyword=${name}`;
    try {
      const response = await this.dio.get(baseUrl, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (response.status === 200 && response.data.users && response.data.users.length > 0) {
        const userId = response.data.users[0].uid;

        // Try to get rating from the user page embedded JSON
        const userPageRes = await this.dio.get(
          `https://www.luogu.com.cn/user/${userId}`,
          { maxRedirects: 3, timeout: 8000 },
        );
        const html =
          typeof userPageRes.data === 'string'
            ? userPageRes.data
            : JSON.stringify(userPageRes.data);

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cheerio = require('cheerio');
        const $ = cheerio.load(html);
        const jsonScript = $('script[type="application/json"]').first().html();
        if (jsonScript) {
          const parsed = JSON.parse(jsonScript);
          const ratingData = parsed?.data?.user?.rating;
          if (typeof ratingData === 'number') {
            return { name, curRating: ratingData, maxRating: ratingData };
          }
        }
      }
    } catch (e) {
      console.error('Luogu Rating Error:', e);
      throw e;
    }
    return { name, curRating: 0, maxRating: 0 };
  }

  async getNowcoderRating(name: string): Promise<Rating> {
    const url = `https://ac.nowcoder.com/acm/contest/rating-history?uid=${name}`;
    try {
      const response = await this.dio.get(url);
      if (response.status === 200) {
        const rateHistory = response.data.data;
        if (rateHistory && rateHistory.length > 0) {
          const curRating: number = rateHistory[rateHistory.length - 1].rating;
          const maxRating = Math.max(
            ...rateHistory.map((r: { rating: number }) => r.rating),
          );
          return { name, curRating, maxRating };
        }
      }
    } catch (e) {
      console.error('Nowcoder Rating Error:', e);
      throw e;
    }
    return { name, curRating: 0, maxRating: 0 };
  }

  async getRating(platform: string, name: string): Promise<Rating> {
    switch (platform) {
      case 'Codeforces':
        return this.getCodeforcesRating(name);
      case 'AtCoder':
        return this.getAtCoderRating(name);
      case '\u529b\u6263':
        return this.getLeetCodeRating(name);
      case '\u6d1b\u8c37':
        return this.getLuoguRating(name);
      case '\u725b\u5ba2':
        return this.getNowcoderRating(name);
      default:
        throw new Error('Unknown platform');
    }
  }
}

export default new RatingService();
