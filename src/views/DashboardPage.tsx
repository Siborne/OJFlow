import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpenCheck,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  Gauge,
  ListTodo,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { DataDonut } from '@/components/dashboard/DataDonut';
import { Button } from '@/components/ui/button';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useI18n } from '@/i18n';
import { useContestStore } from '@/stores/contest';
import { useScheduleStore } from '@/stores/schedule';
import { getPlatformLabel } from '@/utils/platform-labels';
import { getRatingColor } from '@/utils/rating-colors';
import { getProblemTagLabel } from '../../shared/problem-tags';
import type { ScheduleItem } from '../../shared/types';
import { cn } from '@/lib/utils';

const appLogo = new URL('../assets/icon.png', import.meta.url).href;

const PLATFORM_COLORS: Record<string, string> = {
  Codeforces: '#3b82f6',
  AtCoder: '#64748b',
  力扣: '#f59e0b',
  洛谷: '#22c55e',
  牛客: '#14b8a6',
  VJudge: '#f97316',
  HDU: '#ef4444',
  POJ: '#94a3b8',
  蓝桥云课: '#06b6d4',
  QOJ: '#ec4899',
};

function toDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function greetingKey():
  | 'dashboard.greeting.morning'
  | 'dashboard.greeting.afternoon'
  | 'dashboard.greeting.evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'dashboard.greeting.morning';
  if (hour < 18) return 'dashboard.greeting.afternoon';
  return 'dashboard.greeting.evening';
}

function kindKey(kind: ScheduleItem['kind']) {
  if (kind === 'contest') return 'dashboard.kindContest' as const;
  if (kind === 'practice') return 'dashboard.kindPractice' as const;
  if (kind === 'review') return 'dashboard.kindReview' as const;
  return 'dashboard.kindCustom' as const;
}

