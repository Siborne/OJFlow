import { useState, useEffect, useMemo } from 'react';
import { Filter, RefreshCw } from 'lucide-react';
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

const PLATFORMS = ['Codeforces', 'AtCoder', '洛谷', '蓝桥云课', '力扣', '牛客'];

const images: Record<string, string> = {
  Codeforces: new URL('../assets/platforms/Codeforces.jpg', import.meta.url).href,
  AtCoder: new URL('../assets/platforms/AtCoder.jpg', import.meta.url).href,
  '洛谷': new URL('../assets/platforms/Luogu.jpg', import.meta.url).href,
  '蓝桥云课': new URL('../assets/platforms/Lanqiao.jpg', import.meta.url).href,
  '力扣': new URL('../assets/platforms/LeetCode.jpg', import.meta.url).href,
  '牛客': new URL('../assets/platforms/Nowcoder.jpg', import.meta.url).href,
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
  // Zustand selectors — each returns stable value, actions are stable refs
  const contests = useContestStore((s) => s.contests);
  const loading = useContestStore((s) => s.loading);
  const day = useContestStore((s) => s.day);
  const selectedPlatforms = useContestStore((s) => s.selectedPlatforms);
  const showEmptyDay = useContestStore((s) => s.showEmptyDay);
  const isFavorite = useContestStore((s) => s.isFavorite);
  const toggleFavorite = useContestStore((s) => s.toggleFavorite);
  const fetchContests = useContestStore((s) => s.fetchContests);
  const togglePlatform = useContestStore((s) => s.togglePlatform);
  const toggleShowEmptyDay = useContestStore((s) => s.toggleShowEmptyDay);

  const [showFilter, setShowFilter] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [activeTab, setActiveTab] = useState('today');
  const [expandedFutureDays, setExpandedFutureDays] = useState<Set<number>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; contest: ContestType | null }>({
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
    () => timeContests.flat().filter((c) => selectedPlatforms[c.platform]),
    [timeContests, selectedPlatforms],
  );

  const filteredContestsByTab = useMemo(() => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    if (activeTab === 'today') {
      return visibleContests.filter((c) => {
        const d = new Date(c.startTimeSeconds * 1000);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      });
    }
    if (activeTab === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return visibleContests.filter((c) => {
        const d = new Date(c.startTimeSeconds * 1000);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === tomorrow.getTime();
      });
    }
    if (activeTab === 'thisWeek') {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return visibleContests.filter((c) => {
        const d = new Date(c.startTimeSeconds * 1000);
        d.setHours(0, 0, 0, 0);
        return d.getTime() >= today.getTime() && d.getTime() < weekEnd.getTime();
      });
    }
    return visibleContests;
  }, [visibleContests, activeTab, now]);

  const favoriteCountByTab = useMemo(
    () => filteredContestsByTab.filter((c) => isFavorite(c)).length,
    [filteredContestsByTab, isFavorite],
  );

  const runningCountByTab = useMemo(
    () =>
      filteredContestsByTab.filter((c) => {
        const start = c.startTimeSeconds * 1000;
        const end = start + c.durationSeconds * 1000;
        return now >= start && now <= end;
      }).length,
    [filteredContestsByTab, now],
  );

  const nextContestByTab = useMemo(() => {
    return (
      filteredContestsByTab
        .filter((c) => c.startTimeSeconds * 1000 > now)
        .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)[0] || null
    );
  }, [filteredContestsByTab, now]);

  const activePlatformsWithCount = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredContestsByTab.forEach((c) => {
      counts[c.platform] = (counts[c.platform] || 0) + 1;
    });
    return PLATFORMS.filter((p) => selectedPlatforms[p] && counts[p]).map((p) => ({
      name: p,
      count: counts[p] || 0,
    }));
  }, [filteredContestsByTab, selectedPlatforms]);

  // Date-grouped contests
  const todayContest = useMemo(() => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return visibleContests.filter((c) => {
      const d = new Date(c.startTimeSeconds * 1000);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
  }, [visibleContests, now]);

  const tomorrowContest = useMemo(() => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return visibleContests.filter((c) => {
      const d = new Date(c.startTimeSeconds * 1000);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === tomorrow.getTime();
    });
  }, [visibleContests, now]);

  const futureContests = useMemo(() => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const future = visibleContests.filter((c) => {
      const d = new Date(c.startTimeSeconds * 1000);
      d.setHours(0, 0, 0, 0);
      return d.getTime() >= dayAfter.getTime();
    });

    const grouped: ContestType[][] = [];
    const currentDay = new Date(dayAfter);
    for (let i = 0; i < 30; i++) {
      const dayStart = new Date(currentDay);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const dayContests = future.filter((c) => {
        const cd = new Date(c.startTimeSeconds * 1000);
        return cd.getTime() >= dayStart.getTime() && cd.getTime() < dayEnd.getTime();
      });
      if (dayContests.length > 0) grouped.push(dayContests);
      currentDay.setDate(currentDay.getDate() + 1);
    }
    return grouped;
  }, [visibleContests, now]);

  const historicalContests = useMemo(() => {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return visibleContests.filter((c) => {
      const d = new Date(c.startTimeSeconds * 1000);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < today.getTime();
    });
  }, [visibleContests, now]);

  const getFutureDayName = (index: number) => {
    if (!futureContests[index]?.length) return '';
    const contestDate = new Date(futureContests[index][0].startTimeSeconds * 1000);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const days = Math.floor((contestDate.getTime() - today.getTime()) / 86400000);
    const md = `${contestDate.getMonth() + 1}/${contestDate.getDate()}`;
    if (days === 2) return `后天 ${md}`;
    if (days === 3) return md;
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${md} ${weekDays[contestDate.getDay()]}`;
  };

  const toggleFutureDay = (index: number) => {
    setExpandedFutureDays((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const openLink = (contest: ContestType) => {
    if (!contest.link) return;
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
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 shadow-sm backdrop-blur-[var(--frost-blur)]">
        <h2 className="text-lg font-[650] tracking-wide">近期比赛</h2>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => setShowFilter(true)}>
                <Filter size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>筛选</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={fetchContests}>
                <RefreshCw size={22} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>刷新</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-3 pt-4">
            <SkeletonCard rows={3} />
            <SkeletonCard rows={2} />
          </div>
        </div>
      ) : (
        <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
          <div className="mb-4">
            <ContestDateTabs value={activeTab} onChange={setActiveTab} />
            <ContestSummaryGrid
              visibleCount={filteredContestsByTab.length}
              favoriteCount={favoriteCountByTab}
              runningCount={runningCountByTab}
              nextContest={nextContestByTab}
              platformsWithCount={activePlatformsWithCount}
            />
          </div>

          {todayContest.length > 0 && (
            <ContestDayGroup
              title="今天"
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
              title="明天"
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

          {historicalContests.length > 0 && (
            <ContestDayGroup
              title="📚 历史记录"
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

          {visibleContests.length === 0 && !loading && (
            <div className="flex h-full items-center justify-center p-4 text-[var(--color-text-muted)]">
              暂无比赛
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
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDialog({ show: false, contest: null })} />
          <div className="relative z-10 w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)]">确认访问？</h3>
            <p className="mb-4 text-sm text-[var(--color-text-muted)]">即将访问: {confirmDialog.contest.name}</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmDialog({ show: false, contest: null })}>取消</Button>
              <Button onClick={handleConfirmOpen}>确定</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
