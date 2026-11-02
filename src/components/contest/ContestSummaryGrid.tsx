import type { Contest } from '@/types';
import { useI18n } from '@/i18n';
import { getPlatformLabel } from '@/utils/platform-labels';

interface ContestSummaryGridProps {
  visibleCount: number;
  favoriteCount: number;
  runningCount: number;
  nextContest: Contest | null;
  platformsWithCount: { name: string; count: number }[];
}

export function ContestSummaryGrid({
  visibleCount,
  favoriteCount,
  runningCount,
  nextContest,
  platformsWithCount,
}: ContestSummaryGridProps) {
  const { t, locale } = useI18n();
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] items-stretch gap-3 max-md:grid-cols-1">
      {/* Overview card */}
      <div className="glass-panel relative flex flex-col overflow-hidden rounded-[var(--radius-lg)]">
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(130deg,var(--gradient-start),var(--gradient-end)_42%,transparent_72%)]" />
        <div className="relative z-10 flex-shrink-0 border-b border-[var(--card-divider)] px-5 py-3">
          <span className="text-sm font-medium text-[var(--color-text-soft)]">
            {t('contest.summaryTitle')}
          </span>
        </div>
        <div className="relative z-10 flex flex-1 items-center justify-around gap-2 px-5 py-4">
          <div className="flex flex-1 flex-col items-center">
            <div className="mb-1.5 text-xs font-medium text-[var(--color-text-muted)]">
              {t('contest.summaryVisible')}
            </div>
            <div className="text-2xl font-bold leading-none text-[var(--color-primary)] max-md:text-xl">
              {visibleCount}
            </div>
          </div>
          <div className="h-8 w-px bg-[var(--color-border)] opacity-50" />
          <div className="flex flex-1 flex-col items-center">
            <div className="mb-1.5 text-xs font-medium text-[var(--color-text-muted)]">
              {t('contest.summaryFavorites')}
            </div>
            <div className="text-2xl font-bold leading-none text-[var(--color-primary)] max-md:text-xl">
              {favoriteCount}
            </div>
          </div>
          <div className="h-8 w-px bg-[var(--color-border)] opacity-50" />
          <div className="flex flex-1 flex-col items-center">
            <div className="mb-1.5 text-xs font-medium text-[var(--color-text-muted)]">
              {t('contest.summaryRunning')}
            </div>
            <div className="text-2xl font-bold leading-none text-[var(--color-primary)] max-md:text-xl">
              {runningCount}
            </div>
          </div>
        </div>
      </div>

      {/* Next contest card */}
      <div className="glass-panel relative flex flex-col overflow-hidden rounded-[var(--radius-lg)]">
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(130deg,var(--gradient-start),var(--gradient-end)_42%,transparent_72%)]" />
        <div className="relative z-10 flex-shrink-0 border-b border-[var(--card-divider)] px-5 py-3">
          <span className="text-sm font-medium text-[var(--color-text-soft)]">
            {t('contest.nextContest')}
          </span>
        </div>
        <div className="relative z-10 flex flex-1 flex-col justify-center gap-2 px-5 py-4">
          {nextContest ? (
            <>
              <div className="line-clamp-2 text-[15px] font-semibold leading-relaxed text-[var(--color-text)]">
                {nextContest.name}
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)]">
                <span>{getPlatformLabel(nextContest.platform, locale)}</span>
                <span className="opacity-50">&middot;</span>
                <span>{nextContest.startHourMinute}</span>
              </div>
            </>
          ) : (
            <div className="py-2.5 text-center text-sm text-[var(--color-text-muted)]">
              {t('contest.noNextContest')}
            </div>
          )}
        </div>
      </div>

      {/* Platform coverage card */}
      <div className="glass-panel relative flex flex-col overflow-hidden rounded-[var(--radius-lg)]">
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(130deg,var(--gradient-start),var(--gradient-end)_42%,transparent_72%)]" />
        <div className="relative z-10 flex-shrink-0 border-b border-[var(--card-divider)] px-5 py-3">
          <span className="text-sm font-medium text-[var(--color-text-soft)]">
            {t('contest.platformCoverage')}
          </span>
        </div>
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 py-3 scrollbar-thin">
          <div className="flex flex-col gap-2.5">
            {platformsWithCount.map(p => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-[var(--radius-sm)] border-b border-[var(--color-border)] px-0 py-2 text-[13px] transition-all hover:bg-[var(--color-surface-muted)] hover:px-1.5"
              >
                <span className="font-medium text-[var(--color-text)]">
                  {getPlatformLabel(p.name, locale)}
                </span>
                <span className="font-semibold text-[var(--color-primary)]">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
