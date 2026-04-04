"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAllContestsDedup = exports.fetchAllContests = void 0;
const adapters_1 = require("./adapters");
const validators_1 = require("./validators");
const ipc_channels_1 = require("../../shared/ipc-channels");
const request_dedup_1 = require("./request-dedup");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const appConfig = require('../app.config.json');
/** Filter contests by time window: returns true if the contest should be included */
function isInTimeWindow(startTime, duration, queryEndSeconds) {
    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400); // approximate day start
    const endTime = startTime + duration;
    // Already finished
    if (endTime < todayStart)
        return false;
    // Too far in the future or duration > 24h
    if (startTime > queryEndSeconds + todayStart || duration >= 86400)
        return false;
    return true;
}
/**
 * Fetch contests from all platform adapters in parallel.
 * Supports streaming partial results to the renderer via BrowserWindow.
 */
async function fetchAllContests(day, win) {
    const fallback = appConfig?.crawl?.defaultDays ?? 7;
    const min = appConfig?.crawl?.minDays ?? 1;
    const max = appConfig?.crawl?.maxDays ?? 30;
    const n = Number(day);
    const d = Number.isFinite(n)
        ? Math.max(min, Math.min(max, Math.floor(n)))
        : fallback;
    const queryEndSeconds = d * 24 * 60 * 60;
    const adapters = (0, adapters_1.getContestAdapters)();
    const totalStart = Date.now();
    // Fire all adapter fetches concurrently
    const results = await Promise.allSettled(adapters.map(async (adapter) => {
        if (!adapter.fetchContests)
            return null;
        const start = Date.now();
        try {
            const contests = await adapter.fetchContests(d);
            const valid = contests.filter((c) => (0, validators_1.validateContest)(c) &&
                isInTimeWindow(c.startTime, c.duration, queryEndSeconds));
            const result = {
                success: true,
                data: valid,
                platform: adapter.displayName,
                elapsed: Date.now() - start,
            };
            // Stream partial result to renderer
            if (win && !win.isDestroyed()) {
                win.webContents.send(ipc_channels_1.IPC_CHANNELS.CONTESTS_PARTIAL, {
                    platform: adapter.displayName,
                    contests: valid,
                });
            }
            return result;
        }
        catch (error) {
            const elapsed = Date.now() - start;
            const msg = error instanceof Error ? error.message : 'Unknown error';
            console.warn(`[contest-aggregator] ${adapter.id} failed:`, msg);
            return {
                success: false,
                data: [],
                platform: adapter.displayName,
                elapsed,
                error: msg,
                errorType: 'unknown',
            };
        }
    }));
    // Aggregate results
    const allContests = [];
    const platformStatus = [];
    for (const settled of results) {
        if (settled.status === 'rejected' || !settled.value)
            continue;
        const r = settled.value;
        allContests.push(...r.data);
        platformStatus.push({
            platform: r.platform,
            success: r.success,
            error: r.error,
            errorType: r.errorType,
            elapsed: r.elapsed,
        });
    }
    // Sort by start time ascending
    allContests.sort((a, b) => a.startTime - b.startTime);
    return {
        contests: allContests,
        platformStatus,
        totalElapsed: Date.now() - totalStart,
        fromCache: false,
        cachedAt: null,
    };
}
exports.fetchAllContests = fetchAllContests;
/** Deduplicated version: prevents concurrent identical fetches */
function fetchAllContestsDedup(day, win) {
    return (0, request_dedup_1.dedup)(`contests:${day}`, () => fetchAllContests(day, win));
}
exports.fetchAllContestsDedup = fetchAllContestsDedup;
