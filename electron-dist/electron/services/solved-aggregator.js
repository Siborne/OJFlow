"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSolvedCountDedup = exports.fetchSolvedCount = void 0;
const adapters_1 = require("./adapters");
const validators_1 = require("./validators");
const request_dedup_1 = require("./request-dedup");
/** Platform display-name to adapter-id mapping */
const platformIdMap = {
    Codeforces: 'codeforces',
    '\u529b\u6263': 'leetcode',
    VJudge: 'vjudge',
    '\u6d1b\u8c37': 'luogu',
    AtCoder: 'atcoder',
    HDU: 'hdu',
    POJ: 'poj',
    '\u725b\u5ba2': 'nowcoder',
    QOJ: 'qoj',
};
/**
 * Fetch solved count for a given platform and handle.
 * Returns a SolvedFetchResponse with fromCache=false (cache handled upstream).
 */
async function fetchSolvedCount(platform, handle) {
    const adapterId = platformIdMap[platform];
    if (!adapterId) {
        throw new Error(`Unsupported solved platform: ${platform}`);
    }
    const adapter = (0, adapters_1.getAdapter)(adapterId);
    if (!adapter?.fetchSolvedCount) {
        throw new Error(`Adapter ${adapterId} does not support solved count queries`);
    }
    const solved = await adapter.fetchSolvedCount(handle);
    if (!(0, validators_1.validateSolvedNum)(solved)) {
        console.warn(`[solved-aggregator] Invalid solved count from ${adapterId}:`, solved);
        return {
            solved: { name: handle, solvedNum: 0 },
            fromCache: false,
            cachedAt: null,
        };
    }
    return {
        solved,
        fromCache: false,
        cachedAt: null,
    };
}
exports.fetchSolvedCount = fetchSolvedCount;
/** Deduplicated version */
function fetchSolvedCountDedup(platform, handle) {
    return (0, request_dedup_1.dedup)(`solved:${platform}:${handle}`, () => fetchSolvedCount(platform, handle));
}
exports.fetchSolvedCountDedup = fetchSolvedCountDedup;
