import type {
  CodeforcesReport,
  ProblemSearchRequest,
  ProblemSearchResult,
  ProblemSummary,
} from '../../shared/types';
import { normalizeProblemTag } from '../../shared/problem-tags';

const API_ROOT = 'https://codeforces.com/api';
const PROBLEM_CACHE_TTL = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;

interface CodeforcesProblem {
  contestId?: number;
  index?: string;
  name?: string;
  rating?: number;
  tags?: string[];
}

interface ProblemsetPayload {
  status: string;
  comment?: string;
  result?: {
    problems?: CodeforcesProblem[];
  };
}

interface UserStatusPayload {
  status: string;
  comment?: string;
  result?: Array<{
    verdict?: string;
    problem?: {
      contestId?: number;
      index?: string;
      name?: string;
      rating?: number;
      tags?: string[];
    };
  }>;
}

let cachedProblems: { data: ProblemSummary[]; fetchedAt: number } | null = null;
let inflightProblems: Promise<ProblemSummary[]> | null = null;

async function fetchCodeforcesJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_ROOT}/${path}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Codeforces API HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeProblem(problem: CodeforcesProblem): ProblemSummary | null {
  if (
    !problem ||
    typeof problem.name !== 'string' ||
    typeof problem.index !== 'string' ||
    problem.name.trim().length === 0
  ) {
    return null;
  }

  const contestId =
    typeof problem.contestId === 'number' && Number.isFinite(problem.contestId)
      ? problem.contestId
      : undefined;
  const url =
    contestId === undefined
      ? 'https://codeforces.com/problemset'
      : `https://codeforces.com/problemset/problem/${contestId}/${problem.index}`;

  return {
    id: `Codeforces:${contestId ?? 'problemset'}-${problem.index}`,
    platform: 'Codeforces',
    contestId,
    index: problem.index,
    name: problem.name,
    rating:
      typeof problem.rating === 'number' && Number.isFinite(problem.rating)
        ? problem.rating
        : undefined,
    tags: Array.isArray(problem.tags)
      ? problem.tags
          .filter((tag): tag is string => typeof tag === 'string')
          .map(normalizeProblemTag)
      : [],
    url,
  };
}

export async function listCodeforcesProblems(): Promise<ProblemSummary[]> {
  if (cachedProblems && Date.now() - cachedProblems.fetchedAt < PROBLEM_CACHE_TTL) {
    return cachedProblems.data;
  }
  if (inflightProblems) return inflightProblems;

  inflightProblems = fetchCodeforcesJson<ProblemsetPayload>('problemset.problems')
    .then(payload => {
      if (payload.status !== 'OK') {
        throw new Error(payload.comment || 'Codeforces 题库接口返回异常');
      }
      const source = payload.result?.problems;
      if (!Array.isArray(source)) {
        throw new Error('Codeforces 题库返回格式不正确');
      }

      const problems = source
        .map(normalizeProblem)
        .filter((problem): problem is ProblemSummary => problem !== null)
        .sort((a, b) => {
          const ratingDiff =
            (a.rating ?? Number.MAX_SAFE_INTEGER) - (b.rating ?? Number.MAX_SAFE_INTEGER);
          if (ratingDiff !== 0) return ratingDiff;
          return (a.contestId ?? 0) - (b.contestId ?? 0) || a.index.localeCompare(b.index);
        });

      cachedProblems = { data: problems, fetchedAt: Date.now() };
      return problems;
    })
    .finally(() => {
      inflightProblems = null;
    });

  return inflightProblems;
}

export async function searchCodeforcesProblems(
  request: ProblemSearchRequest = {},
): Promise<ProblemSearchResult> {
  const problems = await listCodeforcesProblems();
  const query = String(request.query ?? '')
    .trim()
    .toLowerCase();
  const tag = normalizeProblemTag(String(request.tag ?? ''));
  const pageSize = Math.max(10, Math.min(100, Math.floor(Number(request.pageSize) || 40)));
  const page = Math.max(1, Math.floor(Number(request.page) || 1));
  const minRating =
    Number.isFinite(request.minRating) && Number(request.minRating) > 0
      ? Number(request.minRating)
      : 0;
  const maxRating =
    Number.isFinite(request.maxRating) && Number(request.maxRating) > 0
      ? Number(request.maxRating)
      : Number.MAX_SAFE_INTEGER;

  const filtered = problems.filter(problem => {
    if (query) {
      const searchable =
        `${problem.contestId ?? ''}${problem.index} ${problem.name} ${problem.tags.join(' ')}`.toLowerCase();
      if (!searchable.includes(query)) return false;
    }
    if (tag && !problem.tags.includes(tag)) {
      return false;
    }
    const rating = problem.rating ?? 0;
    if (rating > 0 && (rating < minRating || rating > maxRating)) return false;
    return true;
  });

  const start = (page - 1) * pageSize;
  return {
    problems: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
    sources: [{ platform: 'Codeforces', success: true, count: problems.length }],
  };
}

export async function getCodeforcesReport(handle: string): Promise<CodeforcesReport> {
  const cleanHandle = handle.trim();
  if (!cleanHandle || cleanHandle.length > 64 || /[/?#]/.test(cleanHandle)) {
    throw new Error('Codeforces 用户名格式不正确');
  }

  const payload = await fetchCodeforcesJson<UserStatusPayload>(
    `user.status?handle=${encodeURIComponent(cleanHandle)}&from=1&count=1000000000`,
  );
  if (payload.status !== 'OK') {
    throw new Error(payload.comment || 'Codeforces 用户不存在或接口异常');
  }
  if (!Array.isArray(payload.result)) {
    throw new Error('Codeforces 提交记录格式不正确');
  }

  const seen = new Set<string>();
  const ratingMap = new Map<number, number>();
  const tagMap = new Map<string, number>();
  let totalSolved = 0;

  for (const submission of payload.result) {
    if (submission.verdict !== 'OK' || !submission.problem?.name) continue;
    const problem = submission.problem;
    const key = `${problem.contestId ?? ''}-${problem.index ?? ''}-${problem.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    totalSolved++;

    if (typeof problem.rating === 'number' && problem.rating > 0) {
      ratingMap.set(problem.rating, (ratingMap.get(problem.rating) ?? 0) + 1);
    }
    if (Array.isArray(problem.tags)) {
      for (const tag of problem.tags) {
        if (typeof tag === 'string' && tag.trim()) {
          tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
        }
      }
    }
  }

  return {
    handle: cleanHandle,
    totalSolved,
    ratingStats: Array.from(ratingMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([rating, count]) => ({ rating, count })),
    tagStats: Array.from(tagMap.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count })),
  };
}

export function clearCodeforcesProblemCache(): void {
  cachedProblems = null;
  inflightProblems = null;
}
