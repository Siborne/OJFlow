import type { Contest } from '@/types';

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
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] items-stretch gap-3 max-md:grid-cols-1">
      {/* Overview card */}
      <div className="relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(130deg,rgba(255,161,22,0.12),rgba(20,184,166,0.03)_42%,transparent_72%)]" />
        <div className="relative z-10 flex-shrink-0 border-b border-[var(--card-divider)] px-5 py-3">
          <span className="text-sm font-medium text-[var(--color-text-soft)]">比赛总览</span>
        </div>
        <div className="relative z-10 flex flex-1 items-center justify-around gap-2 px-5 py-4">
          <div className="flex flex-1 flex-col items-center">
            <div className="mb-1.5 text-xs font-medium text-[var(--color-text-muted)]">可见</div>
            <div className="text-2xl font-bold leading-none text-[var(--color-primary)] max-md:text-xl">{visibleCount}</div>
          </div>
          <div className="h-8 w-px bg-[var(--color-border)] opacity-50" />
          <div className="flex flex-1 flex-col items-center">
            <div className="mb-1.5 text-xs font-medium text-[var(--color-text-muted)]">收藏</div>
            <div className="text-2xl font-bold leading-none text-[var(--color-primary)] max-md:text-xl">{favoriteCount}</div>
          </div>
          <div className="h-8 w-px bg-[var(--color-border)] opacity-50" />
          <div className="flex flex-1 flex-col items-center">
            <div className="mb-1.5 text-xs font-medium text-[var(--color-text-muted)]">进行中</div>
            <div className="text-2xl font-bold leading-none text-[var(--color-primary)] max-md:text-xl">{runningCount}</div>
          </div>
        </div>
      </div>

      {/* Next contest card */}
      <div className="relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(130deg,rgba(255,161,22,0.12),rgba(20,184,166,0.03)_42%,transparent_72%)]" />
        <div className="relative z-10 flex-shrink-0 border-b border-[var(--card-divider)] px-5 py-3">
          <span className="text-sm font-medium text-[var(--color-text-soft)]">下一场</span>
        </div>
        <div className="relative z-10 flex flex-1 flex-col justify-center gap-2 px-5 py-4">
          {nextContest ? (
            <>
              <div className="line-clamp-2 text-[15px] font-semibold leading-relaxed text-[var(--color-text)]">
                {nextContest.name}
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-[var(--color-text-muted)]">
                <span>{nextContest.platform}</span>
                <span className="opacity-50">&middot;</span>
                <span>{nextContest.startHourMinute}</span>
              </div>
            </>
          ) : (
            <div className="py-2.5 text-center text-sm text-[var(--color-text-muted)]">暂无比赛</div>
          )}
        </div>
      </div>

      {/* Platform coverage card */}
      <div className="relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)]">
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(130deg,rgba(255,161,22,0.12),rgba(20,184,166,0.03)_42%,transparent_72%)]" />
        <div className="relative z-10 flex-shrink-0 border-b border-[var(--card-divider)] px-5 py-3">
          <span className="text-sm font-medium text-[var(--color-text-soft)]">平台覆盖</span>
        </div>
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 py-3 scrollbar-thin">
          <div className="flex flex-col gap-2.5">
            {platformsWithCount.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-[var(--radius-sm)] border-b border-[rgba(255,161,22,0.08)] px-0 py-2 text-[13px] transition-all hover:bg-[rgba(255,161,22,0.04)] hover:px-1.5"
              >
                <span className="font-medium text-[var(--color-text)]">{p.name}</span>
                <span className="font-semibold text-[var(--color-primary)]">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
