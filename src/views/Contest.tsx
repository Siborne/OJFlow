import { useState, useEffect, useMemo } from 'react';
import { CalendarDays, Filter, RefreshCw, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useContestStore } from '@/stores/contest';
import { ContestService } from '@/services/contest';
import type { Contest as ContestType } from '@/types';
import { ContestDateTabs } from '@/components/contest/ContestDateTabs';
import { ContestSummaryGrid } from '@/components/contest/ContestSummaryGrid';
import { ContestDayGroup } from '@/components/contest/ContestDayGroup';
import { ContestFilterModal } from '@/components/contest/ContestFilterModal';
import { SkeletonCard } from '@/components/contest/SkeletonCard';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useUiStore } from '@/stores/ui';
import { useI18n } from '@/i18n';
import { getPlatformLabel } from '@/utils/platform-labels';

const PLATFORMS = ['Codeforces', 'AtCoder', '洛谷', '蓝桥云课', '力扣', '牛客'];

const images: Record<string, string> = {
  Codeforces: new URL('../assets/platforms/Codeforces.jpg', import.meta.url).href,
  AtCoder: new URL('../assets/platforms/AtCoder.jpg', import.meta.url).href,
  洛谷: new URL('../assets/platforms/Luogu.jpg', import.meta.url).href,
  蓝桥云课: new URL('../assets/platforms/Lanqiao.jpg', import.meta.url).href,
  力扣: new URL('../assets/platforms/LeetCode.jpg', import.meta.url).href,
  牛客: new URL('../assets/platforms/Nowcoder.jpg', import.meta.url).href,
  Other: new URL('../assets/platforms/Other.jpg', import.meta.url).href,
};

const getPlatformImage = (platform: string) => images[platform] || images.Other;

function groupByDate(contests: ContestType[], now: number, dayCount: number): ContestType[][] {
  const grouped: ContestType[][] = Array.from({ length: dayCount }, () => []);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime() / 1000;

  for (const c of contests) {
    const diffSeconds = c.startTimeSeconds - todayTs;
    const dayIndex = Math.floor(diffSeconds / (24 * 3600));
    if (dayIndex >= 0 && dayIndex < dayCount) {
      grouped[dayIndex].push(c);
    }
  }

  for (const dayList of grouped) {
    dayList.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
  }

  return grouped;
}

