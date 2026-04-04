"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchRatingDedup = exports.fetchRating = void 0;
const adapters_1 = require("./adapters");
const validators_1 = require("./validators");
const request_dedup_1 = require("./request-dedup");
/** Platform display-name to adapter-id mapping */
const platformIdMap = {
    Codeforces: 'codeforces',
    AtCoder: 'atcoder',
    '\u529b\u6263': 'leetcode',
    '\u6d1b\u8c37': 'luogu',
    '\u725b\u5ba2': 'nowcoder',
};
/**
 * Fetch rating for a given platform and handle.
 * Returns a RatingFetchResponse with fromCache=false (cache handled upstream).
 */
async function fetchRating(platform, handle) {
    const adapterId = platformIdMap[platform];
    if (!adapterId) {
        throw new Error(`Unsupported rating platform: ${platform}`);
    }
    const adapter = (0, adapters_1.getAdapter)(adapterId);
    if (!adapter?.fetchRating) {
        throw new Error(`Adapter ${adapterId} does not support rating queries`);
    }
    const rating = await adapter.fetchRating(handle);
    if (!(0, validators_1.validateRating)(rating)) {
        console.warn(`[rating-aggregator] Invalid rating from ${adapterId}:`, rating);
        // Return zero-rating rather than throwing
        return {
            rating: { name: handle, curRating: 0, maxRating: 0 },
            fromCache: false,
            cachedAt: null,
        };
    }
    return {
        rating,
        fromCache: false,
        cachedAt: null,
    };
}
exports.fetchRating = fetchRating;
/** Deduplicated version */
function fetchRatingDedup(platform, handle) {
    return (0, request_dedup_1.dedup)(`rating:${platform}:${handle}`, () => fetchRating(platform, handle));
}
exports.fetchRatingDedup = fetchRatingDedup;
