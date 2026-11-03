import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clipboard,
  ExternalLink,
  Inbox,
  LoaderCircle,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { useI18n, type MessageKey } from '@/i18n';
import type {
  CompanionStatus,
  PracticeProblem,
  PracticeProblemUpdate,
  PracticeStatus,
} from '../../shared/types';
import { cn } from '@/lib/utils';

const FILTERS: Array<{ id: PracticeStatus | 'all'; key: MessageKey }> = [
  { id: 'inbox', key: 'practice.inbox' },
  { id: 'practicing', key: 'practice.practicing' },
  { id: 'review', key: 'practice.review' },
  { id: 'solved', key: 'practice.solved' },
  { id: 'all', key: 'practice.all' },
];

const STATUS_ACTIONS: Array<{ status: PracticeStatus; key: MessageKey }> = [
  { status: 'inbox', key: 'practice.markInbox' },
  { status: 'practicing', key: 'practice.markPracticing' },
  { status: 'review', key: 'practice.markReview' },
  { status: 'solved', key: 'practice.markSolved' },
];

const STATUS_STYLES: Record<PracticeStatus, string> = {
  inbox: 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]',
  practicing: 'bg-[var(--color-primary-weak)] text-[var(--color-primary)]',
  review: 'bg-[var(--color-warning-weak)] text-[var(--color-warning)]',
  solved: 'bg-[var(--color-success-weak)] text-[var(--color-success)]',
};

