"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeetCodeAdapter = void 0;
const base_adapter_1 = require("./base-adapter");
class LeetCodeAdapter extends base_adapter_1.BaseAdapter {
    id = 'leetcode';
    displayName = '\u529b\u6263';
    graphqlUrl = 'https://leetcode.cn/graphql';
    ratingUrl = 'https://leetcode.cn/graphql/noj-go/';
    async fetchContests(days) {
        const response = await this.http.post(this.graphqlUrl, {
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
        if (response.status !== 200) {
            throw new Error(`LeetCode API returned ${response.status}`);
        }
        const contestList = response.data?.data?.contestUpcomingContests;
        if (!Array.isArray(contestList)) {
            throw new Error('Invalid contest list format');
        }
        const now = Math.floor(Date.now() / 1000);
        const todayStart = now - (now % 86400) - new Date().getTimezoneOffset() * 60;
        const queryEnd = todayStart + days * 86400;
        const contests = [];
        for (const item of contestList) {
            const startTime = item.startTime;
            const duration = item.duration;
            const endTime = startTime + duration;
            if (startTime > queryEnd || duration >= 86400)
                continue;
            if (endTime < todayStart)
                continue;
            contests.push({
                name: item.title,
                startTime,
                duration,
                platform: this.displayName,
                link: `https://leetcode.cn/contest/${item.titleSlug}`,
            });
        }
        return contests;
    }
    async fetchRating(handle) {
        const response = await this.http.post(this.ratingUrl, {
            query: `
        query userContestRankingInfo($userSlug: String!) {
          userContestRankingHistory(userSlug: $userSlug) {
            attended
            rating
            ranking
            contest { title startTime }
          }
        }
      `,
            variables: { userSlug: handle },
            operationName: 'userContestRankingInfo',
        });
        if (response.status !== 200) {
            throw new Error(`LeetCode rating API returned ${response.status}`);
        }
        const ratingList = response.data?.data?.userContestRankingHistory;
        if (!ratingList || ratingList.length === 0) {
            return { name: handle, curRating: 0, maxRating: 0 };
        }
        const attended = ratingList.filter((r) => r.attended);
        if (attended.length === 0) {
            return { name: handle, curRating: 0, maxRating: 0 };
        }
        const curRating = attended[attended.length - 1].rating;
        const maxRating = Math.max(...attended.map((r) => r.rating));
        return {
            name: handle,
            curRating: Math.round(curRating),
            maxRating: Math.round(maxRating),
        };
    }
    async fetchSolvedCount(handle) {
        const response = await this.http.post('https://leetcode.cn/graphql/', {
            query: `
        query userProfileUserQuestionProgressV2($userSlug: String!) {
          userProfileUserQuestionProgressV2(userSlug: $userSlug) {
            numAcceptedQuestions { count }
          }
        }
      `,
            variables: { userSlug: handle },
            operationName: 'userProfileUserQuestionProgressV2',
        });
        const progress = response.data?.data?.userProfileUserQuestionProgressV2;
        if (!progress?.numAcceptedQuestions) {
            throw new Error('LeetCode solved API response invalid');
        }
        const totalSolved = progress.numAcceptedQuestions.reduce((acc, curr) => acc + curr.count, 0);
        return { name: handle, solvedNum: totalSolved };
    }
}
exports.LeetCodeAdapter = LeetCodeAdapter;
