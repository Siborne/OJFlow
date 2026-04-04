"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NowcoderAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
class NowcoderAdapter extends base_adapter_1.BaseAdapter {
    id = 'nowcoder';
    displayName = '\u725b\u5ba2';
    contestUrl = 'https://ac.nowcoder.com/acm/contest/vip-index';
    ratingUrl = 'https://ac.nowcoder.com/acm/contest/rating-history';
    ojhuntUrl = 'https://ojhunt.com/api/crawlers/nowcoder';
    async fetchContests(days) {
        const response = await this.http.get(this.contestUrl);
        const $ = this.parseHtml(response.data);
        const contests = [];
        const now = Math.floor(Date.now() / 1000);
        const todayStart = now - (now % 86400) - new Date().getTimezoneOffset() * 60;
        const queryEnd = todayStart + days * 86400;
        // Primary selector
        let items = $('.platform-item-main');
        if (items.length === 0) {
            // Fallback
            items = $('.platform-item, .contest-item-main');
        }
        items.each((_i, el) => {
            try {
                const title = $(el).find('a').first().text().trim();
                const href = $(el).find('a').first().attr('href');
                const link = href ? `https://ac.nowcoder.com${href}` : '';
                const timeText = $(el).find('.match-time-icon').first().text();
                const timeRegExp = /(\d{4}-\d{2}-\d{2} \d{2}:\d{2})/g;
                const matches = timeText.match(timeRegExp);
                if (matches && matches.length >= 2) {
                    const startTime = Math.floor(new Date(matches[0]).getTime() / 1000);
                    const endTime = Math.floor(new Date(matches[1]).getTime() / 1000);
                    const duration = endTime - startTime;
                    if (startTime > queryEnd || duration >= 86400)
                        return;
                    if (endTime < todayStart)
                        return;
                    contests.push({
                        name: title,
                        startTime,
                        duration,
                        platform: this.displayName,
                        link,
                    });
                }
            }
            catch (parseError) {
                console.warn('[nowcoder] Failed to parse contest:', parseError);
            }
        });
        return contests;
    }
    async fetchRating(handle) {
        const url = `${this.ratingUrl}?uid=${encodeURIComponent(handle)}`;
        const response = await this.http.get(url);
        const rateHistory = response.data?.data;
        if (!rateHistory || rateHistory.length === 0) {
            return { name: handle, curRating: 0, maxRating: 0 };
        }
        const curRating = rateHistory[rateHistory.length - 1].rating;
        const maxRating = Math.max(...rateHistory.map((r) => r.rating));
        return { name: handle, curRating, maxRating };
    }
    async fetchSolvedCount(handle) {
        const url = `${this.ojhuntUrl}/${encodeURIComponent(handle)}`;
        const response = await this.http.get(url);
        if (response.data?.data?.solved != null) {
            return { name: handle, solvedNum: response.data.data.solved };
        }
        throw new Error('Nowcoder solved API response invalid');
    }
}
exports.NowcoderAdapter = NowcoderAdapter;
