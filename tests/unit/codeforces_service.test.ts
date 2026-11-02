import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  clearCodeforcesProblemCache,
  getCodeforcesReport,
  searchCodeforcesProblems,
} from '../../electron/services/codeforces-service';
import { jsonResponse } from './helpers';

const originalFetch = globalThis.fetch;

const problemsetPayload = {
  status: 'OK',
  result: {
    problems: [
      { contestId: 2, index: 'A', name: 'Winner', rating: 800, tags: ['implementation'] },
      { contestId: 1, index: 'B', name: 'Graph Walk', rating: 1400, tags: ['graphs', 'dfs'] },
      { contestId: 3, index: 'C', name: 'Hard DP', rating: 2200, tags: ['dp'] },
      { contestId: 4, index: 'D', name: '', rating: 1600, tags: [] },
    ],
  },
};

const statusPayload = {
  status: 'OK',
  result: [
    {
      verdict: 'OK',
      problem: { contestId: 1, index: 'A', name: 'A', rating: 800, tags: ['math'] },
    },
    {
      verdict: 'OK',
      problem: { contestId: 1, index: 'A', name: 'A', rating: 800, tags: ['math'] },
    },
    {
      verdict: 'WRONG_ANSWER',
      problem: { contestId: 2, index: 'B', name: 'B', rating: 1200, tags: ['dp'] },
    },
    {
      verdict: 'OK',
      problem: { contestId: 2, index: 'B', name: 'B', rating: 1200, tags: ['dp', 'graphs'] },
    },
  ],
};

describe('Codeforces problem service', () => {
  beforeEach(() => {
    clearCodeforcesProblemCache();
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('loads, normalizes and caches the problemset', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return jsonResponse(problemsetPayload);
    }) as unknown as typeof fetch;

    const result = await searchCodeforcesProblems({ pageSize: 10 });
    expect(result.total).toBe(3);
    expect(result.problems[0]).toEqual({
      id: 'Codeforces:2-A',
      platform: 'Codeforces',
      contestId: 2,
      index: 'A',
      name: 'Winner',
      rating: 800,
      tags: ['implementation'],
      url: 'https://codeforces.com/problemset/problem/2/A',
    });
    expect(result.sources).toEqual([{ platform: 'Codeforces', success: true, count: 3 }]);

    await searchCodeforcesProblems({ pageSize: 10 });
    expect(calls).toBe(1);
  });

  test('filters by name, tag and rating range', async () => {
    globalThis.fetch = (async () => jsonResponse(problemsetPayload)) as unknown as typeof fetch;

    const byName = await searchCodeforcesProblems({ query: 'graph' });
    expect(byName.problems.map(problem => problem.name)).toEqual(['Graph Walk']);

    const byTag = await searchCodeforcesProblems({ tag: 'DP' });
    expect(byTag.problems.map(problem => problem.name)).toEqual(['Hard DP']);

    const byRating = await searchCodeforcesProblems({ minRating: 1000, maxRating: 1600 });
    expect(byRating.problems.map(problem => problem.name)).toEqual(['Graph Walk']);
  });

  test('paginates and clamps page size', async () => {
    globalThis.fetch = (async () => jsonResponse(problemsetPayload)) as unknown as typeof fetch;
    const page = await searchCodeforcesProblems({ page: 2, pageSize: 1 });
    expect(page.pageSize).toBe(10);
    expect(page.page).toBe(2);
    expect(page.problems).toHaveLength(0);
  });

  test('reports API errors and malformed payloads', async () => {
    globalThis.fetch = (async () =>
      jsonResponse({ status: 'FAILED', comment: 'limit exceeded' })) as unknown as typeof fetch;
    await expect(searchCodeforcesProblems()).rejects.toThrow('limit exceeded');

    clearCodeforcesProblemCache();
    globalThis.fetch = (async () =>
      jsonResponse({ status: 'OK', result: {} })) as unknown as typeof fetch;
    await expect(searchCodeforcesProblems()).rejects.toThrow('格式不正确');

    clearCodeforcesProblemCache();
    globalThis.fetch = (async () =>
      new Response('down', { status: 503 })) as unknown as typeof fetch;
    await expect(searchCodeforcesProblems()).rejects.toThrow('HTTP 503');
  });
});

describe('Codeforces report service', () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('deduplicates accepted submissions and computes stats', async () => {
    globalThis.fetch = (async () => jsonResponse(statusPayload)) as unknown as typeof fetch;
    const report = await getCodeforcesReport('  tourist  ');
    expect(report.handle).toBe('tourist');
    expect(report.totalSolved).toBe(2);
    expect(report.ratingStats).toEqual([
      { rating: 800, count: 1 },
      { rating: 1200, count: 1 },
    ]);
    expect(report.tagStats).toEqual([
      { tag: 'dp', count: 1 },
      { tag: 'graphs', count: 1 },
      { tag: 'math', count: 1 },
    ]);
  });

  test('rejects invalid handles and API failures', async () => {
    await expect(getCodeforcesReport('bad/handle')).rejects.toThrow('格式不正确');
    globalThis.fetch = (async () =>
      jsonResponse({ status: 'FAILED', comment: 'handle not found' })) as unknown as typeof fetch;
    await expect(getCodeforcesReport('missing')).rejects.toThrow('handle not found');

    globalThis.fetch = (async () => jsonResponse({ status: 'OK' })) as unknown as typeof fetch;
    await expect(getCodeforcesReport('missing')).rejects.toThrow('格式不正确');
  });
});
