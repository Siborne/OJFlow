import { FormEvent, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Filter,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProblemService } from '@/services/problem';
import { ContestService } from '@/services/contest';
import { cn } from '@/lib/utils';
import { getRatingColor } from '@/utils/rating-colors';
import { PROBLEM_TAGS, getProblemTagLabel } from '../../shared/problem-tags';
import type { AppLocale, ProblemPlatform } from '../../shared/types';
import { useI18n } from '@/i18n';

const RATING_OPTIONS = [800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 3000];
const POPULAR_TAGS = [
  'implementation',
  'math',
  'greedy',
  'dp',
  'data structures',
  'graphs',
  'binary search',
  'constructive algorithms',
  'strings',
  'trees',
  'two pointers',
  'prefix sum',
];

const PLATFORM_OPTIONS: Array<{ value: ProblemPlatform | 'all'; zh: string; en: string }> = [
  { value: 'all', zh: '全部平台', en: 'All Platforms' },
  { value: 'Codeforces', zh: 'Codeforces', en: 'Codeforces' },
  { value: 'AtCoder', zh: 'AtCoder', en: 'AtCoder' },
  { value: '力扣', zh: '力扣', en: 'LeetCode' },
  { value: '洛谷', zh: '洛谷', en: 'Luogu' },
  { value: '牛客', zh: '牛客', en: 'Nowcoder' },
  { value: 'QOJ', zh: 'QOJ', en: 'QOJ' },
];

const PLATFORM_ACCENTS: Record<ProblemPlatform, string> = {
  Codeforces: '#2563eb',
  AtCoder: '#475569',
  力扣: '#d97706',
  洛谷: '#0ea5e9',
  牛客: '#14b8a6',
  QOJ: '#8b5cf6',
};

const COPY = {
  'zh-CN': {
    title: '题目检索',
    atlas: 'Problem Atlas',
    hero: '从六个题库里，找到下一道值得做的题',
    heroDesc:
      '平台接口在主进程聚合，单站异常不会拖垮整次检索。中文标签只用于显示，筛选仍对应平台原始值。',
    searchPlaceholder: '搜索题号、英文题名或中文题名，例如 1920F2 / 动态规划',
    minDifficulty: '最低难度',
    maxDifficulty: '最高难度',
    filter: '筛选',
    allTags: '所有标签',
    moreTags: '展开更多标签',
    fewerTags: '收起标签',
    reset: '清空条件',
    loading: '正在连接题库...',
    updating: '正在更新结果...',
    page: '页',
    previous: '上一页',
    next: '下一页',
    retry: '重试',
    loadFailed: '题库加载失败',
    noMatch: '没有匹配的题目',
    noMatchDesc: '试试减少标签或放宽难度范围。',
    sourceFailed: '部分平台暂不可用，其他平台结果仍可正常浏览。',
    sourceSummary: '来源状态',
    total: '道题',
    open: '打开题目',
    pageCount: '每页 60 道',
  },
  'en-US': {
    title: 'Problem Atlas',
    atlas: 'Multi-judge Library',
    hero: 'Find the next problem worth solving',
    heroDesc:
      'Six judges are aggregated in the main process, so one source failure never blocks the rest.',
    searchPlaceholder: 'Search problem ID, title, or topic, e.g. 1920F2 / dynamic programming',
    minDifficulty: 'Min difficulty',
    maxDifficulty: 'Max difficulty',
    filter: 'Apply',
    allTags: 'All topics',
    moreTags: 'Show more topics',
    fewerTags: 'Show fewer topics',
    reset: 'Reset',
    loading: 'Connecting to problem sources...',
    updating: 'Updating results...',
    page: 'Page',
    previous: 'Previous',
    next: 'Next',
    retry: 'Retry',
    loadFailed: 'Failed to load problems',
    noMatch: 'No matching problems',
    noMatchDesc: 'Try fewer topics or a wider difficulty range.',
    sourceFailed: 'Some sources are unavailable. Results from healthy sources are still shown.',
    sourceSummary: 'Source status',
    total: 'problems',
    open: 'Open problem',
    pageCount: '60 per page',
  },
} as const;

interface AppliedFilters {
  query: string;
  platform: ProblemPlatform | 'all';
  tag: string;
  minRating: number;
  maxRating: number;
  page: number;
}

const INITIAL_FILTERS: AppliedFilters = {
  query: '',
  platform: 'all',
  tag: '',
  minRating: 0,
  maxRating: 0,
  page: 1,
};

