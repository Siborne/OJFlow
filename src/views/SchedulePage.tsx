import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  CalendarPlus,
  Check,
  Clock3,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { useI18n, type MessageKey } from '@/i18n';
import { useContestStore } from '@/stores/contest';
import { useScheduleStore } from '@/stores/schedule';
import { ContestService } from '@/services/contest';
import { PLATFORM_LOGOS } from '@/utils/platform-assets';
import {
  getSchedulePageItems,
  isScheduleExpired,
  resolveSchedulePlatform,
  resolveScheduleUrl,
  scheduleStart,
  type SchedulePageFilter,
} from '@/utils/schedule';
import type { ScheduleItem } from '../../shared/types';
import { cn } from '@/lib/utils';

const FILTERS: Array<{ id: SchedulePageFilter; key: MessageKey }> = [
  { id: 'today', key: 'schedule.today' },
  { id: 'upcoming', key: 'schedule.upcoming' },
  { id: 'completed', key: 'schedule.completed' },
  { id: 'expired', key: 'schedule.expired' },
  { id: 'all', key: 'schedule.all' },
];

const KIND_KEYS: Record<ScheduleItem['kind'], MessageKey> = {
  contest: 'dashboard.kindContest',
  practice: 'dashboard.kindPractice',
  review: 'dashboard.kindReview',
  custom: 'dashboard.kindCustom',
};

function toDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export default function SchedulePage() {
  const { t, locale } = useI18n();
  const items = useScheduleStore(state => state.items);
  const init = useScheduleStore(state => state.init);
  const addItem = useScheduleStore(state => state.addItem);
  const toggleCompleted = useScheduleStore(state => state.toggleCompleted);
  const removeItem = useScheduleStore(state => state.removeItem);
  const removeExpired = useScheduleStore(state => state.removeExpired);
  const contests = useContestStore(state => state.contests);
  const [filter, setFilter] = useState<SchedulePageFilter>('today');
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    title: '',
    startsAt: toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)),
    durationMinutes: 90,
    kind: 'practice' as ScheduleItem['kind'],
    note: '',
  });

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const now = Date.now();
  const todayCount = getSchedulePageItems(items, 'today', now).length;
  const pendingCount = items.filter(
    item => !item.completed && !isScheduleExpired(item, now),
  ).length;
  const completedCount = items.filter(item => item.completed).length;
  const expiredCount = items.filter(item => isScheduleExpired(item, now)).length;

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return getSchedulePageItems(items, filter, now).filter(item => {
      if (!query) return true;
      return `${item.title} ${item.note ?? ''} ${item.platform ?? ''}`
        .toLowerCase()
        .includes(query);
    });
  }, [filter, items, now, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, ScheduleItem[]>();
    for (const item of visibleItems) {
      const date = new Date(scheduleStart(item));
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }
    return [...groups.values()];
  }, [visibleItems]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.startsAt) return;
    addItem(form);
    setShowDialog(false);
    setForm({
      title: '',
      startsAt: toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)),
      durationMinutes: 90,
      kind: 'practice',
      note: '',
    });
    setNotice(t('schedule.added'));
  };

  const cleanup = () => {
    if (!window.confirm(t('schedule.cleanupConfirm'))) return;
    const count = removeExpired();
    setNotice(count > 0 ? t('schedule.cleaned', { count }) : t('schedule.nothingToClean'));
  };

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    }).format(new Date(value));

  const formatTime = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));

  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader
        title={t('schedule.title')}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="hidden gap-1.5 sm:inline-flex"
              disabled={expiredCount === 0}
              onClick={cleanup}
            >
              <Trash2 size={14} />
              {t('schedule.cleanupExpired')}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={t('dashboard.addSchedule')}
              title={t('dashboard.addSchedule')}
              onClick={() => setShowDialog(true)}
            >
              <Plus size={19} />
            </Button>
          </>
        }
      />

      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-6xl">
          <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,var(--gradient-start),var(--gradient-end))] opacity-[0.09]" />
            <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">
                  Schedule
                </div>
                <h3 className="mt-1 text-xl font-[740] tracking-[-0.035em]">
                  {t('schedule.subtitle')}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: t('schedule.todayCount'), value: todayCount },
                  { label: t('schedule.pendingCount'), value: pendingCount },
                  { label: t('schedule.completedCount'), value: completedCount },
                  { label: t('schedule.expiredCount'), value: expiredCount },
                ].map(metric => (
                  <div
                    key={metric.label}
                    className="min-w-[88px] rounded-[14px] border border-[var(--glass-border)] bg-[var(--glass-highlight)] px-3 py-2 text-center shadow-[var(--clay-inset)]"
                  >
                    <div className="text-xl font-bold text-[var(--color-primary)]">
                      {metric.value}
                    </div>
                    <div className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
                    filter === item.id
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                      : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                  )}
                >
                  {t(item.key)}
                </button>
              ))}
            </div>
            <label className="relative block w-full lg:max-w-xs">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={t('schedule.searchPlaceholder')}
                className="h-10 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-3 text-sm outline-none focus:border-[var(--color-primary)]"
              />
            </label>
          </div>

          {grouped.length === 0 ? (
            <section className="mt-4 flex min-h-[320px] flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]">
              <CalendarPlus size={38} className="mb-3 text-[var(--color-primary)] opacity-70" />
              <div className="font-semibold">
                {items.length === 0 ? t('schedule.empty') : t('schedule.emptyFilter')}
              </div>
              <Button className="mt-4" size="sm" onClick={() => setShowDialog(true)}>
                <Plus size={14} className="mr-1.5" />
                {t('dashboard.addSchedule')}
              </Button>
            </section>
          ) : (
            <div className="mt-4 space-y-5">
              {grouped.map(group => {
                const groupDate = group[0].startsAt;
                return (
                  <section key={formatDate(groupDate)}>
                    <div className="sticky top-0 z-10 mb-2 flex items-center gap-2 bg-[var(--color-bg)]/90 py-1 backdrop-blur">
                      <CalendarDays size={15} className="text-[var(--color-primary)]" />
                      <h4 className="text-sm font-semibold">{formatDate(groupDate)}</h4>
                      <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                        {group.length}
                      </span>
                    </div>
                    <div className="grid gap-2 lg:grid-cols-2">
                      {group.map(item => {
                        const platform = resolveSchedulePlatform(item, contests);
                        const logo = platform ? PLATFORM_LOGOS[platform] : undefined;
                        const url = resolveScheduleUrl(item, contests);
                        const expired = isScheduleExpired(item, now);
                        return (
                          <article
                            key={item.id}
                            className={cn(
                              'group flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-3.5 shadow-[var(--card-shadow)] transition hover:border-[var(--color-primary)]',
                              (item.completed || expired) && 'opacity-70',
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => toggleCompleted(item.id)}
                              aria-label={
                                item.completed
                                  ? t('dashboard.scheduleReopen')
                                  : t('dashboard.scheduleComplete')
                              }
                              className={cn(
                                'relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border bg-white',
                                item.completed
                                  ? 'border-[var(--color-success)]'
                                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]',
                              )}
                            >
                              {logo ? (
                                <img
                                  src={logo}
                                  alt={platform}
                                  className={cn(
                                    'h-full w-full object-cover',
                                    item.completed && 'opacity-35 grayscale',
                                  )}
                                />
                              ) : (
                                <CalendarDays
                                  size={17}
                                  className="text-[var(--color-text-muted)]"
                                />
                              )}
                              {item.completed && (
                                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-success)] text-white">
                                  <Check size={10} strokeWidth={3} />
                                </span>
                              )}
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-2">
                                <button
                                  type="button"
                                  className="min-w-0 flex-1 text-left"
                                  onClick={() => {
                                    if (url) void ContestService.openUrl(url);
                                  }}
                                  disabled={!url}
                                >
                                  <div
                                    className={cn(
                                      'truncate text-sm font-semibold',
                                      item.completed && 'line-through',
                                    )}
                                  >
                                    {item.title}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
                                    <span className="inline-flex items-center gap-1">
                                      <Clock3 size={11} />
                                      {formatTime(item.startsAt)}
                                    </span>
                                    <span className="rounded-full bg-[var(--color-primary-weak)] px-1.5 py-0.5 font-semibold text-[var(--color-primary)]">
                                      {t(KIND_KEYS[item.kind])}
                                    </span>
                                    {item.autoCreated && (
                                      <span className="rounded-full bg-[var(--color-surface-muted)] px-1.5 py-0.5">
                                        {t('dashboard.favoriteLinked')}
                                      </span>
                                    )}
                                    {expired && (
                                      <span className="rounded-full bg-[var(--color-error-weak)] px-1.5 py-0.5 font-semibold text-[var(--color-error)]">
                                        {t('schedule.overdue')}
                                      </span>
                                    )}
                                  </div>
                                </button>
                                {url && (
                                  <button
                                    type="button"
                                    aria-label={t('dashboard.openSchedule')}
                                    title={t('dashboard.openSchedule')}
                                    onClick={() => void ContestService.openUrl(url)}
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--color-primary)] hover:bg-[var(--color-primary-weak)]"
                                  >
                                    <ArrowUpRight size={14} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  aria-label={t('dashboard.scheduleDelete')}
                                  title={t('dashboard.scheduleDelete')}
                                  onClick={() => {
                                    removeItem(item.id);
                                    setNotice(t('schedule.deleted'));
                                  }}
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-error-weak)] hover:text-[var(--color-error)]"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                              {item.note && (
                                <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--color-text-muted)]">
                                  {item.note}
                                </p>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {notice && (
        <div className="fixed bottom-8 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[var(--color-text)] px-4 py-2 text-xs font-medium text-[var(--color-surface)] shadow-lg">
          {notice}
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 z-[78] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDialog(false)}
          />
          <form
            onSubmit={submit}
            className="glass-panel relative z-10 w-full max-w-lg rounded-[var(--radius-xl)] p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t('dashboard.addSchedule')}</h3>
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                aria-label={t('common.close')}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--color-surface-muted)]"
              >
                <X size={17} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={form.title}
                onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                placeholder={t('dashboard.scheduleTitle')}
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={form.kind}
                  onChange={event =>
                    setForm(current => ({
                      ...current,
                      kind: event.target.value as ScheduleItem['kind'],
                    }))
                  }
                  aria-label={t('dashboard.scheduleKind')}
                  className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                >
                  {Object.entries(KIND_KEYS).map(([kind, key]) => (
                    <option key={kind} value={kind}>
                      {t(key)}
                    </option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={event =>
                    setForm(current => ({ ...current, startsAt: event.target.value }))
                  }
                  aria-label={t('dashboard.scheduleStart')}
                  className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                />
              </div>
              <input
                type="number"
                min={1}
                value={form.durationMinutes}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    durationMinutes: Number(event.target.value),
                  }))
                }
                aria-label={t('dashboard.scheduleDuration')}
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
              />
              <textarea
                value={form.note}
                onChange={event => setForm(current => ({ ...current, note: event.target.value }))}
                placeholder={t('dashboard.scheduleNote')}
                className="min-h-24 w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!form.title.trim() || !form.startsAt}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
