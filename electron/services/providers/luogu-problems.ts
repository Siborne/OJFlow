import type { ProblemSummary } from '../../../shared/types';
import { normalizeProblemTag } from '../../../shared/problem-tags';
import { cleanText, createCachedLoader, fetchJson, uniqueStrings } from '../problem-source';

const LUOGU_PROBLEM_LIST_URL = 'https://www.luogu.com.cn/problem/list';
const MAX_PAGES = 10;

const LUOGU_TAG_NAMES: Record<number, string> = {
  1: '模拟',
  2: '字符串',
  3: '动态规划',
  4: '图论',
  5: '数学',
  6: '贪心',
  7: '二分',
  8: '搜索',
  9: '计算几何',
  10: '背包',
  11: '并查集',
  12: '递推',
  13: '树形 DP',
  14: '线段树',
  15: '树状数组',
  16: '网络流',
  17: '最短路',
  18: '最小生成树',
  19: '拓扑排序',
  20: '哈希',
};

const LUOGU_DIFFICULTY_NAMES: Record<number, string> = {
  0: '暂无评定',
  1: '入门',
  2: '普及−',
  3: '普及/提高−',
  4: '普及+/提高',
  5: '提高+/省选−',
  6: '省选/NOI−',
  7: 'NOI/NOI+/CTSC',
};

interface LuoguProblem {
  pid?: unknown;
  title?: unknown;
  difficulty?: unknown;
  tags?: unknown;
}

interface LuoguProblemListPayload {
  currentData?: {
    problems?: {
      result?: unknown;
      count?: unknown;
      perPage?: unknown;
    };
  };
}

export function parseLuoguProblemList(payload: unknown): {
  problems: ProblemSummary[];
  total: number;
} {
  const data = (payload as LuoguProblemListPayload)?.currentData?.problems;
  if (!data || !Array.isArray(data.result)) {
    return { problems: [], total: 0 };
  }

  const problems = data.result
    .map((item): ProblemSummary | null => {
      const raw = item as LuoguProblem;
      const pid = cleanText(raw.pid);
      const title = cleanText(raw.title);
      if (!pid || !title) return null;

      const difficultyNumber = Number(raw.difficulty);
      const tags = Array.isArray(raw.tags)
        ? uniqueStrings(
            raw.tags
              .map(tag => Number(tag))
              .map(tag => LUOGU_TAG_NAMES[tag] ?? '')
              .map(normalizeProblemTag),
          )
        : [];

      return {
        id: `Luogu:${pid}`,
        platform: '洛谷' as const,
        index: pid,
        name: title,
        titleZh: title,
        difficultyLabel: Number.isFinite(difficultyNumber)
          ? LUOGU_DIFFICULTY_NAMES[difficultyNumber]
          : undefined,
        tags,
        url: `https://www.luogu.com.cn/problem/${encodeURIComponent(pid)}`,
      };
    })
    .filter((problem): problem is ProblemSummary => problem !== null);

  const total = Number(data.count);
  return {
    problems,
    total: Number.isFinite(total) ? total : problems.length,
  };
}

async function loadLuoguProblems(): Promise<ProblemSummary[]> {
  const collected = new Map<string, ProblemSummary>();
  let expectedTotal = Number.POSITIVE_INFINITY;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `${LUOGU_PROBLEM_LIST_URL}?type=P&page=${page}&_contentOnly=1`;
    const payload = await fetchJson<unknown>(url, {
      headers: {
        'x-lentille-request': 'content-only',
        'x-luogu-type': 'content-only',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    const parsed = parseLuoguProblemList(payload);
    if (parsed.problems.length === 0) {
      if (page === 1) throw new Error('洛谷题库返回格式不正确');
      break;
    }

    const sizeBeforePage = collected.size;
    for (const problem of parsed.problems) collected.set(problem.id, problem);
    expectedTotal = parsed.total || expectedTotal;
    if (collected.size >= expectedTotal || collected.size === sizeBeforePage) break;
  }

  return Array.from(collected.values());
}

const cache = createCachedLoader(loadLuoguProblems);

export const luoguProblemProvider = {
  platform: '洛谷' as const,
  load: cache.load,
};

export function clearLuoguProblemCache(): void {
  cache.clear();
}
