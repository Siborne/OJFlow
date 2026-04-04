"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const appConfig = require('../app.config.json');
class RecentContestService {
    _leetcodeUrl = 'https://leetcode.cn/graphql';
    _atcoderUrl = 'https://atcoder.jp/contests/';
    _codeforcesUrl = 'https://codeforces.com/api/contest.list?gym=false';
    _luoguUrl = 'https://www.luogu.com.cn/contest/list?page=1&_contentOnly=1';
    _lanqiaoUrl = 'https://www.lanqiao.cn/api/v2/contests/?sort=opentime&paginate=0&status=not_finished&game_type_code=2';
    _nowcoderUrl = 'https://ac.nowcoder.com/acm/contest/vip-index';
    _defaultDays;
    _queryEndSeconds;
    constructor() {
        this._defaultDays = appConfig?.crawl?.defaultDays ?? 7;
        this._queryEndSeconds = this._defaultDays * 24 * 60 * 60;
    }
    setDay(day) {
        const n = Number(day);
        const d = Number.isFinite(n) ? n : this._defaultDays;
        this._queryEndSeconds = d * 24 * 60 * 60;
    }
    _isIntime(startTime = 0, duration = 0) {
        const endTime = startTime + duration;
        const now = new Date();
        const ms = Math.floor(now.getTime() / 1000) - now.getHours() * 3600;
        if (startTime > this._queryEndSeconds + ms || duration >= 24 * 60 * 60) {
            return 1; // Too late or too long
        }
        else if (endTime < ms) {
            return 2; // Already finished
        }
        return 0;
    }
    async getLeetcodeContests() {
        try {
            const response = await axios_1.default.post(this._leetcodeUrl, {
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
                const contests = [];
                for (let i = 0; i < Math.min(2, contestList.length); i++) {
                    const item = contestList[i];
                    const name = item.title;
                    const startTime = item.startTime;
                    const duration = item.duration;
                    const link = `https://leetcode.cn/contest/${item.titleSlug}`;
                    const status = this._isIntime(startTime, duration);
                    if (status === 1)
                        continue;
                    if (status === 2)
                        break;
                    contests.push({ name, startTime, duration, platform: '\u529b\u6263', link });
                }
                return contests;
            }
        }
        catch (e) {
            console.error('LeetCode Error:', e);
        }
        return [];
    }
    async getCodeforcesContests() {
        try {
            const response = await axios_1.default.get(this._codeforcesUrl);
            if (response.status === 200) {
                const contests = [];
                const contestList = response.data.result;
                contestList.sort((a, b) => b.startTimeSeconds - a.startTimeSeconds);
                for (const item of contestList) {
                    const startTime = item.startTimeSeconds;
                    const duration = item.durationSeconds;
                    const status = this._isIntime(startTime, duration);
                    if (status === 1)
                        continue;
                    if (status === 2)
                        break;
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
        }
        catch (e) {
            console.error('Codeforces Error:', e);
        }
        return [];
    }
    async getNowcoderContests() {
        try {
            const response = await axios_1.default.get(this._nowcoderUrl);
            if (response.status === 200) {
                const $ = cheerio.load(response.data);
                const contests = [];
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
        }
        catch (e) {
            console.error('Nowcoder Error:', e);
        }
        return [];
    }
    async getAtCoderContests() {
        try {
            const response = await axios_1.default.get(this._atcoderUrl);
            if (response.status === 200) {
                const $ = cheerio.load(response.data);
                const contests = [];
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
        }
        catch (e) {
            console.error('AtCoder Error:', e);
        }
        return [];
    }
    async getLuoguContests(isRated = true) {
        try {
            const response = await axios_1.default.get(this._luoguUrl, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (response.status === 200) {
                const contests = [];
                let contestList;
                // Luogu now returns HTML with embedded JSON in <script type="application/json">
                const raw = response.data;
                if (typeof raw === 'object' && raw?.currentData?.contests?.result) {
                    // Legacy pure-JSON response (kept for backward compatibility)
                    contestList = raw.currentData.contests.result;
                }
                else {
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
                    if (!item.rated && isRated)
                        continue;
                    const name = item.name;
                    const link = `https://www.luogu.com.cn/contest/${item.id}`;
                    const startTime = item.startTime;
                    const duration = item.endTime - startTime;
                    const status = this._isIntime(startTime, duration);
                    if (status === 1)
                        continue;
                    if (status === 2)
                        break;
                    contests.push({ name, startTime, duration, platform: '\u6d1b\u8c37', link });
                }
                return contests;
            }
        }
        catch (e) {
            console.error('Luogu Error:', e);
        }
        return [];
    }
    async getLanqiaoContests() {
        try {
            const response = await axios_1.default.get(this._lanqiaoUrl);
            if (response.status === 200) {
                const contests = [];
                for (const item of response.data) {
                    const name = item.name;
                    const link = `https://www.lanqiao.cn${item.html_url}`;
                    const startTime = Math.floor(new Date(item.open_at).getTime() / 1000);
                    const endTime = Math.floor(new Date(item.end_at).getTime() / 1000);
                    const duration = endTime - startTime;
                    const status = this._isIntime(startTime, duration);
                    if (status === 1)
                        continue;
                    if (status === 2)
                        break;
                    contests.push({ name, startTime, duration, platform: '\u84dd\u6865\u4e91\u8bfe', link });
                }
                return contests;
            }
        }
        catch (e) {
            console.error('Lanqiao Error:', e);
        }
        return [];
    }
    async getAllContests(day) {
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
exports.default = new RecentContestService();
