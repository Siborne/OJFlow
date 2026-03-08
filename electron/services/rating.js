const axios = require('axios');
const cheerio = require('cheerio');

class RatingService {
  constructor() {
    this.dio = axios.create();
  }

  async getCodeforcesRating(name) {
    const url = `https://codeforces.com/api/user.info?handles=${name}&checkHistoricHandles=false`;
    try {
      const response = await this.dio.get(url);
      if (response.status === 200) {
        const result = response.data.result[0];
        return {
          name: name,
          curRating: result.rating,
          maxRating: result.maxRating
        };
      }
    } catch (e) {
      console.error('CF Rating Error:', e);
      throw e;
    }
  }

  async getAtCoderRating(name) {
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
                name: name,
                curRating: isNaN(curRating) ? 0 : curRating,
                maxRating: isNaN(maxRating) ? 0 : maxRating
            };
        }
      }
    } catch (e) {
      console.error('AtCoder Rating Error:', e);
      throw e;
    }
  }

  async getLeetCodeRating(name) {
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
      operationName: "userContestRankingInfo"
    };

    try {
      const response = await this.dio.post(url, data);
      if (response.status === 200) {
        const ratingList = response.data.data.userContestRankingHistory;
        if (!ratingList || ratingList.length === 0) return { name, curRating: 0, maxRating: 0 };
        
        let maxRating = 0;
        let curRating = 0;
        
        // Find last attended
        const attended = ratingList.filter(r => r.attended);
        if (attended.length > 0) {
            curRating = attended[attended.length - 1].rating;
            maxRating = Math.max(...attended.map(r => r.rating));
        }

        return {
          name,
          curRating: Math.round(curRating),
          maxRating: Math.round(maxRating)
        };
      }
    } catch (e) {
      console.error('LeetCode Rating Error:', e);
      throw e;
    }
  }

  async getLuoguRating(name) {
    const baseUrl = `https://www.luogu.com.cn/api/user/search?keyword=${name}`;
    try {
      const response = await this.dio.get(baseUrl, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      if (response.status === 200 && response.data.users && response.data.users.length > 0) {
        const userId = response.data.users[0].uid;
        const url = `https://www.luogu.com.cn/api/rating/elo?user=${userId}&page=1&limit=100`;
        
        const ratingResponse = await this.dio.get(url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (ratingResponse.status === 200) {
            const records = ratingResponse.data.records.result;
            if (records.length > 0) {
                const curRating = records[0].rating;
                const maxRating = Math.max(...records.map(r => r.rating));
                return { name, curRating, maxRating };
            }
        }
      }
    } catch (e) {
      console.error('Luogu Rating Error:', e);
      throw e;
    }
    return { name, curRating: 0, maxRating: 0 };
  }

  async getNowcoderRating(name) {
    const url = `https://ac.nowcoder.com/acm/contest/rating-history?uid=${name}`;
    try {
      const response = await this.dio.get(url);
      if (response.status === 200) {
        const rateHistory = response.data.data;
        if (rateHistory && rateHistory.length > 0) {
            const curRating = rateHistory[rateHistory.length - 1].rating;
            const maxRating = Math.max(...rateHistory.map(r => r.rating));
            return { name, curRating, maxRating };
        }
      }
    } catch (e) {
      console.error('Nowcoder Rating Error:', e);
      throw e;
    }
    return { name, curRating: 0, maxRating: 0 };
  }

  async getRating(platform, name) {
    switch (platform) {
      case 'Codeforces': return this.getCodeforcesRating(name);
      case 'AtCoder': return this.getAtCoderRating(name);
      case '力扣': return this.getLeetCodeRating(name);
      case '洛谷': return this.getLuoguRating(name);
      case '牛客': return this.getNowcoderRating(name);
      default: throw new Error('Unknown platform');
    }
  }
}

module.exports = new RatingService();
