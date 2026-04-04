import { store } from '../store';
import type {
  RawContest,
  Rating,
  SolvedNum,
  ContestFetchResponse,
  RatingFetchResponse,
  SolvedFetchResponse,
  PlatformFetchStatus,
} from '../../shared/types';

/** TTL constants in milliseconds */
const TTL = {
  contests: 2 * 60 * 60 * 1000, // 2 hours
  ratings: 6 * 60 * 60 * 1000, // 6 hours
  solved: 12 * 60 * 60 * 1000, // 12 hours
} as const;

function isExpired(fetchedAt: number, ttlMs: number): boolean {
  return Date.now() - fetchedAt > ttlMs;
}

// ─── Contest Cache ──────────────────────────────────────────

export function getCachedContests(): ContestFetchResponse | null {
  const cached = store.get('cache.contests') as
    | { data: unknown[]; fetchedAt: number }
    | undefined;

  if (!cached?.data || !cached.fetchedAt) return null;
  if (isExpired(cached.fetchedAt, TTL.contests)) return null;

  return {
    contests: cached.data as RawContest[],
    platformStatus: [],
    totalElapsed: 0,
    fromCache: true,
    cachedAt: cached.fetchedAt,
  };
}

export function setCachedContests(response: ContestFetchResponse): void {
  store.set('cache.contests', {
    data: response.contests,
    fetchedAt: Date.now(),
  });
}

// ─── Rating Cache ───────────────────────────────────────────

function ratingKey(platform: string, handle: string): string {
  return `${platform}:${handle}`;
}

export function getCachedRating(
  platform: string,
  handle: string,
): RatingFetchResponse | null {
  const key = ratingKey(platform, handle);
  const cached = store.get(`cache.ratings.${key}`) as
    | { data: unknown; fetchedAt: number }
    | undefined;

  if (!cached?.data || !cached.fetchedAt) return null;
  if (isExpired(cached.fetchedAt, TTL.ratings)) return null;

  return {
    rating: cached.data as Rating,
    fromCache: true,
    cachedAt: cached.fetchedAt,
  };
}

export function setCachedRating(
  platform: string,
  handle: string,
  response: RatingFetchResponse,
): void {
  const key = ratingKey(platform, handle);
  store.set(`cache.ratings.${key}`, {
    data: response.rating,
    fetchedAt: Date.now(),
  });
}

// ─── Solved Count Cache ─────────────────────────────────────

function solvedKey(platform: string, handle: string): string {
  return `${platform}:${handle}`;
}

export function getCachedSolved(
  platform: string,
  handle: string,
): SolvedFetchResponse | null {
  const key = solvedKey(platform, handle);
  const cached = store.get(`cache.solvedNums.${key}`) as
    | { data: unknown; fetchedAt: number }
    | undefined;

  if (!cached?.data || !cached.fetchedAt) return null;
  if (isExpired(cached.fetchedAt, TTL.solved)) return null;

  return {
    solved: cached.data as SolvedNum,
    fromCache: true,
    cachedAt: cached.fetchedAt,
  };
}

export function setCachedSolved(
  platform: string,
  handle: string,
  response: SolvedFetchResponse,
): void {
  const key = solvedKey(platform, handle);
  store.set(`cache.solvedNums.${key}`, {
    data: response.solved,
    fetchedAt: Date.now(),
  });
}

// ─── Cache Invalidation ─────────────────────────────────────

export function clearContestCache(): void {
  store.delete('cache.contests' as any);
}

export function clearRatingCache(): void {
  store.delete('cache.ratings' as any);
}

export function clearSolvedCache(): void {
  store.delete('cache.solvedNums' as any);
}

export function clearAllCache(): void {
  store.set('cache', {});
}
