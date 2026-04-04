import type { Rating, RatingFetchResponse } from '../../shared/types';
import { getAdapter } from './adapters';
import { validateRating } from './validators';
import { dedup } from './request-dedup';

/** Platform display-name to adapter-id mapping */
const platformIdMap: Record<string, string> = {
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
export async function fetchRating(
  platform: string,
  handle: string,
): Promise<RatingFetchResponse> {
  const adapterId = platformIdMap[platform];
  if (!adapterId) {
    throw new Error(`Unsupported rating platform: ${platform}`);
  }

  const adapter = getAdapter(adapterId);
  if (!adapter?.fetchRating) {
    throw new Error(`Adapter ${adapterId} does not support rating queries`);
  }

  const rating = await adapter.fetchRating(handle);

  if (!validateRating(rating)) {
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

/** Deduplicated version */
export function fetchRatingDedup(
  platform: string,
  handle: string,
): Promise<RatingFetchResponse> {
  return dedup(`rating:${platform}:${handle}`, () =>
    fetchRating(platform, handle),
  );
}