function platformLabel(platform: ProblemPlatform | 'all', locale: AppLocale): string {
  return (
    PLATFORM_OPTIONS.find(option => option.value === platform)?.[
      locale === 'zh-CN' ? 'zh' : 'en'
    ] ?? platform
  );
}

function difficultyLabel(
  problem: {
    rating?: number;
    difficultyLabel?: string;
    platform: ProblemPlatform;
  },
  locale: AppLocale,
): string {
  if (problem.rating) return String(problem.rating);
  if (!problem.difficultyLabel) return platformLabel(problem.platform, locale);
  if (problem.platform !== '力扣') return problem.difficultyLabel;
  if (locale === 'zh-CN') {
    if (problem.difficultyLabel === 'Easy') return '简单';
    if (problem.difficultyLabel === 'Medium') return '中等';
    if (problem.difficultyLabel === 'Hard') return '困难';
  }
  return problem.difficultyLabel;
}

export default function ProblemsPage() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const [draftQuery, setDraftQuery] = useState('');
  const [draftPlatform, setDraftPlatform] = useState<ProblemPlatform | 'all'>('all');
  const [draftMinRating, setDraftMinRating] = useState(0);
  const [draftMaxRating, setDraftMaxRating] = useState(0);
  const [draftTag, setDraftTag] = useState('');
  const [filters, setFilters] = useState<AppliedFilters>(INITIAL_FILTERS);
  const [showAllTags, setShowAllTags] = useState(false);

  const problemQuery = useQuery({
    queryKey: ['problems', filters],
    queryFn: () =>
      ProblemService.search({
        query: filters.query || undefined,
        platform: filters.platform,
        tag: filters.tag || undefined,
        minRating: filters.minRating || undefined,
        maxRating: filters.maxRating || undefined,
        page: filters.page,
        pageSize: 60,
      }),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  const result = problemQuery.data;
  const pageCount = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  const sources = result?.sources ?? [];
  const failedSources = sources.filter(source => !source.success);
  const successfulSources = sources.filter(source => source.success);
  const activeFilterCount = useMemo(
    () =>
      Number(Boolean(filters.query)) +
      Number(filters.platform !== 'all') +
      Number(Boolean(filters.tag)) +
      Number(Boolean(filters.minRating)) +
      Number(Boolean(filters.maxRating)),
    [filters],
  );
  const visibleTags = showAllTags
    ? PROBLEM_TAGS
    : PROBLEM_TAGS.filter(tag => POPULAR_TAGS.includes(tag.id));

  const applyFilters = (event?: FormEvent) => {
    event?.preventDefault();
    setFilters({
      query: draftQuery.trim(),
      platform: draftPlatform,
      tag: draftTag.trim(),
      minRating: draftMinRating,
      maxRating: draftMaxRating,
      page: 1,
    });
  };

  const selectPlatform = (platform: ProblemPlatform | 'all') => {
    setDraftPlatform(platform);
    setFilters(current => ({ ...current, platform, page: 1 }));
  };

  const resetFilters = () => {
    setDraftQuery('');
    setDraftPlatform('all');
    setDraftTag('');
    setDraftMinRating(0);
    setDraftMaxRating(0);
    setFilters(INITIAL_FILTERS);
  };

  const applyTag = (tag: string) => {
    const nextTag = draftTag === tag ? '' : tag;
    setDraftTag(nextTag);
    setFilters(current => ({ ...current, tag: nextTag, page: 1 }));
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader
        title={copy.title}
        actions={
          <span className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-highlight)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)] shadow-[var(--clay-inset)]">
            {result
              ? `${result.total.toLocaleString()} ${copy.total}`
              : locale === 'zh-CN'
                ? '六站聚合'
                : '6 sources'}
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        <div className="mx-auto max-w-6xl space-y-4">
          <section className="glass-panel relative overflow-hidden rounded-[var(--radius-2xl)] p-5 md:p-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[var(--orb-secondary)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-24 h-48 w-48 rounded-full bg-[var(--orb-primary)] blur-3xl" />
            <div className="relative z-10 grid gap-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                  <Sparkles size={16} />
                  {copy.atlas}
                </div>
                <h3 className="max-w-2xl text-2xl font-[720] leading-tight tracking-[-0.035em] text-[var(--color-text)] md:text-[28px]">
                  {copy.hero}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
                  {copy.heroDesc}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="clay-stat">
                  <strong>{successfulSources.length}</strong>
                  <span>{locale === 'zh-CN' ? '可用来源' : 'Online'}</span>
                </div>
                <div className="clay-stat">
                  <strong>
                    {sources.reduce((sum, source) => sum + source.count, 0).toLocaleString()}
                  </strong>
                  <span>{locale === 'zh-CN' ? '索引题目' : 'Indexed'}</span>
                </div>
                <div className="clay-stat">
                  <strong>{filters.platform === 'all' ? 6 : 1}</strong>
                  <span>{locale === 'zh-CN' ? '查询范围' : 'Scope'}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-[var(--radius-xl)] p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map(platform => {
                const isActive = draftPlatform === platform.value;
                const source = sources.find(item => item.platform === platform.value);
                return (
                  <button
                    key={platform.value}
                    type="button"
                    onClick={() => selectPlatform(platform.value)}
                    className={cn(
                      'platform-filter inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all',
                      isActive
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[var(--clay-shadow-sm)]'
                        : 'border-[var(--glass-border)] bg-[var(--glass-highlight)] text-[var(--color-text-soft)] hover:-translate-y-0.5 hover:border-[var(--color-primary)]',
                    )}
                    aria-pressed={isActive}
                  >
                    {platformLabel(platform.value, locale)}
                    {source && (
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          source.success ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]',
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={applyFilters}
              className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_132px_132px_auto]"
            >
              <label className="relative block">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                />
                <input
                  value={draftQuery}
                  onChange={event => setDraftQuery(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="clay-input h-11 w-full pl-10 pr-3 text-sm"
                  aria-label={copy.searchPlaceholder}
                />
              </label>
              <select
                value={draftMinRating}
                onChange={event => setDraftMinRating(Number(event.target.value))}
                className="clay-input h-11 px-3 text-sm"
                aria-label={copy.minDifficulty}
              >
                <option value={0}>{copy.minDifficulty}</option>
                {RATING_OPTIONS.map(rating => (
                  <option key={rating} value={rating}>
                    {rating}
                  </option>
                ))}
              </select>
              <select
                value={draftMaxRating}
                onChange={event => setDraftMaxRating(Number(event.target.value))}
                className="clay-input h-11 px-3 text-sm"
                aria-label={copy.maxDifficulty}
              >
                <option value={0}>{copy.maxDifficulty}</option>
                {RATING_OPTIONS.map(rating => (
                  <option key={rating} value={rating}>
                    {rating}
                  </option>
                ))}
              </select>
              <Button type="submit" className="h-11 gap-2 rounded-[13px]">
                <Filter size={16} />
                {copy.filter}
              </Button>
            </form>

            <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)]">
              <SlidersHorizontal size={14} />
              {copy.allTags}
              {draftTag && (
                <span className="rounded-full bg-[var(--color-primary-weak)] px-2 py-0.5 text-[var(--color-primary)]">
                  {getProblemTagLabel(draftTag, locale)}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {visibleTags.map(tag => {
                const isActive = draftTag === tag.id;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => applyTag(tag.id)}
                    className={cn(
                      'tag-chip rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                      isActive
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-weak)] text-[var(--color-primary)] shadow-[var(--clay-inset)]'
                        : 'border-[var(--glass-border)] bg-[var(--glass-highlight)] text-[var(--color-text-muted)] hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:text-[var(--color-text)]',
                    )}
                    aria-pressed={isActive}
                  >
                    {getProblemTagLabel(tag.id, locale)}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowAllTags(value => !value)}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-weak)]"
                aria-expanded={showAllTags}
              >
                {showAllTags ? copy.fewerTags : copy.moreTags}
                <ChevronDown
                  size={14}
                  className={cn('transition-transform', showAllTags && 'rotate-180')}
                />
              </button>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="ml-auto inline-flex items-center gap-1 px-2 text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                >
                  <X size={13} />
                  {copy.reset} ({activeFilterCount})
                </button>
              )}
            </div>
          </section>

          {failedSources.length > 0 && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-warning)]/30 bg-[var(--color-warning-weak)] px-4 py-3 text-xs text-[var(--color-warning)]">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle size={15} />
                {copy.sourceFailed}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {failedSources.map(source => (
                  <span
                    key={source.platform}
                    className="rounded-full bg-[var(--color-surface)]/50 px-2 py-1"
                    title={source.error}
                  >
                    {platformLabel(source.platform, locale)}: {source.error ?? 'error'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {sources.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-1 text-[11px] text-[var(--color-text-muted)]">
              <span className="font-semibold">{copy.sourceSummary}</span>
              {sources.map(source => (
                <button
                  key={source.platform}
                  type="button"
                  onClick={() => selectPlatform(source.platform)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-highlight)] px-2.5 py-1 transition hover:border-[var(--color-primary)]"
                >
                  {source.success ? (
                    <CheckCircle2 size={12} className="text-[var(--color-success)]" />
                  ) : (
                    <AlertCircle size={12} className="text-[var(--color-error)]" />
                  )}
                  {platformLabel(source.platform, locale)}
                  <span className="font-mono">{source.count.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}

          {problemQuery.isError && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-error)] bg-[var(--color-error-weak)] p-4 text-sm text-[var(--color-error)]">
              <div className="font-semibold">{copy.loadFailed}</div>
              <div className="mt-1">
                {locale === 'en-US'
                  ? 'Check your connection and retry.'
                  : problemQuery.error instanceof Error
                    ? problemQuery.error.message
                    : '请检查网络后重试'}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => problemQuery.refetch()}
              >
                {copy.retry}
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 px-1">
            <div className="text-sm text-[var(--color-text-muted)]">
              {problemQuery.isFetching && !problemQuery.isLoading
                ? copy.updating
                : result
                  ? `${copy.page} ${result.page} / ${pageCount} · ${copy.pageCount}`
                  : copy.loading}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1 || problemQuery.isFetching}
                onClick={() => setFilters(current => ({ ...current, page: current.page - 1 }))}
              >
                {copy.previous}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page >= pageCount || problemQuery.isFetching}
                onClick={() => setFilters(current => ({ ...current, page: current.page + 1 }))}
              >
                {copy.next}
              </Button>
            </div>
          </div>

          {problemQuery.isLoading ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {Array.from({ length: 10 }, (_, index) => (
                <Skeleton key={index} className="h-[118px] w-full rounded-[var(--radius-lg)]" />
              ))}
            </div>
          ) : result?.problems.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {result.problems.map((problem, index) => {
                const accent = PLATFORM_ACCENTS[problem.platform];
                const displayName =
                  locale === 'zh-CN' && problem.titleZh ? problem.titleZh : problem.name;
                const secondaryName =
                  locale === 'zh-CN' && problem.titleZh && problem.titleZh !== problem.name
                    ? problem.name
                    : undefined;

                return (
                  <article
                    key={problem.id}
                    className="problem-card clay-card group animate-stagger-in flex min-h-[118px] items-start gap-3.5 p-4"
                    style={{ animationDelay: `${Math.min(index, 8) * 28}ms` }}
                  >
                    <div
                      className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[15px] border text-xs font-bold shadow-[var(--clay-inset)]"
                      style={{
                        color: problem.rating ? getRatingColor(problem.rating) : accent,
                        borderColor: `${accent}55`,
                        backgroundColor: `${accent}14`,
                      }}
                    >
                      <span className="max-w-[40px] truncate">
                        {difficultyLabel(problem, locale)}
                      </span>
                      <span className="mt-0.5 max-w-[42px] truncate font-mono text-[9px] opacity-70">
                        {problem.index}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide"
                          style={{ color: accent, backgroundColor: `${accent}16` }}
                        >
                          {platformLabel(problem.platform, locale)}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--color-text-muted)]">
                          #{problem.index}
                        </span>
                      </div>
                      <h4 className="line-clamp-2 text-sm font-[640] leading-snug text-[var(--color-text)]">
                        {displayName}
                      </h4>
                      {secondaryName && (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--color-text-muted)]">
                          {secondaryName}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {problem.tags.slice(0, 5).map(tag => (
                          <span
                            key={tag}
                            className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-highlight)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]"
                          >
                            {getProblemTagLabel(tag, locale)}
                          </span>
                        ))}
                        {problem.tags.length === 0 && (
                          <span className="text-[10px] text-[var(--color-text-muted)]/70">
                            {locale === 'zh-CN' ? '暂无标签' : 'No topics'}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 rounded-full opacity-65 group-hover:opacity-100"
                      aria-label={`${copy.open} ${displayName}`}
                      onClick={() => void ContestService.openUrl(problem.url)}
                    >
                      <ExternalLink size={17} />
                    </Button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel rounded-[var(--radius-xl)] px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[20px] bg-[var(--color-primary-weak)] text-[var(--color-primary)] shadow-[var(--clay-inset)]">
                <Search size={24} />
              </div>
              <div className="text-base font-semibold text-[var(--color-text)]">{copy.noMatch}</div>
              <div className="mt-1 text-sm text-[var(--color-text-muted)]">{copy.noMatchDesc}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
