import type { SolvedNum, SolvedFetchResponse } from '../../shared/types';
import { getAdapter } from './adapters';
import { validateSolvedNum } from './validators';
import { dedup } from './request-dedup';

/** Platform display-name to adapter-id mapping */
const platformIdMap: Record<string, string> = {
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
export async function fetchSolvedCount(
  platform: string,
  handle: string,
): Promise<SolvedFetchResponse> {
  const adapterId = platformIdMap[platform];
  if (!adapterId) {
    throw new Error(`Unsupported solved platform: ${platform}`);
  }

  const adapter = getAdapter(adapterId);
  if (!adapter?.fetchSolvedCount) {
    throw new Error(`Adapter ${adapterId} does not support solved count queries`);
  }

  const solved = await adapter.fetchSolvedCount(handle);

  if (!validateSolvedNum(solved)) {
    console.warn(
      `[solved-aggregator] Invalid solved count from ${adapterId}:`,
      solved,
    );
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

/** Deduplicated version */
export function fetchSolvedCountDedup(
  platform: string,
  handle: string,
): Promise<SolvedFetchResponse> {
  return dedup(`solved:${platform}:${handle}`, () =>
    fetchSolvedCount(platform, handle),
  );
}
