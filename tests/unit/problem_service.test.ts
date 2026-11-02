import { describe, expect, test } from 'bun:test';
import type { ProblemPlatform, ProblemSummary } from '../../shared/types';
import {
  PROBLEM_PLATFORMS,
  aggregateProblemSearch,
  type ProblemProvider,
} from '../../electron/services/problem-service';

function problem(
  platform: ProblemPlatform,
  index: string,
  overrides: Partial<ProblemSummary> = {},
): ProblemSummary {
  return {
    id: `${platform}:${index}`,
    platform,
    index,
    name: `${platform} Problem ${index}`,
    titleZh: platform === '力扣' ? `中文题目 ${index}` : undefined,
    rating: 1200,
    tags: ['dp'],
    url: `https://example.com/${platform}/${index}`,
    ...overrides,
  };
}

function provider(platform: ProblemPlatform, data: ProblemSummary[]): ProblemProvider {
  return { platform, load: async () => data };
}

describe('aggregated problem search', () => {
  test('isolates provider failures and reports source health', async () => {
    const providers = [
      provider('Codeforces', [problem('Codeforces', '1A')]),
      {
        platform: 'AtCoder' as const,
        load: async () => {
          throw new Error('AtCoder offline');
        },
      },
    ];

    const result = await aggregateProblemSearch({}, providers);
    expect(result.problems).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.sources).toEqual([
      { platform: 'Codeforces', success: true, count: 1 },
      { platform: 'AtCoder', success: false, count: 0, error: 'AtCoder offline' },
    ]);
  });

  test('filters by platform, Chinese tag, localized query and difficulty', async () => {
    const providers = [
      provider('Codeforces', [
        problem('Codeforces', '1A', { rating: 800 }),
        problem('Codeforces', '2B', { rating: 1800, tags: ['graphs'] }),
      ]),
      provider('力扣', [
        problem('力扣', '1', { rating: undefined, titleZh: '两数之和', tags: ['arrays'] }),
      ]),
    ];

    const chinese = await aggregateProblemSearch(
      { platform: '力扣', query: '两数', tag: '数组' },
      providers,
    );
    expect(chinese.problems.map(item => item.name)).toEqual(['力扣 Problem 1']);

    const localizedQuery = await aggregateProblemSearch({ query: '动态规划' }, providers);
    expect(localizedQuery.problems.map(item => item.index)).toEqual(['1A']);

    const difficulty = await aggregateProblemSearch(
      { platform: 'Codeforces', minRating: 1000, maxRating: 2000 },
      providers,
    );
    expect(difficulty.problems.map(item => item.index)).toEqual(['2B']);
  });

  test('deduplicates, sorts and paginates globally', async () => {
    const codeforces = Array.from({ length: 12 }, (_, index) =>
      problem('Codeforces', `${index + 1}A`, { rating: 800 + index * 100 }),
    );
    const result = await aggregateProblemSearch({ page: 2, pageSize: 10 }, [
      provider('Codeforces', codeforces),
      provider('Codeforces', [problem('Codeforces', '1A', { name: 'duplicate' })]),
    ]);

    expect(result.total).toBe(12);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.problems).toHaveLength(2);
    expect(result.sources[0].count).toBe(12);
    expect(PROBLEM_PLATFORMS).toEqual(['Codeforces', 'AtCoder', '力扣', '洛谷', '牛客', 'QOJ']);
  });
});
