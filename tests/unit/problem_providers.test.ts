import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  atCoderProblemProvider,
  clearAtCoderProblemCache,
  parseAtCoderProblems,
} from '../../electron/services/providers/atcoder-problems';
import {
  clearLeetCodeProblemCache,
  leetCodeProblemProvider,
  parseLeetCodeQuestionList,
} from '../../electron/services/providers/leetcode-problems';
import {
  clearLuoguProblemCache,
  luoguProblemProvider,
  parseLuoguProblemList,
} from '../../electron/services/providers/luogu-problems';
import {
  clearHtmlProblemCaches,
  parseNowcoderProblems,
  parseQojProblems,
} from '../../electron/services/providers/html-problems';
import { jsonResponse, textResponse } from './helpers';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  clearAtCoderProblemCache();
  clearLeetCodeProblemCache();
  clearLuoguProblemCache();
  clearHtmlProblemCaches();
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('AtCoder problem provider', () => {
  const payload = [
    {
      id: 'abc001_a',
      contest_id: 'abc001',
      problem_index: 'A',
      title: 'A - Snowball',
      difficulty: 1200,
    },
    { id: 'bad', contest_id: 'abc999', problem_index: 'B', title: '' },
  ];

  test('parses, normalizes and caches merged problem data', async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return jsonResponse(payload);
    }) as unknown as typeof fetch;

    const first = await atCoderProblemProvider.load();
    const second = await atCoderProblemProvider.load();
    expect(first).toEqual(parseAtCoderProblems(payload));
    expect(first[0]).toMatchObject({
      id: 'AtCoder:abc001_a',
      platform: 'AtCoder',
      index: 'A',
      name: 'A - Snowball',
      rating: 1200,
      url: 'https://atcoder.jp/contests/abc001/tasks/abc001_a',
    });
    expect(second).toBe(first);
    expect(calls).toBe(1);
  });
});

describe('LeetCode problem provider', () => {
  const payload = {
    data: {
      problemsetQuestionList: {
        total: 2,
        hasMore: false,
        questions: [
          {
            frontendQuestionId: '1',
            title: 'Two Sum',
            titleCn: '两数之和',
            titleSlug: 'two-sum',
            difficulty: 'Easy',
            topicTags: [{ nameTranslated: '数组' }, { nameTranslated: '哈希表' }],
          },
          {
            frontendQuestionId: '53',
            title: 'Maximum Subarray',
            titleCn: '最大子数组和',
            titleSlug: 'maximum-subarray',
            difficulty: 'Medium',
            topicTags: [{ name: 'Dynamic Programming' }],
          },
        ],
      },
    },
  };

  test('parses bilingual titles and canonical topic tags', () => {
    const parsed = parseLeetCodeQuestionList(payload);
    expect(parsed.total).toBe(2);
    expect(parsed.problems[0]).toMatchObject({
      id: 'LeetCode:1',
      platform: '力扣',
      titleZh: '两数之和',
      difficultyLabel: 'Easy',
      tags: ['arrays', 'hash table'],
      url: 'https://leetcode.cn/problems/two-sum/',
    });
    expect(parsed.problems[1].tags).toEqual(['dp']);
  });

  test('loads through the LeetCode GraphQL endpoint', async () => {
    const bodies: Array<{ operationName?: string }> = [];
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body ?? '{}')) as { operationName?: string });
      return jsonResponse(payload);
    }) as unknown as typeof fetch;

    const problems = await leetCodeProblemProvider.load();
    expect(problems).toHaveLength(2);
    expect(bodies[0]?.operationName).toBe('problemsetQuestionList');
  });
});

describe('Luogu problem provider', () => {
  const payload = {
    currentData: {
      problems: {
        count: 1,
        result: [
          {
            pid: 'P1001',
            title: 'A+B Problem',
            difficulty: 1,
            tags: [1, 3],
          },
        ],
      },
    },
  };

  test('parses difficulty and maps topic ids', () => {
    const parsed = parseLuoguProblemList(payload);
    expect(parsed.problems[0]).toMatchObject({
      id: 'Luogu:P1001',
      platform: '洛谷',
      titleZh: 'A+B Problem',
      difficultyLabel: '入门',
      tags: ['simulation', 'dp'],
      url: 'https://www.luogu.com.cn/problem/P1001',
    });
  });

  test('loads the JSON problem list endpoint', async () => {
    let requestUrl = '';
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      requestUrl = String(url);
      const headers = new Headers(init?.headers);
      expect(headers.get('x-lentille-request')).toBe('content-only');
      return jsonResponse(payload);
    }) as unknown as typeof fetch;

    const problems = await luoguProblemProvider.load();
    expect(problems).toHaveLength(1);
    expect(requestUrl).toContain('problem/list?type=P&page=1');
  });
});

describe('HTML problem providers', () => {
  test('parses Nowcoder and QOJ problem links without duplicates', () => {
    const nowcoder = parseNowcoderProblems(`
      <a href="/acm/problem/list">题库</a>
      <a href="/acm/problem/123">牛客练习 A</a>
      <a href="/acm/problem/123">重复</a>
      <a href="/acm/problem/456" title="练习 B"></a>
    `);
    expect(nowcoder).toHaveLength(2);
    expect(nowcoder[0]).toMatchObject({
      id: '牛客:123',
      platform: '牛客',
      name: '牛客练习 A',
      url: 'https://ac.nowcoder.com/acm/problem/123',
    });

    const qoj = parseQojProblems(`
      <table><tr><td><a href="/problem/1001">QOJ 1001</a></td></tr></table>
    `);
    expect(qoj[0]).toMatchObject({
      id: 'QOJ:1001',
      platform: 'QOJ',
      name: 'QOJ 1001',
      url: 'https://qoj.ac/problem/1001',
    });
  });

  test('reports inaccessible HTML sources', async () => {
    globalThis.fetch = (async () =>
      textResponse('<html><body>empty</body></html>')) as unknown as typeof fetch;
    const { nowcoderProblemProvider } =
      await import('../../electron/services/providers/html-problems');
    await expect(nowcoderProblemProvider.load()).rejects.toThrow('暂不可访问');
  });
});