function scheduleBadge(kind: ScheduleItem['kind']): string {
  if (kind === 'contest') return 'bg-[#3b82f6]/12 text-[#3b82f6]';
  if (kind === 'practice') return 'bg-[var(--color-success-weak)] text-[var(--color-success)]';
  if (kind === 'review') return 'bg-[var(--color-warning-weak)] text-[var(--color-warning)]';
  return 'bg-[var(--color-primary-weak)] text-[var(--color-primary)]';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const contests = useContestStore(state => state.contests);
  const fetchContests = useContestStore(state => state.fetchContests);
  const scheduleItems = useScheduleStore(state => state.items);
  const scheduleInit = useScheduleStore(state => state.init);
  const addSchedule = useScheduleStore(state => state.addItem);
  const toggleSchedule = useScheduleStore(state => state.toggleCompleted);
  const deleteSchedule = useScheduleStore(state => state.removeItem);
  const dashboard = useDashboardData();
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleNotice, setScheduleNotice] = useState('');
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    startsAt: toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)),
    durationMinutes: 90,
    kind: 'practice' as ScheduleItem['kind'],
    note: '',
  });

  useEffect(() => {
    void scheduleInit();
    if (contests.length === 0) {
      void fetchContests().catch(() => {
        // The contest page owns the full error state.
      });
    }
  }, [contests.length, fetchContests, scheduleInit]);

  useEffect(() => {
    if (!scheduleNotice) return;
    const timer = setTimeout(() => setScheduleNotice(''), 2600);
    return () => clearTimeout(timer);
  }, [scheduleNotice]);

  const upcomingContests = useMemo(
    () =>
      contests
        .filter(contest => contest.startTimeSeconds * 1000 >= Date.now())
        .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds),
    [contests],
  );
  const nextContest = upcomingContests[0] ?? null;
  const topRating = dashboard.ratings[0] ?? null;
  const topicStats = dashboard.report?.tagStats.slice(0, 10) ?? [];
  const visibleSchedule = scheduleItems.slice(0, 6);
  const totalSolved = dashboard.totalSolved;

  const solvedSegments = dashboard.solved.map(item => ({
    label: getPlatformLabel(item.platform, locale),
    value: item.solved,
    color: PLATFORM_COLORS[item.platform] ?? 'var(--color-primary)',
  }));

  const currentRatingProgress = topRating
    ? Math.min(100, Math.max(0, (topRating.rating / Math.max(3000, topRating.maxRating)) * 100))
    : 0;

  const submitSchedule = (event: FormEvent) => {
    event.preventDefault();
    if (!scheduleForm.title.trim() || !scheduleForm.startsAt) return;
    addSchedule({
      title: scheduleForm.title,
      startsAt: scheduleForm.startsAt,
      durationMinutes: scheduleForm.durationMinutes,
      kind: scheduleForm.kind,
      note: scheduleForm.note,
    });
    setShowScheduleDialog(false);
    setScheduleNotice(t('dashboard.scheduleAdded'));
    setScheduleForm({
      title: '',
      startsAt: toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)),
      durationMinutes: 90,
      kind: 'practice',
      note: '',
    });
  };

  const formatScheduleTime = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));

  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader
        title={t('dashboard.title')}
        actions={
          <div className="flex items-center gap-2">
            {dashboard.updatedAt && (
              <span className="hidden text-[10px] text-[var(--color-text-muted)] sm:inline">
                {t('dashboard.updated', {
                  time: new Date(dashboard.updatedAt).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                })}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('dashboard.refresh')}
              title={t('dashboard.refresh')}
              onClick={() => {
                dashboard.refresh();
                void fetchContests();
              }}
            >
              <RefreshCw size={19} className={dashboard.loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        <div className="mx-auto grid max-w-7xl grid-cols-12 gap-3 md:gap-4">
          <section className="glass-panel relative col-span-12 overflow-hidden rounded-[var(--radius-2xl)] p-5 md:col-span-7">
            <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[var(--orb-primary)] blur-3xl" />
            <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-[26px] bg-[var(--color-primary)] opacity-20 blur-2xl" />
                <img
                  src={appLogo}
                  alt="OJFlow"
                  className="relative h-20 w-20 rounded-[24px] border border-[var(--glass-border)] bg-white object-cover shadow-[var(--glass-shadow)]"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">
                  <Sparkles size={14} />
                  {t(greetingKey())}
                </div>
                <h1 className="mt-1 text-2xl font-[760] tracking-[-0.045em] text-[var(--color-text)] md:text-3xl">
                  {t('dashboard.subtitle')}
                </h1>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="clay-stat">
                    <strong>{totalSolved.toLocaleString()}</strong>
                    <span>{t('dashboard.totalSolved')}</span>
                  </div>
                  <div className="clay-stat">
                    <strong
                      style={{ color: topRating ? getRatingColor(topRating.rating) : undefined }}
                    >
                      {topRating?.rating ?? '—'}
                    </strong>
                    <span>{t('dashboard.currentRating')}</span>
                  </div>
                  <div className="clay-stat">
                    <strong>{topicStats.length || '—'}</strong>
                    <span>{t('dashboard.focusTopics')}</span>
                  </div>
                </div>
              </div>
            </div>
            {dashboard.ratings.length === 0 && dashboard.solved.length === 0 && (
              <div className="relative z-10 mt-4 flex flex-col gap-3 rounded-[18px] border border-[var(--glass-border)] bg-[var(--glass-highlight)] p-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[var(--color-text)]">
                    {t('dashboard.setupTitle')}
                  </div>
                  <div className="mt-0.5 text-xs leading-5 text-[var(--color-text-muted)]">
                    {t('dashboard.setupDesc')}
                  </div>
                </div>
                <Button size="sm" className="shrink-0" onClick={() => navigate('/rating')}>
                  {t('dashboard.setupRating')}
                  <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </section>

          <section className="clay-card col-span-12 min-h-[220px] overflow-hidden rounded-[var(--radius-2xl)] p-5 md:col-span-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                <Flame size={17} className="text-[var(--color-accent)]" />
                {t('dashboard.nextContest')}
              </div>
              <button
                type="button"
                onClick={() => navigate('/contest')}
                className="flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]"
              >
                {t('dashboard.quickContest')}
                <ArrowUpRight size={14} />
              </button>
            </div>
            {nextContest ? (
              <button
                type="button"
                onClick={() => navigate('/contest')}
                className="mt-5 w-full rounded-[20px] border border-[var(--glass-border)] bg-[var(--glass-highlight)] p-4 text-left shadow-[var(--clay-inset)] transition hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-primary)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-success)] shadow-[0_0_10px_var(--color-success)]" />
                  {getPlatformLabel(nextContest.platform, locale)}
                </div>
                <div className="mt-2 line-clamp-2 text-lg font-[700] leading-snug text-[var(--color-text)]">
                  {nextContest.name}
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={14} />
                    {formatScheduleTime(
                      new Date(nextContest.startTimeSeconds * 1000).toISOString(),
                    )}
                  </span>
                  <span className="rounded-full bg-[var(--color-primary-weak)] px-2 py-1 font-semibold text-[var(--color-primary)]">
                    {nextContest.startHourMinute}
                  </span>
                </div>
              </button>
            ) : (
              <div className="flex h-[150px] flex-col items-center justify-center text-sm text-[var(--color-text-muted)]">
                <CalendarDays size={30} className="mb-3 opacity-50" />
                {t('dashboard.noUpcoming')}
              </div>
            )}
          </section>

          <section className="glass-panel col-span-12 rounded-[var(--radius-xl)] p-4 md:col-span-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[var(--color-text)]">
                  {t('dashboard.ratingBoard')}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                  {topRating?.name ?? t('dashboard.noRating')}
                </div>
              </div>
              <Gauge size={18} className="text-[var(--color-primary)]" />
            </div>
            {topRating ? (
              <>
                <div className="flex items-center gap-4">
                  <div
                    className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: `conic-gradient(${getRatingColor(
                        topRating.rating,
                      )} ${currentRatingProgress}%, var(--color-surface-muted) 0)`,
                    }}
                  >
                    <div className="flex h-[74px] w-[74px] flex-col items-center justify-center rounded-full bg-[var(--card-bg-elevated)]">
                      <strong
                        className="text-2xl font-[760]"
                        style={{ color: getRatingColor(topRating.rating) }}
                      >
                        {topRating.rating}
                      </strong>
                      <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">
                        {t('dashboard.currentRating')}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {dashboard.ratings.slice(0, 3).map(rating => (
                      <div
                        key={rating.platform}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="truncate text-[var(--color-text-muted)]">
                          {getPlatformLabel(rating.platform, locale)}
                        </span>
                        <strong style={{ color: getRatingColor(rating.rating) }}>
                          {rating.rating}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
                  <span>{t('dashboard.maxRating')}</span>
                  <strong className="text-[var(--color-text)]">{topRating.maxRating}</strong>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/rating')}
                className="flex h-[118px] w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                <Trophy size={28} className="mb-2 opacity-60" />
                {t('dashboard.noRating')}
              </button>
            )}
          </section>

          <section className="glass-panel col-span-12 rounded-[var(--radius-xl)] p-4 md:col-span-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-[var(--color-text)]">
                {t('dashboard.solvedDistribution')}
              </div>
              <BookOpenCheck size={18} className="text-[var(--color-primary)]" />
            </div>
            {dashboard.solved.length > 0 ? (
              <div className="flex items-center gap-4">
                <DataDonut
                  segments={solvedSegments}
                  centerLabel={t('dashboard.totalSolved')}
                  centerValue={totalSolved.toLocaleString()}
                  size={136}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  {dashboard.solved.slice(0, 5).map(item => {
                    const percent = totalSolved > 0 ? (item.solved / totalSolved) * 100 : 0;
                    return (
                      <div key={item.platform}>
                        <div className="mb-1 flex items-center justify-between text-[10px]">
                          <span className="truncate text-[var(--color-text-muted)]">
                            {getPlatformLabel(item.platform, locale)}
                          </span>
                          <strong>{Math.round(percent)}%</strong>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percent}%`,
                              backgroundColor:
                                PLATFORM_COLORS[item.platform] ?? 'var(--color-primary)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/solved_num')}
                className="flex h-[118px] w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                <BookOpenCheck size={28} className="mb-2 opacity-60" />
                {t('dashboard.noSolved')}
              </button>
            )}
          </section>

          <section className="glass-panel col-span-12 rounded-[var(--radius-xl)] p-4 md:col-span-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[var(--color-text)]">
                  {t('dashboard.quickActions')}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                  {t('dashboard.profileMissing')}
                </div>
              </div>
              <Target size={18} className="text-[var(--color-primary)]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: t('dashboard.quickContest'), path: '/contest', icon: CalendarDays },
                { label: t('dashboard.quickProblem'), path: '/problems', icon: BookOpenCheck },
                { label: t('dashboard.quickRating'), path: '/rating', icon: Trophy },
                { label: t('dashboard.quickSolved'), path: '/solved_num', icon: ListTodo },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className="flex min-h-[72px] flex-col items-start justify-between rounded-[16px] border border-[var(--glass-border)] bg-[var(--glass-highlight)] p-3 text-left text-xs font-semibold text-[var(--color-text-soft)] shadow-[var(--clay-inset)] transition hover:-translate-y-0.5 hover:text-[var(--color-primary)]"
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="glass-panel col-span-12 rounded-[var(--radius-xl)] p-4 md:col-span-7">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[var(--color-text)]">
                  {t('dashboard.topicTree')}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                  {t('dashboard.topicTreeDesc')}
                </div>
              </div>
              <span className="rounded-full bg-[var(--color-primary-weak)] px-2.5 py-1 text-[10px] font-bold text-[var(--color-primary)]">
                CF
              </span>
            </div>
            {topicStats.length > 0 ? (
              <div className="topic-tree relative flex flex-wrap items-center gap-2 rounded-[20px] bg-[var(--color-surface-muted)]/45 p-4">
                <div className="relative z-10 mr-2 flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full bg-[var(--color-text)] text-center text-white shadow-[var(--clay-shadow-sm)]">
                  <span className="text-lg font-black">CF</span>
                  <span className="text-[9px] opacity-65">
                    {dashboard.report?.totalSolved ?? 0} AC
                  </span>
                </div>
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
                  {topicStats.map((topic, index) => (
                    <div
                      key={topic.tag}
                      className="rounded-[13px] border border-[var(--glass-border)] bg-[var(--glass-highlight)] px-2.5 py-2 shadow-[var(--clay-inset)]"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <div className="truncate text-[11px] font-semibold text-[var(--color-text)]">
                        {getProblemTagLabel(topic.tag, locale)}
                      </div>
                      <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                        {topic.count} AC
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/cf_report')}
                className="flex min-h-[128px] w-full flex-col items-center justify-center rounded-[20px] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                <Target size={30} className="mb-2 opacity-50" />
                {t('dashboard.noTopicTree')}
              </button>
            )}
          </section>

          <section className="glass-panel col-span-12 rounded-[var(--radius-xl)] p-4 md:col-span-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-[var(--color-text)]">
                  {t('dashboard.schedule')}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                  {t('dashboard.scheduleDesc')}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label={t('dashboard.addSchedule')}
                title={t('dashboard.addSchedule')}
                onClick={() => setShowScheduleDialog(true)}
              >
                <Plus size={18} />
              </Button>
            </div>
            <div className="space-y-2">
              {visibleSchedule.length > 0 ? (
                visibleSchedule.map(item => (
                  <div
                    key={item.id}
                    className={cn(
                      'group flex items-center gap-2 rounded-[15px] border border-[var(--glass-border)] bg-[var(--glass-highlight)] p-2.5 shadow-[var(--clay-inset)]',
                      item.completed && 'opacity-55',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSchedule(item.id)}
                      aria-label={
                        item.completed
                          ? t('dashboard.scheduleReopen')
                          : t('dashboard.scheduleComplete')
                      }
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition',
                        item.completed
                          ? 'border-[var(--color-success)] bg-[var(--color-success)] text-white'
                          : 'border-[var(--color-border)] text-transparent hover:border-[var(--color-primary)]',
                      )}
                    >
                      <Check size={14} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          'truncate text-xs font-semibold text-[var(--color-text)]',
                          item.completed && 'line-through',
                        )}
                      >
                        {item.title}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
                        <Clock3 size={11} />
                        {formatScheduleTime(item.startsAt)}
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-0.5 font-semibold',
                            scheduleBadge(item.kind),
                          )}
                        >
                          {t(kindKey(item.kind))}
                        </span>
                        {item.autoCreated && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-weak)] px-1.5 py-0.5 font-semibold text-[var(--color-primary)]">
                            <CalendarDays size={10} />
                            {t('dashboard.favoriteLinked')}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        deleteSchedule(item.id);
                        setScheduleNotice(t('dashboard.scheduleDeleted'));
                      }}
                      aria-label={t('dashboard.scheduleDelete')}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] opacity-0 transition hover:bg-[var(--color-error-weak)] hover:text-[var(--color-error)] group-hover:opacity-100"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              ) : (
                <button
                  type="button"
                  onClick={() => setShowScheduleDialog(true)}
                  className="flex min-h-[128px] w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  <CalendarPlus size={28} className="mb-2 opacity-60" />
                  {t('dashboard.noSchedule')}
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

      {scheduleNotice && (
        <div className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[var(--color-text)] px-4 py-2 text-xs font-semibold text-[var(--color-surface)] shadow-lg">
          {scheduleNotice}
        </div>
      )}

      {showScheduleDialog && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => setShowScheduleDialog(false)}
          />
          <form
            onSubmit={submitSchedule}
            className="glass-panel relative z-10 w-full max-w-md rounded-[var(--radius-xl)] p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-[700] text-[var(--color-text)]">
                {t('dashboard.addSchedule')}
              </h3>
              <button
                type="button"
                onClick={() => setShowScheduleDialog(false)}
                aria-label={t('common.close')}
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={scheduleForm.title}
                onChange={event =>
                  setScheduleForm(current => ({ ...current, title: event.target.value }))
                }
                placeholder={t('dashboard.scheduleTitle')}
                className="clay-input h-10 w-full px-3 text-sm"
              />
              <select
                value={scheduleForm.kind}
                onChange={event =>
                  setScheduleForm(current => ({
                    ...current,
                    kind: event.target.value as ScheduleItem['kind'],
                  }))
                }
                className="clay-input h-10 w-full px-3 text-sm"
                aria-label={t('dashboard.scheduleKind')}
              >
                <option value="practice">{t('dashboard.kindPractice')}</option>
                <option value="contest">{t('dashboard.kindContest')}</option>
                <option value="review">{t('dashboard.kindReview')}</option>
                <option value="custom">{t('dashboard.kindCustom')}</option>
              </select>
              <input
                type="datetime-local"
                value={scheduleForm.startsAt}
                onChange={event =>
                  setScheduleForm(current => ({ ...current, startsAt: event.target.value }))
                }
                aria-label={t('dashboard.scheduleStart')}
                className="clay-input h-10 w-full px-3 text-sm"
              />
              <input
                type="number"
                min={1}
                value={scheduleForm.durationMinutes}
                onChange={event =>
                  setScheduleForm(current => ({
                    ...current,
                    durationMinutes: Number(event.target.value),
                  }))
                }
                aria-label={t('dashboard.scheduleDuration')}
                className="clay-input h-10 w-full px-3 text-sm"
              />
              <input
                value={scheduleForm.note}
                onChange={event =>
                  setScheduleForm(current => ({ ...current, note: event.target.value }))
                }
                placeholder={t('dashboard.scheduleNote')}
                className="clay-input h-10 w-full px-3 text-sm"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowScheduleDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!scheduleForm.title.trim() || !scheduleForm.startsAt}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
