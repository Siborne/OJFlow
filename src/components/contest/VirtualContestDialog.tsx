import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import type { Contest } from '@/types';

interface TimerState {
  accumulatedMs: number;
  startedAt: number | null;
  running: boolean;
}

const EMPTY_STATE: TimerState = {
  accumulatedMs: 0,
  startedAt: null,
  running: false,
};

function storageKey(contest: Contest): string {
  return `ojflow_vp_timer_${contest.name}_${contest.startTimeSeconds}`;
}

function readTimer(contest: Contest): TimerState {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(contest)) ?? 'null');
    if (!parsed || typeof parsed !== 'object') return EMPTY_STATE;
    const value = parsed as Record<string, unknown>;
    return {
      accumulatedMs:
        typeof value.accumulatedMs === 'number' && value.accumulatedMs >= 0
          ? value.accumulatedMs
          : 0,
      startedAt: typeof value.startedAt === 'number' ? value.startedAt : null,
      running: value.running === true,
    };
  } catch {
    return EMPTY_STATE;
  }
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
}

export function VirtualContestDialog({
  contest,
  onClose,
}: {
  contest: Contest;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<TimerState>(() => readTimer(contest));
  const [now, setNow] = useState(Date.now());
  const durationMs = Math.max(1, contest.durationSeconds) * 1000;

  useEffect(() => {
    setState(readTimer(contest));
  }, [contest]);

  useEffect(() => {
    if (!state.running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state.running]);

  const elapsedMs = useMemo(
    () => state.accumulatedMs + (state.running && state.startedAt ? now - state.startedAt : 0),
    [now, state],
  );
  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const finished = elapsedMs >= durationMs;

  const persist = (next: TimerState) => {
    setState(next);
    setNow(Date.now());
    try {
      localStorage.setItem(storageKey(contest), JSON.stringify(next));
    } catch {
      // Keep the in-memory timer when storage is unavailable.
    }
  };

  const start = () => {
    persist({
      accumulatedMs: finished ? 0 : state.accumulatedMs,
      startedAt: Date.now(),
      running: true,
    });
  };

  const pause = () => {
    if (!state.startedAt) return;
    persist({
      accumulatedMs: state.accumulatedMs + Date.now() - state.startedAt,
      startedAt: null,
      running: false,
    });
  };

  const reset = () => persist(EMPTY_STATE);

  return (
    <div className="fixed inset-0 z-[82] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-panel relative z-10 w-full max-w-md rounded-[var(--radius-xl)] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-[var(--color-primary-weak)] text-[var(--color-primary)]">
              <Timer size={22} />
            </span>
            <div>
              <h3 className="text-lg font-semibold">{t('vp.title')}</h3>
              <p className="mt-0.5 line-clamp-1 text-xs text-[var(--color-text-muted)]">
                {contest.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--color-surface-muted)]"
          >
            <X size={17} />
          </button>
        </div>

        <div className="my-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]/45 px-4 py-6 text-center">
          <div className="font-mono text-5xl font-bold tracking-[-0.05em] text-[var(--color-primary)]">
            {formatClock(finished ? 0 : remainingMs)}
          </div>
          <div className="mt-2 text-xs text-[var(--color-text-muted)]">
            {finished ? t('vp.finished') : t('vp.remaining')}
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-[image:var(--gradient-primary)] transition-[width] duration-500"
              style={{ width: `${Math.min(100, (elapsedMs / durationMs) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-[var(--color-text-muted)]">
            <span>{t('vp.elapsed', { time: formatClock(elapsedMs) })}</span>
            <span>{formatClock(durationMs)}</span>
          </div>
        </div>

        <div className="flex justify-center gap-2">
          {state.running ? (
            <Button onClick={pause} className="gap-1.5">
              <Pause size={15} />
              {t('vp.pause')}
            </Button>
          ) : (
            <Button onClick={start} className="gap-1.5" disabled={finished}>
              <Play size={15} />
              {state.accumulatedMs > 0 ? t('vp.resume') : t('vp.start')}
            </Button>
          )}
          <Button variant="outline" onClick={reset} className="gap-1.5">
            <RotateCcw size={14} />
            {t('vp.reset')}
          </Button>
        </div>
        <p className="mt-4 text-center text-[10px] leading-4 text-[var(--color-text-muted)]">
          {t('vp.hint')}
        </p>
      </div>
    </div>
  );
}
