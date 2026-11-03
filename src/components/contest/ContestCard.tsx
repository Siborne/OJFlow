import { useMemo } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Contest } from '@/types';
import { useI18n } from '@/i18n';

type ContestState = 'upcoming' | 'running' | 'ended';

interface ContestCardProps {
  contest: Contest;
  now: number;
  isFavorite: boolean;
  platformImage: string;
  onOpen: (contest: Contest) => void;
  onToggleFavorite: (contest: Contest) => void;
}

export function ContestCard({
  contest,
  now,
  isFavorite,
  platformImage,
  onOpen,
  onToggleFavorite,
}: ContestCardProps) {
  const { t } = useI18n();
  const state = useMemo<ContestState>(() => {
    const start = contest.startTimeSeconds * 1000;
    const end = start + contest.durationSeconds * 1000;
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'running';
    return 'ended';
  }, [contest.startTimeSeconds, contest.durationSeconds, now]);

  const stateLabel =
    state === 'upcoming'
      ? t('contest.stateUpcoming')
      : state === 'running'
        ? t('contest.stateRunning')
        : t('contest.stateEnded');

  const stateColorClass =
    state === 'upcoming'
      ? 'bg-[var(--color-primary)]'
      : state === 'running'
        ? 'bg-[var(--color-success)]'
        : 'bg-[rgba(148,163,184,0.62)]';

  const tagClass =
    state === 'upcoming'
      ? 'bg-[var(--color-primary-weak)] text-[var(--color-primary)]'
      : state === 'running'
        ? 'bg-[var(--color-success-weak)] text-[var(--color-success)]'
        : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]';

  const countdown = useMemo(() => {
    if (!contest.startTimeSeconds) return null;
    const diff = contest.startTimeSeconds * 1000 - now;
    if (diff <= 0 || diff > 24 * 60 * 60 * 1000) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return t('contest.startsIn', { hours, minutes });
  }, [contest.startTimeSeconds, now, t]);

  return (
    <div className="relative flex items-center px-4 py-3">
      <div
        className={cn('absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full', stateColorClass)}
      />
      <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)]">
        <img src={platformImage} alt={contest.platform} className="h-full w-full object-cover" />
      </div>
      <div
        className="ml-3.5 flex-1 cursor-pointer rounded-[var(--radius-sm)]"
        role="button"
        tabIndex={0}
        onClick={() => onOpen(contest)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen(contest);
          }
        }}
      >
        <div className="mb-1 text-sm font-[610] text-[var(--color-text)]">{contest.name}</div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">
            {contest.startHourMinute} - {contest.endHourMinute}
          </span>
          <span className={cn('rounded-full px-2 py-0.5 text-xs', tagClass)}>{stateLabel}</span>
          {countdown && (
            <span className="rounded-full bg-[var(--color-success-weak)] px-2 py-0.5 text-xs text-[var(--color-success)]">
              {countdown}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpen(contest)}
          className="border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-weak)]"
        >
          {t('contest.join')}
        </Button>
        <button
          type="button"
          onClick={() => onToggleFavorite(contest)}
          aria-label={isFavorite ? t('contest.unfavorite') : t('contest.favorite')}
          aria-pressed={isFavorite}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--color-surface-muted)]"
        >
          <Star
            size={20}
            className={cn(
              'transition-colors',
              isFavorite
                ? 'fill-[var(--color-warning)] text-[var(--color-warning)]'
                : 'text-[var(--color-text-muted)]',
            )}
          />
        </button>
      </div>
    </div>
  );
}
