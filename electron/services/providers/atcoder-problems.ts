import type { ProblemSummary } from '../../../shared/types';
import { normalizeProblemTag } from '../../../shared/problem-tags';
import { cleanText, createCachedLoader, fetchJson, uniqueStrings } from '../problem-source';

const MERGED_PROBLEMS_URL = 'https://kenkoooo.com/atcoder/resources/merged-problems.json';

interface AtCoderProblem {
  id?: unknown;
  contest_id?: unknown;
  problem_index?: unknown;
  name?: unknown;
  title?: unknown;
  difficulty?: unknown;
  tags?: unknown;
}

function normalizeAtCoderProblem(raw: AtCoderProblem): ProblemSummary | null {
  const externalId = cleanText(raw.id);
  const contestId = cleanText(raw.contest_id);
  const index = cleanText(raw.problem_index) || externalId.split('_').at(-1)?.toUpperCase() || '-';
  const name = cleanText(raw.title) || cleanText(raw.name);
  if (!externalId || !contestId || !name) return null;

  const difficulty = Number(raw.difficulty);
  const tags = Array.isArray(raw.tags)
    ? uniqueStrings(
        raw.tags.filter((tag): tag is string => typeof tag === 'string').map(normalizeProblemTag),
      )
    : [];

  return {
    id: `AtCoder:${externalId}`,
    platform: 'AtCoder',
    index,
    name,
    difficultyLabel:
      Number.isFinite(difficulty) && difficulty > 0 ? String(Math.round(difficulty)) : undefined,
    rating: Number.isFinite(difficulty) && difficulty > 0 ? Math.round(difficulty) : undefined,
    tags,
    url: `https://atcoder.jp/contests/${encodeURIComponent(contestId)}/tasks/${encodeURIComponent(externalId)}`,
  };
}

async function loadAtCoderProblems(): Promise<ProblemSummary[]> {
  const payload = await fetchJson<unknown>(MERGED_PROBLEMS_URL);
  if (!Array.isArray(payload)) {
    throw new Error('AtCoder 题库返回格式不正确');
  }
  return payload
    .map(item => normalizeAtCoderProblem(item as AtCoderProblem))
    .filter((problem): problem is ProblemSummary => problem !== null)
    .sort(
      (a, b) =>
        (a.rating ?? Number.MAX_SAFE_INTEGER) - (b.rating ?? Number.MAX_SAFE_INTEGER) ||
        a.name.localeCompare(b.name),
    );
}

const cache = createCachedLoader(loadAtCoderProblems);

export const atCoderProblemProvider = {
  platform: 'AtCoder' as const,
  load: cache.load,
};

export function clearAtCoderProblemCache(): void {
  cache.clear();
}

export function parseAtCoderProblems(payload: unknown): ProblemSummary[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map(item => normalizeAtCoderProblem(item as AtCoderProblem))
    .filter((problem): problem is ProblemSummary => problem !== null);
}
