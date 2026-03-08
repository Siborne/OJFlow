const axios = require('axios');
const cheerio = require('cheerio');

class SolvedNumService {
  constructor() {
    this.dio = axios.create();
  }

  async getCodeforcesSolvedNum(name) {
    // Using ojhunt API as per original code
    const url = `https://ojhunt.com/api/crawlers/codeforces/${name}`;
    const response = await this.dio.get(url);
    return { name, solvedNum: response.data.data.solved };
  }

  async getLeetCodeSolvedNum(name) {
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
      operationName: "userProfileUserQuestionProgressV2"
    };
    const response = await this.dio.post(url, data);
    const infor = response.data.data.userProfileUserQuestionProgressV2.numAcceptedQuestions;
    const totalSolvedNum = infor.reduce((acc, curr) => acc + curr.count, 0);
    return { name, solvedNum: totalSolvedNum };
  }

  async getVJudgeSolvedNum(name) {
    const url = `https://vjudge.net/user/${name}`;
    const response = await this.dio.get(url);
    const $ = cheerio.load(response.data);
    const solvedNum = parseInt($('.table.table-reflow.problem-solve tbody tr').eq(3).find('a').text()); 
    // Note: Original code used index 4, need to verify. 
    // tr 0: 24h
    // tr 1: 7d
    // tr 2: 30d
    // tr 3: Overall?
    // Let's stick to scraping logic if possible, or try to be robust.
    // Actually the original code says `getElementsByTagName('tr')[4]`.
    // Let's try to match "Overall" row.
    let num = 0;
    $('tr').each((i, el) => {
        if ($(el).text().includes('Overall')) {
            num = parseInt($(el).find('a').first().text());
        }
    });
    return { name, solvedNum: num };
  }

  async getLuoguSolvedNum(name) {
    const searchUrl = `https://www.luogu.com.cn/api/user/search?keyword=${name}`;
    const response = await this.dio.get(searchUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    if (response.data.users && response.data.users.length > 0) {
        const userId = response.data.users[0].uid;
        const userUrl = `https://www.luogu.com.cn/user/${userId}`;
        const res = await this.dio.get(userUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        // The original code parses HTML/String response looking for "passedProblemCount".
        // It seems the user page might be HTML but contains JSON data in a script or just data attributes.
        // Actually, if it's a direct page load, it might be HTML.
        // But if headers are set, maybe it returns JSON?
        // Let's assume the original logic: finding `passedProblemCount` in the string.
        const text = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
        const match = text.match(/passedProblemCount["']?:(\d+)/);
        if (match) {
            return { name, solvedNum: parseInt(match[1]) };
        }
    }
    return { name, solvedNum: 0 };
  }

  async getAtCoderSolvedNum(name) {
    const url = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user=${name}`;
    const response = await this.dio.get(url);
    return { name, solvedNum: response.data.count };
  }

  async getHduSolvedNum(name) {
    const url = `https://ojhunt.com/api/crawlers/hdu/${name}`;
    const response = await this.dio.get(url);
    return { name, solvedNum: response.data.data.solved };
  }

  async getPojSolvedNum(name) {
    const url = `https://ojhunt.com/api/crawlers/poj/${name}`;
    const response = await this.dio.get(url);
    return { name, solvedNum: response.data.data.solved };
  }

  async getNowcoderSolvedNum(name) {
    const url = `https://ojhunt.com/api/crawlers/nowcoder/${name}`;
    const response = await this.dio.get(url);
    return { name, solvedNum: response.data.data.solved };
  }
  
  async getQOJSolvedNum(name) {
    const url = `https://qoj.ac/user/profile/${name}`;
    const response = await this.dio.get(url);
    const htmlContent = response.data;
    const match = htmlContent.match(/Accepted problems：(\d+) problems/);
    if (match) {
        return { name, solvedNum: parseInt(match[1]) };
    }
    return { name, solvedNum: 0 };
  }

  async getSolvedNum(platform, name) {
    try {
        switch (platform) {
          case 'Codeforces': return await this.getCodeforcesSolvedNum(name);
          case '力扣': return await this.getLeetCodeSolvedNum(name);
          case 'VJudge': return await this.getVJudgeSolvedNum(name);
          case '洛谷': return await this.getLuoguSolvedNum(name);
          case 'AtCoder': return await this.getAtCoderSolvedNum(name);
          case 'HDU': return await this.getHduSolvedNum(name);
          case 'POJ': return await this.getPojSolvedNum(name);
          case '牛客': return await this.getNowcoderSolvedNum(name);
          case 'QOJ': return await this.getQOJSolvedNum(name);
          default: return { name, solvedNum: 0 };
        }
    } catch (e) {
        console.error(`Error getting solved num for ${platform}:`, e);
        throw e;
    }
  }
}

module.exports = new SolvedNumService();
