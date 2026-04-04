import axios, { type AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import type { SolvedNum } from '../../shared/types';

class SolvedNumService {
  private dio: AxiosInstance;

  constructor() {
    this.dio = axios.create();
    this.dio.defaults.headers.common['User-Agent'] =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  async getCodeforcesSolvedNum(name: string): Promise<SolvedNum> {
    const url = `https://ojhunt.com/api/crawlers/codeforces/${name}`;
    const response = await this.dio.get(url);
    if (response.data && response.data.data) {
      return { name, solvedNum: response.data.data.solved };
    }
    throw new Error('Codeforces API response invalid');
  }

  async getLeetCodeSolvedNum(name: string): Promise<SolvedNum> {
    const url = 'https://leetcode.cn/graphql/';
    const data = {
      query: `
      query userProfileUserQuestionProgressV2($userSlug: String!) {
        userProfileUserQuestionProgressV2(userSlug: $userSlug) {
          numAcceptedQuestions{
            count
          }
        }
      }
      `,
      variables: { userSlug: name },
      operationName: 'userProfileUserQuestionProgressV2',
    };
    const response = await this.dio.post(url, data);
    if (
      response.data &&
      response.data.data &&
      response.data.data.userProfileUserQuestionProgressV2
    ) {
      const infor =
        response.data.data.userProfileUserQuestionProgressV2.numAcceptedQuestions;
      const totalSolvedNum = infor.reduce(
        (acc: number, curr: { count: number }) => acc + curr.count,
        0,
      );
      return { name, solvedNum: totalSolvedNum };
    }
    throw new Error('LeetCode API response invalid');
  }

  async getVJudgeSolvedNum(name: string): Promise<SolvedNum> {
    const url = `https://vjudge.net/user/${name}`;
    const response = await this.dio.get(url);
    const $ = cheerio.load(response.data);
    let num = 0;

    let found = false;
    $('tr').each((_i, el) => {
      if ($(el).text().includes('Overall')) {
        const anchor = $(el).find('a').first();
        if (anchor.length > 0) {
          num = parseInt(anchor.text().trim(), 10);
          found = true;
          return false; // break loop
        }
      }
    });

    if (!found) {
      const rows = $('.table.table-reflow.problem-solve tbody tr');
      if (rows.length >= 4) {
        const row = rows.eq(3);
        const anchor = row.find('a').first();
        if (anchor.length > 0) {
          num = parseInt(anchor.text().trim(), 10);
        }
      }
    }

    return { name, solvedNum: isNaN(num) ? 0 : num };
  }

  async getLuoguSolvedNum(name: string): Promise<SolvedNum> {
    const searchUrl = `https://www.luogu.com.cn/api/user/search?keyword=${name}`;
    const searchRes = await this.dio.get(searchUrl, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });

    if (searchRes.data && searchRes.data.users && searchRes.data.users.length > 0) {
      const userId = searchRes.data.users[0].uid;

      // Try to get solved count from user page embedded JSON
      const userUrl = `https://www.luogu.com.cn/user/${userId}`;
      const userRes = await this.dio.get(userUrl, {
        maxRedirects: 3,
        timeout: 8000,
      });

      const html =
        typeof userRes.data === 'string'
          ? userRes.data
          : JSON.stringify(userRes.data);

      const $ = cheerio.load(html);
      const jsonScript = $('script[type="application/json"]').first().html();
      if (jsonScript) {
        const parsed = JSON.parse(jsonScript);
        const passedCount = parsed?.data?.user?.passedProblemCount;
        if (typeof passedCount === 'number') {
          return { name, solvedNum: passedCount };
        }
      }

      // Fallback: try regex match in raw HTML
      const match = html.match(/passedProblemCount["']?\s*[:=]\s*(\d+)/);
      if (match) {
        return { name, solvedNum: parseInt(match[1], 10) };
      }

      return { name, solvedNum: 0 };
    }
    return { name, solvedNum: 0 };
  }

  async getAtCoderSolvedNum(name: string): Promise<SolvedNum> {
    const url = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user=${name}`;
    const response = await this.dio.get(url);
    return { name, solvedNum: response.data.count };
  }

  async getHduSolvedNum(name: string): Promise<SolvedNum> {
    const url = `https://ojhunt.com/api/crawlers/hdu/${name}`;
    const response = await this.dio.get(url);
    if (response.data && response.data.data) {
      return { name, solvedNum: response.data.data.solved };
    }
    throw new Error('HDU API response invalid');
  }

  async getPojSolvedNum(name: string): Promise<SolvedNum> {
    const url = `https://ojhunt.com/api/crawlers/poj/${name}`;
    const response = await this.dio.get(url);
    if (response.data && response.data.data) {
      return { name, solvedNum: response.data.data.solved };
    }
    throw new Error('POJ API response invalid');
  }

  async getNowcoderSolvedNum(name: string): Promise<SolvedNum> {
    const url = `https://ojhunt.com/api/crawlers/nowcoder/${name}`;
    const response = await this.dio.get(url);
    if (response.data && response.data.data) {
      return { name, solvedNum: response.data.data.solved };
    }
    throw new Error('Nowcoder API response invalid');
  }

  async getQOJSolvedNum(name: string): Promise<SolvedNum> {
    const url = `https://qoj.ac/user/profile/${name}`;
    const response = await this.dio.get(url);
    const htmlContent: string = response.data;
    const match = htmlContent.match(/Accepted problems\uff1a(\d+) problems/);
    if (match) {
      return { name, solvedNum: parseInt(match[1], 10) };
    }
    return { name, solvedNum: 0 };
  }

  async getSolvedNum(platform: string, name: string): Promise<SolvedNum> {
    try {
      switch (platform) {
        case 'Codeforces':
          return await this.getCodeforcesSolvedNum(name);
        case '\u529b\u6263':
          return await this.getLeetCodeSolvedNum(name);
        case 'VJudge':
          return await this.getVJudgeSolvedNum(name);
        case '\u6d1b\u8c37':
          return await this.getLuoguSolvedNum(name);
        case 'AtCoder':
          return await this.getAtCoderSolvedNum(name);
        case 'HDU':
          return await this.getHduSolvedNum(name);
        case 'POJ':
          return await this.getPojSolvedNum(name);
        case '\u725b\u5ba2':
          return await this.getNowcoderSolvedNum(name);
        case 'QOJ':
          return await this.getQOJSolvedNum(name);
        default:
          return { name, solvedNum: 0 };
      }
    } catch (e) {
      console.error(`Error getting solved num for ${platform}:`, e);
      throw e;
    }
  }
}

export default new SolvedNumService();
