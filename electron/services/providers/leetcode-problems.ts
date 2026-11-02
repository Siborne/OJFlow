import type { ProblemSummary } from '../../../shared/types';
import { normalizeProblemTag } from '../../../shared/problem-tags';
import { cleanText, createCachedLoader, postJson, uniqueStrings } from '../problem-source';

const GRAPHQL_URL = 'https://leetcode.cn/graphql/';
const PAGE_SIZE = 100;
const MAX_PAGES = 30;

const QUESTION_LIST_QUERY = `
  query problemsetQuestionList(
    $categorySlug: String
    $limit: Int
    $skip: Int
    $filters: QuestionListFilterInput
  ) {
    problemsetQuestionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      total
      hasMore
      questions {
        frontendQuestionId
        title
        titleCn
        titleSlug
        difficulty
        topicTags {
          name
          slug
          nameTranslated
        }
      }
    }
  }
`;

interface LeetCodeTopicTag {
  name?: unknown;
  slug?: unknown;
  nameTranslated?: unknown;
  translatedName?: unknown;
}

interface LeetCodeQuestion {
  frontendQuestionId?: unknown;
  title?: unknown;
  titleCn?: unknown;
  titleSlug?: unknown;
  difficulty?: unknown;
  topicTags?: unknown;
}

interface LeetCodeQuestionList {
  total?: unknown;
  hasMore?: unknown;
  questions?: unknown;
}

function normalizeQuestion(raw: LeetCodeQuestion): ProblemSummary | null {
  const index = cleanText(raw.frontendQuestionId);
  const slug = cleanText(raw.titleSlug);
  const name = cleanText(raw.title);
  if (!index || !slug || !name) return null;

  const topicTags = Array.isArray(raw.topicTags) ? raw.topicTags : [];
  const tags = uniqueStrings(
    topicTags
      .map(tag => {
        const value = tag as LeetCodeTopicTag;
        return normalizeProblemTag(
          cleanText(value.nameTranslated) ||
            cleanText(value.translatedName) ||
            cleanText(value.slug) ||
            cleanText(value.name),
        );
      })
      .filter(Boolean),
  );

  return {
    id: `LeetCode:${index}`,
    platform: '力扣',
    index,
    name,
    titleZh: cleanText(raw.titleCn) || undefined,
    difficultyLabel: cleanText(raw.difficulty) || undefined,
    tags,
    url: `https://leetcode.cn/problems/${encodeURIComponent(slug)}/`,
  };
}

export function parseLeetCodeQuestionList(payload: unknown): {
  problems: ProblemSummary[];
  total: number;
  hasMore: boolean;
} {
  const root = payload as {
    data?: { problemsetQuestionList?: LeetCodeQuestionList };
  };
  const list = root?.data?.problemsetQuestionList;
  if (!list || !Array.isArray(list.questions)) {
    return { problems: [], total: 0, hasMore: false };
  }

  const problems = list.questions
    .map(item => normalizeQuestion(item as LeetCodeQuestion))
    .filter((problem): problem is ProblemSummary => problem !== null);
  const total = Number(list.total);
  return {
    problems,
    total: Number.isFinite(total) ? total : problems.length,
    hasMore: list.hasMore === true,
  };
}

async function loadLeetCodeProblems(): Promise<ProblemSummary[]> {
  const problems: ProblemSummary[] = [];
  let expectedTotal = Number.POSITIVE_INFINITY;

  for (let page = 0; page < MAX_PAGES; page++) {
    const payload = await postJson<unknown>(GRAPHQL_URL, {
      operationName: 'problemsetQuestionList',
      variables: {
        categorySlug: '',
        limit: PAGE_SIZE,
        skip: page * PAGE_SIZE,
        filters: {},
      },
      query: QUESTION_LIST_QUERY,
    });
    const parsed = parseLeetCodeQuestionList(payload);
    if (parsed.problems.length === 0) {
      if (page === 0) {
        const errors = (payload as { errors?: Array<{ message?: string }> })?.errors;
        throw new Error(errors?.[0]?.message || '力扣题库返回格式不正确');
      }
      break;
    }

    problems.push(...parsed.problems);
    if (Number.isFinite(parsed.total)) expectedTotal = parsed.total;
    if (
      (!parsed.hasMore && problems.length >= expectedTotal) ||
      parsed.problems.length < PAGE_SIZE ||
      problems.length >= expectedTotal
    ) {
      break;
    }
  }

  return problems;
}

const cache = createCachedLoader(loadLeetCodeProblems);

export const leetCodeProblemProvider = {
  platform: '力扣' as const,
  load: cache.load,
};

export function clearLeetCodeProblemCache(): void {
  cache.clear();
}
