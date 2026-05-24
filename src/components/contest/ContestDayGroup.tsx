import { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContestCard } from './ContestCard';
import type { Contest } from '@/types';

interface ContestDayGroupProps {
  title: string;
  contests: Contest[];
  now: number;
  selectedPlatforms: Record<string, boolean>;
  isFavorite: (contest: Contest) => boolean;
  getPlatformImage: (platform: string) => string;
  variant?: 'today' | 'tomorrow' | 'future' | 'history';
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onOpenContest: (contest: Contest) => void;
  onToggleFavorite: (contest: Contest) => void;
}

export function ContestDayGroup({
  title,
  contests,
  now,
  selectedPlatforms,
  isFavorite,
  getPlatformImage,
  variant,
  collapsible,
  expanded,
  onToggle,
  onOpenContest,
  onToggleFavorite,
}: ContestDayGroupProps) {
  const visibleContests = useMemo(
    () => contests.filter((c) => selectedPlatforms[c.platform]),
    [contests, selectedPlatforms],
  );

  const visibleCount = visibleContests.length;

  return (
    <div className="mb-3">
      {/* Collapsible header */}
      {collapsible && (
        <div className="mb-2">
          <div
            className="flex cursor-pointer select-none items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-3 shadow-[var(--card-shadow)] transition-all hover:bg-[rgba(255,161,22,0.08)]"
            onClick={onToggle}
          >
            <span
              className={cn(
                'text-[15px] font-[620]',
                variant === 'history' ? 'text-[var(--color-text-soft)]' : 'text-[var(--color-text)]',
              )}
            >
              {title}
            </span>
            <span className="text-[13px] text-[var(--color-text-muted)]">({visibleCount} 场)</span>
            <ChevronDown
              size={18}
              className={cn(
                'ml-auto flex-shrink-0 text-[var(--color-text-muted)] transition-transform duration-[var(--motion-base)]',
                expanded && 'rotate-180',
              )}
            />
          </div>
        </div>
      )}

      {/* Content card */}
      {(!collapsible || expanded) && (
        <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] backdrop-blur-sm">
          {/* Gradient border effect */}
          <div className="pointer-events-none absolute inset-0 rounded-[var(--radius-lg)] bg-[linear-gradient(180deg,rgba(255,161,22,0.14),rgba(20,184,166,0.08))]" style={{ padding: '1px', mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />

          {!collapsible && (
            <div className="border-b border-[var(--card-divider)] px-5 py-3">
              <span className="text-[15px] font-[620] text-[var(--color-text)]">{title}</span>
            </div>
          )}

          {visibleCount === 0 && collapsible ? (
            <div className="p-5 text-center text-sm text-[var(--color-text-muted)]">这里没有比赛喵~</div>
          ) : (
            <div>
              {visibleContests.map((contest, idx) => (
                <div key={idx}>
                  <ContestCard
                    contest={contest}
                    now={now}
                    isFavorite={isFavorite(contest)}
                    platformImage={getPlatformImage(contest.platform)}
                    onOpen={onOpenContest}
                    onToggleFavorite={onToggleFavorite}
                  />
                  {idx < visibleContests.length - 1 && (
                    <div className="mx-0 h-px bg-[var(--card-divider)]" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
