const axios = require('axios');
const cheerio = require('cheerio');

class SolvedNumService {
  constructor() {
    this.dio = axios.create();
    // Set a user agent to avoid being blocked by some sites
    this.dio.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  async getCodeforcesSolvedNum(name) {
    // Using ojhunt API
    const url = `https://ojhunt.com/api/crawlers/codeforces/${name}`;
    const response = await this.dio.get(url);
    if (response.data && response.data.data) {
        return { name, solvedNum: response.data.data.solved };
    }
    throw new Error('Codeforces API response invalid');
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
    if (response.data && response.data.data && response.data.data.userProfileUserQuestionProgressV2) {
        const infor = response.data.data.userProfileUserQuestionProgressV2.numAcceptedQuestions;
        const totalSolvedNum = infor.reduce((acc, curr) => acc + curr.count, 0);
        return { name, solvedNum: totalSolvedNum };
    }
    throw new Error('LeetCode API response invalid');
  }

  async getVJudgeSolvedNum(name) {
    const url = `https://vjudge.net/user/${name}`;
    const response = await this.dio.get(url);
    const $ = cheerio.load(response.data);
    let num = 0;
    
    // Try to find the "Overall" row in the stats table
    // The table usually has class 'table table-reflow problem-solve'
    // We look for a row that contains "Overall" (or "总计" if localized, but usually VJudge is English/bilingual)
    // Actually VJudge usually shows "Overall" in the first column of the 4th row (index 3) or 5th row (index 4)
    
    // Strategy 1: Find row with "Overall" text
    let found = false;
    $('tr').each((i, el) => {
        if ($(el).text().includes('Overall')) {
            const anchor = $(el).find('a').first();
            if (anchor.length > 0) {
                num = parseInt(anchor.text().trim(), 10);
                found = true;
                return false; // break loop
            }
        }
    });

    // Strategy 2: Fallback to specific index if "Overall" not found (maybe localized)
    if (!found) {
        const rows = $('.table.table-reflow.problem-solve tbody tr');
        if (rows.length >= 4) {
             // Try index 3 (4th row) or 4 (5th row)
             // Usually it's the last row or near end.
             // Let's try index 3 first as per common layout (24h, 7d, 30d, Overall)
             const row = rows.eq(3); 
             const anchor = row.find('a').first();
             if (anchor.length > 0) {
                 num = parseInt(anchor.text().trim(), 10);
             }
        }
    }
    
    return { name, solvedNum: isNaN(num) ? 0 : num };
  }

  async getLuoguSolvedNum(name) {
    // Step 1: Search for user to get UID
    const searchUrl = `https://www.luogu.com.cn/api/user/search?keyword=${name}`;
    const searchRes = await this.dio.get(searchUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    
    if (searchRes.data && searchRes.data.users && searchRes.data.users.length > 0) {
        const userId = searchRes.data.users[0].uid;
        
        // Step 2: Get user profile
        const userUrl = `https://www.luogu.com.cn/user/${userId}`;
        const userRes = await this.dio.get(userUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        
        // Luogu might return JSON or HTML depending on headers/state
        // If JSON, it's in userRes.data.currentData.user.passedProblemCount (sometimes)
        // Or we might need to regex search in the stringified response
        
        let passedCount = 0;
        
        if (typeof userRes.data === 'object') {
            // Try to find in standard JSON structure if available
            if (userRes.data.currentData && userRes.data.currentData.user) {
                passedCount = userRes.data.currentData.user.passedProblemCount;
            } else {
                // Fallback to regex on stringified JSON
                const text = JSON.stringify(userRes.data);
                const match = text.match(/passedProblemCount["']?:(\d+)/);
                if (match) passedCount = parseInt(match[1], 10);
            }
        } else {
            // It's a string (HTML or raw text)
            const text = userRes.data;
            const match = text.match(/passedProblemCount["']?:(\d+)/);
            if (match) passedCount = parseInt(match[1], 10);
        }
        
        return { name, solvedNum: passedCount || 0 };
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
    if (response.data && response.data.data) {
        return { name, solvedNum: response.data.data.solved };
    }
    throw new Error('HDU API response invalid');
  }

  async getPojSolvedNum(name) {
    const url = `https://ojhunt.com/api/crawlers/poj/${name}`;
    const response = await this.dio.get(url);
    if (response.data && response.data.data) {
        return { name, solvedNum: response.data.data.solved };
    }
    throw new Error('POJ API response invalid');
  }

  async getNowcoderSolvedNum(name) {
    const url = `https://ojhunt.com/api/crawlers/nowcoder/${name}`;
    const response = await this.dio.get(url);
    if (response.data && response.data.data) {
        return { name, solvedNum: response.data.data.solved };
    }
    throw new Error('Nowcoder API response invalid');
  }
  
  async getQOJSolvedNum(name) {
    const url = `https://qoj.ac/user/profile/${name}`;
    const response = await this.dio.get(url);
    const htmlContent = response.data;
    // Regex to match "Accepted problems：123 problems"
    // Note the Chinese colon '：'
    const match = htmlContent.match(/Accepted problems：(\d+) problems/);
    if (match) {
        return { name, solvedNum: parseInt(match[1], 10) };
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
