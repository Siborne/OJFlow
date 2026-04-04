/**
 * Request deduplication utility.
 * Prevents duplicate concurrent requests for the same key.
 */
const inflight = new Map<string, Promise<unknown>>();

/**
 * Deduplicate concurrent requests sharing the same key.
 * If a request with the same key is already in-flight, returns its promise.
 * Otherwise, executes the factory and stores the promise until it settles.
 */
export function dedup<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = factory().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

/** Check if a deduplication key is currently in-flight */
export function isInflight(key: string): boolean {
  return inflight.has(key);
}

/** Get the number of in-flight requests (mainly for testing) */
export function inflightCount(): number {
  return inflight.size;
}
