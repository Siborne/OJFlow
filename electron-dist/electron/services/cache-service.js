"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllCache = exports.clearSolvedCache = exports.clearRatingCache = exports.clearContestCache = exports.setCachedSolved = exports.getCachedSolved = exports.setCachedRating = exports.getCachedRating = exports.setCachedContests = exports.getCachedContests = void 0;
const store_1 = require("../store");
/** TTL constants in milliseconds */
const TTL = {
    contests: 2 * 60 * 60 * 1000,
    ratings: 6 * 60 * 60 * 1000,
    solved: 12 * 60 * 60 * 1000, // 12 hours
};
function isExpired(fetchedAt, ttlMs) {
    return Date.now() - fetchedAt > ttlMs;
}
// ─── Contest Cache ──────────────────────────────────────────
function getCachedContests() {
    const cached = store_1.store.get('cache.contests');
    if (!cached?.data || !cached.fetchedAt)
        return null;
    if (isExpired(cached.fetchedAt, TTL.contests))
        return null;
    return {
        contests: cached.data,
        platformStatus: [],
        totalElapsed: 0,
        fromCache: true,
        cachedAt: cached.fetchedAt,
    };
}
exports.getCachedContests = getCachedContests;
function setCachedContests(response) {
    store_1.store.set('cache.contests', {
        data: response.contests,
        fetchedAt: Date.now(),
    });
}
exports.setCachedContests = setCachedContests;
// ─── Rating Cache ───────────────────────────────────────────
function ratingKey(platform, handle) {
    return `${platform}:${handle}`;
}
function getCachedRating(platform, handle) {
    const key = ratingKey(platform, handle);
    const cached = store_1.store.get(`cache.ratings.${key}`);
    if (!cached?.data || !cached.fetchedAt)
        return null;
    if (isExpired(cached.fetchedAt, TTL.ratings))
        return null;
    return {
        rating: cached.data,
        fromCache: true,
        cachedAt: cached.fetchedAt,
    };
}
exports.getCachedRating = getCachedRating;
function setCachedRating(platform, handle, response) {
    const key = ratingKey(platform, handle);
    store_1.store.set(`cache.ratings.${key}`, {
        data: response.rating,
        fetchedAt: Date.now(),
    });
}
exports.setCachedRating = setCachedRating;
// ─── Solved Count Cache ─────────────────────────────────────
function solvedKey(platform, handle) {
    return `${platform}:${handle}`;
}
function getCachedSolved(platform, handle) {
    const key = solvedKey(platform, handle);
    const cached = store_1.store.get(`cache.solvedNums.${key}`);
    if (!cached?.data || !cached.fetchedAt)
        return null;
    if (isExpired(cached.fetchedAt, TTL.solved))
        return null;
    return {
        solved: cached.data,
        fromCache: true,
        cachedAt: cached.fetchedAt,
    };
}
exports.getCachedSolved = getCachedSolved;
function setCachedSolved(platform, handle, response) {
    const key = solvedKey(platform, handle);
    store_1.store.set(`cache.solvedNums.${key}`, {
        data: response.solved,
        fetchedAt: Date.now(),
    });
}
exports.setCachedSolved = setCachedSolved;
// ─── Cache Invalidation ─────────────────────────────────────
function clearContestCache() {
    store_1.store.delete('cache.contests');
}
exports.clearContestCache = clearContestCache;
function clearRatingCache() {
    store_1.store.delete('cache.ratings');
}
exports.clearRatingCache = clearRatingCache;
function clearSolvedCache() {
    store_1.store.delete('cache.solvedNums');
}
exports.clearSolvedCache = clearSolvedCache;
function clearAllCache() {
    store_1.store.set('cache', {});
}
exports.clearAllCache = clearAllCache;