export default function Contest() {
  const { t, locale } = useI18n();
  // Zustand selectors — each returns stable value, actions are stable refs
  const contests = useContestStore(s => s.contests);
  const loading = useContestStore(s => s.loading);
  const day = useContestStore(s => s.day);
  const selectedPlatforms = useContestStore(s => s.selectedPlatforms);
  const showEmptyDay = useContestStore(s => s.showEmptyDay);
  const platformStatus = useContestStore(s => s.platformStatus);
  const fromCache = useContestStore(s => s.fromCache);
  const error = useContestStore(s => s.error);
  const isFavorite = useContestStore(s => s.isFavorite);
  const toggleFavorite = useContestStore(s => s.toggleFavorite);
  const fetchContests = useContestStore(s => s.fetchContests);
  const togglePlatform = useContestStore(s => s.togglePlatform);
  const toggleShowEmptyDay = useContestStore(s => s.toggleShowEmptyDay);
  const appMode = useUiStore(state => state.appMode);
  const showQuickStats = useUiStore(state => state.features.showQuickStats);
  const showContestHistory = useUiStore(state => state.features.showContestHistory);
  const confirmExternalLinks = useUiStore(state => state.features.confirmExternalLinks);

  const [showFilter, setShowFilter] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [activeTab, setActiveTab] = useState('today');
  const [expandedFutureDays, setExpandedFutureDays] = useState<Set<number>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    contest: ContestType | null;
  }>({
    show: false,
    contest: null,
  });

  // Initial fetch
  useEffect(() => {
    if (contests.length === 0) {
      fetchContests();
    }
  }, [contests.length, fetchContests]);

  // Timer for "now"
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Group contests into days using the store's day count
  const timeContests = useMemo(() => groupByDate(contests, now, day), [contests, now, day]);

  const visibleContests = useMemo(
    () => timeContests.flat().filter(c => selectedPlatforms[c.platform]),
    [timeContests, selectedPlatforms],
  );

  const filteredContestsByTab = useMemo(() => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    if (activeTab === 'today') {
      return visibleContests.filter(c => {
        const d = new Date(c.startTimeSeconds * 1000);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      });
    }
    if (activeTab === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return visibleContests.filter(c => {
        const d = new Date(c.startTimeSeconds * 1000);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === tomorrow.getTime();
      });
    }
    if (activeTab === 'thisWeek') {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return visibleContests.filter(c => {
        const d = new Date(c.startTimeSeconds * 1000);
        d.setHours(0, 0, 0, 0);
        return d.getTime() >= today.getTime() && d.getTime() < weekEnd.getTime();
      });
    }
    return visibleContests;
  }, [visibleContests, activeTab, now]);

  const favoriteCountByTab = useMemo(
    () => filteredContestsByTab.filter(c => isFavorite(c)).length,
    [filteredContestsByTab, isFavorite],
  );

  const runningCountByTab = useMemo(
    () =>
      filteredContestsByTab.filter(c => {
        const start = c.startTimeSeconds * 1000;
        const end = start + c.durationSeconds * 1000;
        return now >= start && now <= end;
      }).length,
    [filteredContestsByTab, now],
  );

  const nextContestByTab = useMemo(() => {
    return (
      filteredContestsByTab
        .filter(c => c.startTimeSeconds * 1000 > now)
        .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)[0] || null
    );
  }, [filteredContestsByTab, now]);

  const activePlatformsWithCount = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredContestsByTab.forEach(c => {
      counts[c.platform] = (counts[c.platform] || 0) + 1;
    });
    return PLATFORMS.filter(p => selectedPlatforms[p] && counts[p]).map(p => ({
      name: p,
      count: counts[p] || 0,
    }));
  }, [filteredContestsByTab, selectedPlatforms]);

  // Date-grouped contests
  const todayContest = useMemo(() => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return filteredContestsByTab.filter(c => {
      const d = new Date(c.startTimeSeconds * 1000);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
  }, [filteredContestsByTab, now]);

  const tomorrowContest = useMemo(() => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return filteredContestsByTab.filter(c => {
      const d = new Date(c.startTimeSeconds * 1000);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === tomorrow.getTime();
    });
  }, [filteredContestsByTab, now]);

  const futureContests = useMemo(() => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const future = filteredContestsByTab.filter(c => {
      const d = new Date(c.startTimeSeconds * 1000);
      d.setHours(0, 0, 0, 0);
      return d.getTime() >= dayAfter.getTime();
    });

    const grouped: ContestType[][] = [];
    const currentDay = new Date(dayAfter);
    for (let i = 0; i < day; i++) {
      const dayStart = new Date(currentDay);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayContests = future.filter(c => {
        const cd = new Date(c.startTimeSeconds * 1000);
        return cd.getTime() >= dayStart.getTime() && cd.getTime() < dayEnd.getTime();
      });
      if (dayContests.length > 0 || (showEmptyDay && filteredContestsByTab.length > 0)) {
        grouped.push(dayContests);
      }
      currentDay.setDate(currentDay.getDate() + 1);
    }
    return grouped;
  }, [day, filteredContestsByTab, showEmptyDay, now]);

  const historicalContests = useMemo(() => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return filteredContestsByTab.filter(c => {
      const d = new Date(c.startTimeSeconds * 1000);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < today.getTime();
    });
  }, [filteredContestsByTab, now]);

  const getFutureDayName = (index: number) => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const contestDate = new Date(today);
    contestDate.setDate(contestDate.getDate() + index + 2);
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    }).format(contestDate);
  };

  const toggleFutureDay = (index: number) => {
    setExpandedFutureDays(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const openLink = (contest: ContestType) => {
    if (!contest.link) return;
    if (!confirmExternalLinks) {
      void ContestService.openUrl(contest.link);
      return;
    }
    setConfirmDialog({ show: true, contest });
  };

  const handleConfirmOpen = () => {
    if (confirmDialog.contest?.link) {
      ContestService.openUrl(confirmDialog.contest.link);
    }
    setConfirmDialog({ show: false, contest: null });
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader
        title={t('contest.title')}
        actions={
          <>
            <span className="mr-1 hidden rounded-full bg-[var(--color-surface-muted)] px-2.5 py-1 text-[11px] text-[var(--color-text-muted)] sm:inline">
              {fromCache ? t('contest.cached') : t('contest.live')} ·{' '}
              {t('contest.platformIssues', {
                count: platformStatus.filter(item => !item.success).length,
              })}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('contest.filter')}
                  title={t('contest.filter')}
                  onClick={() => setShowFilter(true)}
                >
                  <Filter size={22} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('contest.filter')}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('contest.refresh')}
                  title={t('contest.refresh')}
                  onClick={fetchContests}
                >
                  <RefreshCw size={22} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('contest.refresh')}</TooltipContent>
            </Tooltip>
          </>
        }
      />

      {loading ? (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-3 pt-4">
            <SkeletonCard rows={3} />
            <SkeletonCard rows={2} />
          </div>
        </div>
      ) : (
        <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
          {error && (
            <div className="mb-3 rounded-[var(--radius-md)] border border-[var(--color-error)] bg-[var(--color-error-weak)] px-4 py-3 text-sm text-[var(--color-error)]">
              {t('contest.loadFailed', {
                error: locale === 'en-US' ? 'Network or source error' : error,
              })}
            </div>
          )}
          {platformStatus.some(item => !item.success) && appMode === 'full' && (
            <div className="mb-3 rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning-weak)] px-4 py-2 text-xs text-[var(--color-warning)]">
              {t('contest.unavailable', {
                platforms: platformStatus
                  .filter(item => !item.success)
                  .map(item => getPlatformLabel(item.platform, locale))
                  .join(locale === 'zh-CN' ? '、' : ', '),
              })}
            </div>
          )}
          <div className="mb-4">
            <ContestDateTabs value={activeTab} onChange={setActiveTab} />
            {showQuickStats && appMode === 'full' && (
              <ContestSummaryGrid
                visibleCount={filteredContestsByTab.length}
                favoriteCount={favoriteCountByTab}
                runningCount={runningCountByTab}
                nextContest={nextContestByTab}
                platformsWithCount={activePlatformsWithCount}
              />
            )}
          </div>

          {todayContest.length > 0 && (
            <ContestDayGroup
              title={t('contest.today')}
              variant="today"
              contests={todayContest}
              now={now}
              selectedPlatforms={selectedPlatforms}
              isFavorite={isFavorite}
              getPlatformImage={getPlatformImage}
              onOpenContest={openLink}
              onToggleFavorite={toggleFavorite}
            />
          )}

          {tomorrowContest.length > 0 && (
            <ContestDayGroup
              title={t('contest.tomorrow')}
              variant="tomorrow"
              contests={tomorrowContest}
              now={now}
              selectedPlatforms={selectedPlatforms}
              isFavorite={isFavorite}
              getPlatformImage={getPlatformImage}
              onOpenContest={openLink}
              onToggleFavorite={toggleFavorite}
            />
          )}

          {futureContests.map((dayList, dayIdx) => (
            <ContestDayGroup
              key={`future-${dayIdx}`}
              title={getFutureDayName(dayIdx)}
              variant="future"
              collapsible
              expanded={expandedFutureDays.has(dayIdx)}
              contests={dayList}
              now={now}
              selectedPlatforms={selectedPlatforms}
              isFavorite={isFavorite}
              getPlatformImage={getPlatformImage}
              onToggle={() => toggleFutureDay(dayIdx)}
              onOpenContest={openLink}
              onToggleFavorite={toggleFavorite}
            />
          ))}

          {showContestHistory && appMode === 'full' && historicalContests.length > 0 && (
            <ContestDayGroup
              title={`📚 ${t('contest.history')}`}
              variant="history"
              collapsible
              expanded={showHistory}
              contests={historicalContests}
              now={now}
              selectedPlatforms={selectedPlatforms}
              isFavorite={isFavorite}
              getPlatformImage={getPlatformImage}
              onToggle={() => setShowHistory(!showHistory)}
              onOpenContest={openLink}
              onToggleFavorite={toggleFavorite}
            />
          )}

          {filteredContestsByTab.length === 0 && !loading && (
            <div className="glass-panel relative mx-auto mt-5 max-w-xl overflow-hidden rounded-[var(--radius-2xl)] px-6 py-10 text-center">
              <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[var(--orb-primary)] blur-3xl" />
              <div className="relative z-10">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[var(--color-primary-weak)] text-[var(--color-primary)] shadow-[var(--clay-inset)]">
                  <CalendarDays size={28} />
                </div>
                <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-primary)]">
                  <Sparkles size={13} />
                  {t('contest.emptyEyebrow')}
                </div>
                <h3 className="mt-2 text-xl font-[700] tracking-[-0.03em] text-[var(--color-text)]">
                  {t('contest.emptyTitle')}
                </h3>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--color-text-muted)]">
                  {t('contest.emptyDesc')}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-full"
                  onClick={() => setShowFilter(true)}
                >
                  {t('contest.adjustFilters')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ContestFilterModal
        show={showFilter}
        showEmptyDay={showEmptyDay}
        selectedPlatforms={selectedPlatforms}
        platforms={PLATFORMS}
        onClose={() => setShowFilter(false)}
        onToggleShowEmptyDay={toggleShowEmptyDay}
        onTogglePlatform={togglePlatform}
      />

      {confirmDialog.show && confirmDialog.contest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmDialog({ show: false, contest: null })}
          />
          <div className="relative z-10 w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
              {t('contest.confirmVisit')}
            </h3>
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">
              {t('contest.visitHint', { name: confirmDialog.contest.name })}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirmDialog({ show: false, contest: null })}
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={handleConfirmOpen}>{t('common.confirm')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