function replaceProblem(problems: PracticeProblem[], updated: PracticeProblem): PracticeProblem[] {
  return problems
    .map(problem => (problem.id === updated.id ? updated : problem))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export default function PracticeInboxPage() {
  const { t, locale } = useI18n();
  const [problems, setProblems] = useState<PracticeProblem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<PracticeStatus | 'all'>('inbox');
  const [companion, setCompanion] = useState<CompanionStatus>({
    running: false,
    port: null,
  });
  const [loading, setLoading] = useState(true);
  const [noteDraft, setNoteDraft] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextProblems, status] = await Promise.all([
        window.api.listPracticeProblems(),
        window.api.getCompanionStatus(),
      ]);
      setProblems(nextProblems);
      setCompanion(status);
      setSelectedId(current => current ?? nextProblems[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('practice.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return window.api.onPracticeImported(problem => {
      setProblems(current => {
        const exists = current.some(item => item.id === problem.id);
        return exists ? replaceProblem(current, problem) : [problem, ...current];
      });
      setSelectedId(problem.id);
      setFilter('inbox');
    });
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? problems : problems.filter(problem => problem.status === filter)),
    [filter, problems],
  );

  const selected = useMemo(
    () => problems.find(problem => problem.id === selectedId) ?? filtered[0] ?? null,
    [filtered, problems, selectedId],
  );

  useEffect(() => {
    setNoteDraft(selected?.notes ?? '');
  }, [selected?.id, selected?.notes]);

  const updateProblem = useCallback(
    async (id: string, updates: PracticeProblemUpdate) => {
      try {
        const updated = await window.api.updatePracticeProblem(id, updates);
        if (!updated) return;
        setProblems(current => replaceProblem(current, updated));
        setError('');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : t('practice.updateFailed'));
      }
    },
    [t],
  );

  const deleteProblem = useCallback(async () => {
    if (!selected || !window.confirm(t('practice.deleteConfirm', { name: selected.name }))) return;
    try {
      const deleted = await window.api.deletePracticeProblem(selected.id);
      if (!deleted) return;
      const remaining = problems.filter(problem => problem.id !== selected.id);
      setProblems(remaining);
      setSelectedId(remaining[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('practice.deleteFailed'));
    }
  }, [problems, selected, t]);

  const copySample = useCallback(async (text: string, key: string) => {
    await window.api.copyText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(''), 1200);
  }, []);

  const formatTime = (value: number) =>
    new Date(value).toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader
        title={t('practice.title')}
        actions={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void load()}
            title={t('common.refresh')}
          >
            <RotateCcw size={18} />
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-6xl">
          <section className="mb-4 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)]">
            <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[var(--color-primary-weak)] text-[var(--color-primary)]">
                <Inbox size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-[700] tracking-[-0.03em]">
                    {t('practice.subtitle')}
                  </h3>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      companion.running
                        ? 'bg-[var(--color-success-weak)] text-[var(--color-success)]'
                        : 'bg-[var(--color-warning-weak)] text-[var(--color-warning)]',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        companion.running
                          ? 'bg-[var(--color-success)]'
                          : 'bg-[var(--color-warning)]',
                      )}
                    />
                    {companion.running && companion.port
                      ? t('practice.receiverOn', { port: companion.port })
                      : t('practice.receiverOff')}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-muted)]">
                  {t('practice.receiverHint')}
                </p>
              </div>
              <div className="grid gap-1 text-xs text-[var(--color-text-muted)]">
                <span>1. {t('practice.importStep1')}</span>
                <span>2. {t('practice.importStep2')}</span>
                <span>3. {t('practice.importStep3')}</span>
              </div>
            </div>
          </section>

          {error && (
            <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-error)] bg-[var(--color-error-weak)] px-4 py-3 text-sm text-[var(--color-error)]">
              {error}
            </div>
          )}

          <div className="mb-3 flex flex-wrap gap-2">
            {FILTERS.map(item => {
              const count =
                item.id === 'all'
                  ? problems.length
                  : problems.filter(problem => problem.status === item.id).length;
              return (
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
                  {t(item.key)} ({count})
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center text-[var(--color-text-muted)]">
              <LoaderCircle className="mr-2 animate-spin" size={18} />
              {t('common.loading')}
            </div>
          ) : problems.length === 0 ? (
            <section className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
              <Inbox className="mx-auto text-[var(--color-primary)]" size={42} />
              <h4 className="mt-4 text-xl font-bold">{t('practice.emptyTitle')}</h4>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
                {t('practice.emptyDesc')}
              </p>
            </section>
          ) : (
            <div className="grid min-h-[520px] gap-4 lg:grid-cols-[330px_1fr]">
              <div className="scrollbar-thin max-h-[640px] space-y-2 overflow-y-auto pr-1">
                {filtered.length === 0 ? (
                  <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
                    {t('practice.filterEmpty')}
                  </div>
                ) : (
                  filtered.map(problem => (
                    <button
                      key={problem.id}
                      type="button"
                      data-testid={`practice-problem-${problem.id}`}
                      onClick={() => setSelectedId(problem.id)}
                      className={cn(
                        'w-full rounded-[var(--radius-lg)] border p-4 text-left transition-all',
                        selected?.id === problem.id
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-weak)] shadow-[var(--clay-inset)]'
                          : 'border-[var(--card-border)] bg-[var(--card-bg)] hover:-translate-y-0.5 hover:shadow-[var(--card-shadow)]',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="line-clamp-2 text-sm font-semibold text-[var(--color-text)]">
                          {problem.name}
                        </span>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold',
                            STATUS_STYLES[problem.status],
                          )}
                        >
                          {t(`practice.${problem.status}` as MessageKey)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-[var(--color-text-muted)]">
                        <span className="truncate">{problem.source || problem.group}</span>
                        <span>{problem.samples.length} samples</span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {selected && (
                <section className="rounded-[var(--radius-xl)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
                  <div className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                            STATUS_STYLES[selected.status],
                          )}
                        >
                          {t(`practice.${selected.status}` as MessageKey)}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {selected.source}
                        </span>
                      </div>
                      <h3 className="mt-2 text-2xl font-[740] tracking-[-0.04em]">
                        {selected.name}
                      </h3>
                      {selected.group && (
                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                          {selected.group}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--color-text-muted)]">
                        {selected.timeLimitMs && <span>{Math.round(selected.timeLimitMs)} ms</span>}
                        {selected.memoryLimitMb && <span>{selected.memoryLimitMb} MB</span>}
                        <span>
                          {t('practice.updatedAt', { time: formatTime(selected.updatedAt) })}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => void window.api.openUrl(selected.url)}
                      >
                        <ExternalLink size={14} />
                        {t('practice.openProblem')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void deleteProblem()}
                        title={t('common.delete')}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {STATUS_ACTIONS.map(action => (
                      <button
                        key={action.status}
                        type="button"
                        onClick={() => void updateProblem(selected.id, { status: action.status })}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                          selected.status === action.status
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary-weak)] text-[var(--color-primary)]'
                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-text)]',
                        )}
                      >
                        {t(action.key)}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold">{t('practice.notes')}</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => void updateProblem(selected.id, { notes: noteDraft })}
                      >
                        <Save size={14} />
                        {t('practice.saveNotes')}
                      </Button>
                    </div>
                    <textarea
                      value={noteDraft}
                      onChange={event => setNoteDraft(event.target.value)}
                      placeholder={t('practice.notesPlaceholder')}
                      className="min-h-24 w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm leading-6 text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div className="mt-5">
                    <h4 className="mb-3 text-sm font-semibold">{t('practice.samples')}</h4>
                    {selected.samples.length === 0 ? (
                      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-5 text-center text-sm text-[var(--color-text-muted)]">
                        {t('practice.noSamples')}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selected.samples.map((sample, index) => (
                          <div
                            key={`${selected.id}-${index}`}
                            className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]"
                          >
                            {(['input', 'output'] as const).map(kind => (
                              <div
                                key={kind}
                                className="border-b border-[var(--color-border)] last:border-b-0"
                              >
                                <div className="flex items-center justify-between bg-[var(--color-surface-muted)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                                  <span>{kind}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void copySample(
                                        sample[kind],
                                        `${selected.id}-${index}-${kind}`,
                                      )
                                    }
                                    className="inline-flex items-center gap-1 hover:text-[var(--color-primary)]"
                                  >
                                    {copiedKey === `${selected.id}-${index}-${kind}` ? (
                                      <Check size={12} />
                                    ) : (
                                      <Clipboard size={12} />
                                    )}
                                    {copiedKey === `${selected.id}-${index}-${kind}`
                                      ? t('practice.copied')
                                      : t('practice.copy')}
                                  </button>
                                </div>
                                <pre className="scrollbar-thin max-h-44 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs text-[var(--color-text)]">
                                  {sample[kind] || ' '}
                                </pre>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
