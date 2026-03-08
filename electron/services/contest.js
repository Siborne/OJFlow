const axios = require('axios');
const cheerio = require('cheerio');
const { app } = require('electron');

class RecentContestService {
  constructor() {
    this._leetcodeUrl = "https://leetcode.cn/graphql";
    this._atcoderUrl = "https://atcoder.jp/contests/";
    this._codeforcesUrl = "https://codeforces.com/api/contest.list?gym=false";
    this._luoguUrl = "https://www.luogu.com.cn/contest/list?page=1&_contentOnly=1";
    this._lanqiaoUrl = "https://www.lanqiao.cn/api/v2/contests/?sort=opentime&paginate=0&status=not_finished&game_type_code=2";
    this._nowcoderUrl = "https://ac.nowcoder.com/acm/contest/vip-index";
    
    this._queryEndSeconds = 7 * 24 * 60 * 60; // 7 days
    this.midnightSeconds = Math.floor(Date.now() / 1000) - new Date().getHours() * 3600 - new Date().getMinutes() * 60 - new Date().getSeconds();
  }

  setDay(day) {
    this._queryEndSeconds = day * 24 * 60 * 60;
  }

  _isIntime(startTime = 0, duration = 0) {
    const endTime = startTime + duration;
    // midnightSeconds is roughly start of today (00:00). Actually logic in Dart was:
    // midnightSeconds = now - hour*3600. It ignores minutes/seconds which is weird but okay.
    // Let's stick to Dart logic:
    const now = new Date();
    const ms = Math.floor(now.getTime() / 1000) - now.getHours() * 3600; 
    
    if (startTime > this._queryEndSeconds + ms || duration >= 24 * 60 * 60) {
      return 1; // Too late or too long
    } else if (endTime < ms) {
      return 2; // Too early (already finished before today)
    }
    return 0;
  }

  async getLeetcodeContests() {
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
        `
      });

      if (response.status === 200) {
        const contestList = response.data.data.contestUpcomingContests;
        const contests = [];
        for (let i = 0; i < Math.min(2, contestList.length); i++) {
          const item = contestList[i];
          const name = item.title;
          const startTime = item.startTime;
          const duration = item.duration;
          const link = `https://leetcode.cn/contest/${item.titleSlug}`;
          
          const status = this._isIntime(startTime, duration);
          if (status === 1) continue;
          if (status === 2) break;

          contests.push({
            name,
            startTime,
            duration,
            platform: "力扣",
            link
          });
        }
        return contests;
      }
    } catch (e) {
      console.error('LeetCode Error:', e);
    }
    return [];
  }

  async getCodeforcesContests() {
    try {
      const response = await axios.get(this._codeforcesUrl);
      if (response.status === 200) {
        const contests = [];
        const contestList = response.data.result;
        contestList.sort((a, b) => b.startTimeSeconds - a.startTimeSeconds);

        for (const item of contestList) {
          const startTime = item.startTimeSeconds;
          const duration = item.durationSeconds;
          
          const status = this._isIntime(startTime, duration);
          if (status === 1) continue;
          if (status === 2) break;

          contests.push({
            name: item.name,
            startTime,
            duration,
            platform: 'Codeforces',
            link: 'https://codeforces.com/contests'
          });
        }
        return contests;
      }
    } catch (e) {
      console.error('Codeforces Error:', e);
    }
    return [];
  }

  async getNowcoderContests() {
    try {
      const response = await axios.get(this._nowcoderUrl);
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const contests = [];
        $('.platform-item-main').each((i, el) => {
          const title = $(el).find('a').first().text();
          const link = `https://ac.nowcoder.com${$(el).find('a').first().attr('href')}`;
          const timeText = $(el).find('.match-time-icon').first().text();
          
          // Regex to extract times
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
               contests.push({
                name: title,
                startTime,
                duration,
                platform: '牛客',
                link
              });
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

  async getAtCoderContests() {
    try {
      const response = await axios.get(this._atcoderUrl);
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const contests = [];
        const rows = $('#contest-table-upcoming tbody tr');

        rows.each((i, el) => {
          const cols = $(el).find('td');
          if (cols.length > 0) {
            const timeText = $(cols[0]).find('a').text(); // 2024-06-29 21:00:00+0900
            const titleLink = $(cols[1]).find('a');
            const title = titleLink.text();
            const link = `https://atcoder.jp${titleLink.attr('href')}`;
            const durationText = $(cols[2]).text(); // 02:00

            // Parse time
            // timeText format: 2024-06-29 21:00:00+0900
            // JS Date can parse ISO format
            const startTime = Math.floor(new Date(timeText).getTime() / 1000);
            
            // Parse duration
            const [h, m] = durationText.split(':').map(Number);
            const duration = h * 3600 + m * 60;

            const name = title.includes('（') ? title.split('（')[1].split('）')[0] : title;

            const status = this._isIntime(startTime, duration);
            if (status !== 1 && status !== 2) {
              contests.push({
                name,
                startTime,
                duration,
                platform: 'AtCoder',
                link
              });
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

  async getLuoguContests(isRated = true) {
    try {
      const response = await axios.get(this._luoguUrl, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      if (response.status === 200) {
        const contests = [];
        const contestList = response.data.currentData.contests.result;
        
        for (const item of contestList) {
          if (item.rated === false && isRated === true) continue;
          
          const name = item.name;
          const link = `https://www.luogu.com.cn/contest/${item.id}`;
          const startTime = item.startTime;
          const duration = item.endTime - startTime;

          const status = this._isIntime(startTime, duration);
          if (status === 1) continue;
          if (status === 2) break;

          contests.push({
            name,
            startTime,
            duration,
            platform: '洛谷',
            link
          });
        }
        return contests;
      }
    } catch (e) {
      console.error('Luogu Error:', e);
    }
    return [];
  }

  async getLanqiaoContests() {
    try {
      const response = await axios.get(this._lanqiaoUrl);
      if (response.status === 200) {
        const contests = [];
        for (const item of response.data) {
          const name = item.name;
          const link = `https://www.lanqiao.cn${item.html_url}`;
          const startTime = Math.floor(new Date(item.open_at).getTime() / 1000);
          const endTime = Math.floor(new Date(item.end_at).getTime() / 1000);
          const duration = endTime - startTime;

          const status = this._isIntime(startTime, duration);
          if (status === 1) continue;
          if (status === 2) break;

          contests.push({
            name,
            startTime,
            duration,
            platform: '蓝桥云课',
            link
          });
        }
        return contests;
      }
    } catch (e) {
      console.error('Lanqiao Error:', e);
    }
    return [];
  }

  async getAllContests(day) {
    this.setDay(day);
    const promises = [
      this.getLeetcodeContests(),
      this.getCodeforcesContests(),
      this.getNowcoderContests(),
      this.getAtCoderContests(),
      this.getLuoguContests(),
      this.getLanqiaoContests()
    ];
    
    const results = await Promise.all(promises);
    return results.flat();
  }
}

module.exports = new RecentContestService();
