import type {
  ProblemPlatform,
  ProblemSearchRequest,
  ProblemSearchResult,
  ProblemSourceStatus,
  ProblemSummary,
} from '../../shared/types';
import { getProblemTagLabel, normalizeProblemTag } from '../../shared/problem-tags';
import { clearCodeforcesProblemCache, listCodeforcesProblems } from './codeforces-service';
import { atCoderProblemProvider, clearAtCoderProblemCache } from './providers/atcoder-problems';
import {
  clearHtmlProblemCaches,
  nowcoderProblemProvider,
  qojProblemProvider,
} from './providers/html-problems';
import { clearLeetCodeProblemCache, leetCodeProblemProvider } from './providers/leetcode-problems';
import { clearLuoguProblemCache, luoguProblemProvider } from './providers/luogu-problems';
import { clampPage, clampPageSize, errorMessage } from './problem-source';

export const PROBLEM_PLATFORMS: ProblemPlatform[] = [
  'Codeforces',
  'AtCoder',
  '力扣',
  '洛谷',
  '牛客',
  'QOJ',
];

export interface ProblemProvider {
  platform: ProblemPlatform;
  load: () => Promise<ProblemSummary[]>;
}

const codeforcesProvider: ProblemProvider = {
  platform: 'Codeforces',
  load: listCodeforcesProblems,
};

const providers: ProblemProvider[] = [
  codeforcesProvider,
  atCoderProblemProvider,
  leetCodeProblemProvider,
  luoguProblemProvider,
  nowcoderProblemProvider,
  qojProblemProvider,
];

function getSelectedProviders(
  platform: ProblemSearchRequest['platform'],
  availableProviders: ProblemProvider[],
): ProblemProvider[] {
  if (!platform || platform === 'all') return availableProviders;
  return availableProviders.filter(provider => provider.platform === platform);
}

function matchesProblem(problem: ProblemSummary, request: ProblemSearchRequest): boolean {
  const query = String(request.query ?? '')
    .trim()
    .toLowerCase();
  if (query) {
    const localizedTags = problem.tags.flatMap(tag => [
      tag,
      getProblemTagLabel(tag, 'zh-CN'),
      getProblemTagLabel(tag, 'en-US'),
    ]);
    const searchable = [
      problem.id,
      problem.platform,
      problem.index,
      problem.name,
      problem.titleZh ?? '',
      problem.difficultyLabel ?? '',
      ...localizedTags,
    ]
      .join(' ')
      .toLowerCase();
    if (!searchable.includes(query)) return false;
  }

  const tag = normalizeProblemTag(String(request.tag ?? ''));
  if (tag && !problem.tags.includes(tag)) return false;

  const minRating =
    Number.isFinite(request.minRating) && Number(request.minRating) > 0
      ? Number(request.minRating)
      : 0;
  const maxRating =
    Number.isFinite(request.maxRating) && Number(request.maxRating) > 0
      ? Number(request.maxRating)
      : Number.MAX_SAFE_INTEGER;
  if (problem.rating && (problem.rating < minRating || problem.rating > maxRating)) {
    return false;
  }
  return true;
}

function compareProblems(a: ProblemSummary, b: ProblemSummary): number {
  const platformOrder =
    PROBLEM_PLATFORMS.indexOf(a.platform) - PROBLEM_PLATFORMS.indexOf(b.platform);
  if (platformOrder !== 0) return platformOrder;
  const ratingOrder = (a.rating ?? Number.MAX_SAFE_INTEGER) - (b.rating ?? Number.MAX_SAFE_INTEGER);
  if (ratingOrder !== 0) return ratingOrder;
  return a.index.localeCompare(b.index, undefined, { numeric: true });
}

export async function aggregateProblemSearch(
  request: ProblemSearchRequest = {},
  availableProviders: ProblemProvider[] = providers,
): Promise<ProblemSearchResult> {
  const selected = getSelectedProviders(request.platform, availableProviders);
  const settled = await Promise.allSettled(
    selected.map(async provider => ({
      platform: provider.platform,
      problems: await provider.load(),
    })),
  );

  const allProblems: ProblemSummary[] = [];
  const sources: ProblemSourceStatus[] = [];
  settled.forEach((result, index) => {
    const platform = selected[index].platform;
    if (result.status === 'fulfilled') {
      allProblems.push(...result.value.problems);
      sources.push({
        platform,
        success: true,
        count: result.value.problems.length,
      });
    } else {
      sources.push({
        platform,
        success: false,
        count: 0,
        error: errorMessage(result.reason),
      });
    }
  });

  const uniqueProblems = Array.from(
    new Map(allProblems.map(problem => [problem.id, problem] as const)).values(),
  )
    .filter(problem => matchesProblem(problem, request))
    .sort(compareProblems);
  const pageSize = clampPageSize(request.pageSize);
  const page = clampPage(request.page);
  const start = (page - 1) * pageSize;

  return {
    problems: uniqueProblems.slice(start, start + pageSize),
    total: uniqueProblems.length,
    page,
    pageSize,
    sources,
  };
}

export function searchProblems(request: ProblemSearchRequest = {}): Promise<ProblemSearchResult> {
  return aggregateProblemSearch(request);
}

export function clearProblemSearchCache(): void {
  clearCodeforcesProblemCache();
  clearAtCoderProblemCache();
  clearLeetCodeProblemCache();
  clearLuoguProblemCache();
  clearHtmlProblemCaches();
}
