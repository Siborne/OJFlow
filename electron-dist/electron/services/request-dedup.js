"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inflightCount = exports.isInflight = exports.dedup = void 0;
/**
 * Request deduplication utility.
 * Prevents duplicate concurrent requests for the same key.
 */
const inflight = new Map();
/**
 * Deduplicate concurrent requests sharing the same key.
 * If a request with the same key is already in-flight, returns its promise.
 * Otherwise, executes the factory and stores the promise until it settles.
 */
function dedup(key, factory) {
    const existing = inflight.get(key);
    if (existing)
        return existing;
    const promise = factory().finally(() => {
        inflight.delete(key);
    });
    inflight.set(key, promise);
    return promise;
}
exports.dedup = dedup;
/** Check if a deduplication key is currently in-flight */
function isInflight(key) {
    return inflight.has(key);
}
exports.isInflight = isInflight;
/** Get the number of in-flight requests (mainly for testing) */
function inflightCount() {
    return inflight.size;
}
exports.inflightCount = inflightCount;
