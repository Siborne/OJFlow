import type { ProblemSummary } from '../../../shared/types';
import {
  cleanText,
  createCachedLoader,
  extractNumericId,
  fetchText,
  parseHtml,
  toAbsoluteUrl,
} from '../problem-source';

const MAX_PAGES = 8;

interface HtmlProblemConfig {
  platform: '牛客' | 'QOJ';
  baseUrl: string;
  selector: string;
  hrefPrefix: string;
  idPattern: RegExp;
}

function parseAnchorProblems(html: string, config: HtmlProblemConfig): ProblemSummary[] {
  const $ = parseHtml(html);
  const problems: ProblemSummary[] = [];

  $(config.selector).each((_index, element) => {
    const href = cleanText($(element).attr('href'));
    if (!href.includes(config.hrefPrefix)) return;

    let pathname = href;
    try {
      pathname = new URL(href, config.baseUrl).pathname;
    } catch {
      return;
    }
    const id = pathname.match(config.idPattern)?.[1] ?? extractNumericId(pathname);
    if (!/^\d+$/.test(id)) return;
    const name =
      cleanText($(element).text()) ||
      cleanText($(element).attr('title')) ||
      cleanText($(element).attr('aria-label'));
    if (!id || !name) return;

    problems.push({
      id: `${config.platform}:${id}`,
      platform: config.platform,
      index: id,
      name,
      titleZh: name,
      tags: [],
      url: toAbsoluteUrl(config.baseUrl, href),
    });
  });

  const unique = new Map<string, ProblemSummary>();
  for (const problem of problems) {
    if (!unique.has(problem.id)) unique.set(problem.id, problem);
  }
  return Array.from(unique.values());
}

export function parseNowcoderProblems(html: string): ProblemSummary[] {
  return parseAnchorProblems(html, {
    platform: '牛客',
    baseUrl: 'https://ac.nowcoder.com',
    selector: 'a[href*="/acm/problem/"]',
    hrefPrefix: '/acm/problem/',
    idPattern: /^\/acm\/problem\/(\d+)(?:\/|$)/,
  });
}

export function parseQojProblems(html: string): ProblemSummary[] {
  return parseAnchorProblems(html, {
    platform: 'QOJ',
    baseUrl: 'https://qoj.ac',
    selector: 'a[href*="/problem/"]',
    hrefPrefix: '/problem/',
    idPattern: /^\/problem\/(\d+)(?:\/|$)/,
  });
}

async function loadHtmlProblems(
  label: string,
  parse: (html: string) => ProblemSummary[],
  buildPageUrl: (page: number) => string,
): Promise<ProblemSummary[]> {
  const collected = new Map<string, ProblemSummary>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const html = await fetchText(buildPageUrl(page), {
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    const problems = parse(html);
    if (problems.length === 0) {
      if (page === 1) throw new Error(`${label} 题库暂不可访问或页面结构已变化`);
      break;
    }

    let added = 0;
    for (const problem of problems) {
      if (!collected.has(problem.id)) {
        collected.set(problem.id, problem);
        added++;
      }
    }
    if (added === 0) break;
  }

  return Array.from(collected.values());
}

const nowcoderCache = createCachedLoader(() =>
  loadHtmlProblems(
    '牛客',
    parseNowcoderProblems,
    page => `https://ac.nowcoder.com/acm/problem/list?page=${page}&pageSize=100`,
  ),
);

const qojCache = createCachedLoader(() =>
  loadHtmlProblems('QOJ', parseQojProblems, page => `https://qoj.ac/problems?page=${page}`),
);

export const nowcoderProblemProvider = {
  platform: '牛客' as const,
  load: nowcoderCache.load,
};

export const qojProblemProvider = {
  platform: 'QOJ' as const,
  load: qojCache.load,
};

export function clearHtmlProblemCaches(): void {
  nowcoderCache.clear();
  qojCache.clear();
}
