"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QojAdapter = exports.PojAdapter = exports.HduAdapter = exports.VJudgeAdapter = exports.NowcoderAdapter = exports.AtCoderAdapter = exports.LuoguAdapter = exports.LanqiaoAdapter = exports.LeetCodeAdapter = exports.CodeforcesAdapter = exports.getSolvedAdapters = exports.getRatingAdapters = exports.getContestAdapters = exports.getAdapter = exports.getAllAdapters = void 0;
const codeforces_adapter_1 = require("./codeforces.adapter");
Object.defineProperty(exports, "CodeforcesAdapter", { enumerable: true, get: function () { return codeforces_adapter_1.CodeforcesAdapter; } });
const leetcode_adapter_1 = require("./leetcode.adapter");
Object.defineProperty(exports, "LeetCodeAdapter", { enumerable: true, get: function () { return leetcode_adapter_1.LeetCodeAdapter; } });
const lanqiao_adapter_1 = require("./lanqiao.adapter");
Object.defineProperty(exports, "LanqiaoAdapter", { enumerable: true, get: function () { return lanqiao_adapter_1.LanqiaoAdapter; } });
const luogu_adapter_1 = require("./luogu.adapter");
Object.defineProperty(exports, "LuoguAdapter", { enumerable: true, get: function () { return luogu_adapter_1.LuoguAdapter; } });
const atcoder_adapter_1 = require("./atcoder.adapter");
Object.defineProperty(exports, "AtCoderAdapter", { enumerable: true, get: function () { return atcoder_adapter_1.AtCoderAdapter; } });
const nowcoder_adapter_1 = require("./nowcoder.adapter");
Object.defineProperty(exports, "NowcoderAdapter", { enumerable: true, get: function () { return nowcoder_adapter_1.NowcoderAdapter; } });
const vjudge_adapter_1 = require("./vjudge.adapter");
Object.defineProperty(exports, "VJudgeAdapter", { enumerable: true, get: function () { return vjudge_adapter_1.VJudgeAdapter; } });
const hdu_adapter_1 = require("./hdu.adapter");
Object.defineProperty(exports, "HduAdapter", { enumerable: true, get: function () { return hdu_adapter_1.HduAdapter; } });
const poj_adapter_1 = require("./poj.adapter");
Object.defineProperty(exports, "PojAdapter", { enumerable: true, get: function () { return poj_adapter_1.PojAdapter; } });
const qoj_adapter_1 = require("./qoj.adapter");
Object.defineProperty(exports, "QojAdapter", { enumerable: true, get: function () { return qoj_adapter_1.QojAdapter; } });
/** Singleton instances of all platform adapters */
const adapters = [
    new codeforces_adapter_1.CodeforcesAdapter(),
    new leetcode_adapter_1.LeetCodeAdapter(),
    new lanqiao_adapter_1.LanqiaoAdapter(),
    new luogu_adapter_1.LuoguAdapter(),
    new atcoder_adapter_1.AtCoderAdapter(),
    new nowcoder_adapter_1.NowcoderAdapter(),
    new vjudge_adapter_1.VJudgeAdapter(),
    new hdu_adapter_1.HduAdapter(),
    new poj_adapter_1.PojAdapter(),
    new qoj_adapter_1.QojAdapter(),
];
/** Map for O(1) lookup by adapter id */
const adapterMap = new Map(adapters.map((a) => [a.id, a]));
/** Get all registered adapters */
function getAllAdapters() {
    return adapters;
}
exports.getAllAdapters = getAllAdapters;
/** Get a specific adapter by platform id */
function getAdapter(id) {
    return adapterMap.get(id);
}
exports.getAdapter = getAdapter;
/** Get adapters that support contest fetching */
function getContestAdapters() {
    return adapters.filter((a) => typeof a.fetchContests === 'function');
}
exports.getContestAdapters = getContestAdapters;
/** Get adapters that support rating queries */
function getRatingAdapters() {
    return adapters.filter((a) => typeof a.fetchRating === 'function');
}
exports.getRatingAdapters = getRatingAdapters;
/** Get adapters that support solved count queries */
function getSolvedAdapters() {
    return adapters.filter((a) => typeof a.fetchSolvedCount === 'function');
}
exports.getSolvedAdapters = getSolvedAdapters;
