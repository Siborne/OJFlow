import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Clipboard,
  Code2,
  ExternalLink,
  FileText,
  Inbox,
  LoaderCircle,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
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
import { PLATFORM_LOGOS } from '@/utils/platform-assets';
import { CodeEditor } from '@/components/CodeEditor';
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

const CODE_LANGUAGES = [
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'other', label: 'Other' },
];

const STATUS_STYLES: Record<PracticeStatus, string> = {
  inbox: 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]',
  practicing: 'bg-[var(--color-primary-weak)] text-[var(--color-primary)]',
  review: 'bg-[var(--color-warning-weak)] text-[var(--color-warning)]',
  solved: 'bg-[var(--color-success-weak)] text-[var(--color-success)]',
};

const SOURCE_ALIASES: Record<string, string> = {
  LeetCode: '力扣',
  Luogu: '洛谷',
  Nowcoder: '牛客',
  Lanqiao: '蓝桥云课',
};

function replaceProblem(problems: PracticeProblem[], updated: PracticeProblem): PracticeProblem[] {
  return problems
    .map(problem => (problem.id === updated.id ? updated : problem))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function sourceLogo(source: string): string | undefined {
  return PLATFORM_LOGOS[source] ?? PLATFORM_LOGOS[SOURCE_ALIASES[source]];
}

export default function PracticeInboxPage() {
  const { t, locale } = useI18n();
  const [problems, setProblems] = useState<PracticeProblem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<PracticeStatus | 'all'>('inbox');
  const [search, setSearch] = useState('');
  const [companion, setCompanion] = useState<CompanionStatus>({
    running: false,
    port: null,
  });
  const [loading, setLoading] = useState(true);
  const [noteDraft, setNoteDraft] = useState('');
  const [codeDraft, setCodeDraft] = useState('');
  const [languageDraft, setLanguageDraft] = useState('cpp');
  const [copiedKey, setCopiedKey] = useState('');
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: '',
    url: '',
    group: '',
    input: '',
    output: '',
  });
  const selectedRef = useRef<PracticeProblem | null>(null);

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

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(''), 1800);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return problems.filter(problem => {
      if (filter !== 'all' && problem.status !== filter) return false;
      if (!query) return true;
      return `${problem.name} ${problem.group} ${problem.source}`.toLowerCase().includes(query);
    });
  }, [filter, problems, search]);

  const selected = useMemo(
    () => problems.find(problem => problem.id === selectedId) ?? filtered[0] ?? null,
    [filtered, problems, selectedId],
  );
  selectedRef.current = selected;

  useEffect(() => {
    const current = selectedRef.current;
    setNoteDraft(current?.notes ?? '');
    setCodeDraft(current?.code ?? '');
    setLanguageDraft(current?.codeLanguage ?? 'cpp');
  }, [selected?.id]);

  const updateProblem = useCallback(
    async (id: string, updates: PracticeProblemUpdate, successMessage?: string) => {
      try {
        const updated = await window.api.updatePracticeProblem(id, updates);
        if (!updated) return;
        setProblems(current => replaceProblem(current, updated));
        setError('');
        if (successMessage) setFlash(successMessage);
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

  const addManualProblem = useCallback(async () => {
    if (!manualForm.name.trim() || !manualForm.url.trim()) return;
    try {
      const created = await window.api.createPracticeProblem({
        name: manualForm.name.trim(),
        group: manualForm.group.trim(),
        url: manualForm.url.trim(),
        tests:
          manualForm.input || manualForm.output
            ? [{ input: manualForm.input, output: manualForm.output }]
            : [],
      });
      if (!created) {
        setError(t('practice.manualFailed'));
        return;
      }
      setProblems(current => [created, ...current.filter(item => item.id !== created.id)]);
      setSelectedId(created.id);
      setFilter('all');
      setShowManual(false);
      setManualForm({ name: '', url: '', group: '', input: '', output: '' });
      setFlash(t('practice.manualAdded'));
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('practice.manualFailed'));
    }
  }, [manualForm, t]);

  const copyText = useCallback(async (text: string, key: string) => {
    await window.api.copyText(text);
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(''), 1200);
  }, []);

  const copyAllSamples = useCallback(async () => {
    if (!selected) return;
    const text = selected.samples
      .map(
        (sample, index) =>
          `Sample ${index + 1}\n[Input]\n${sample.input}\n[Output]\n${sample.output}`,
      )
      .join('\n\n');
    await copyText(text, `${selected.id}-all`);
    setFlash(t('practice.allSamplesCopied'));
  }, [copyText, selected, t]);

  const formatTime = (value: number) =>
    new Date(value).toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <PageHeader
        title={t('practice.title')}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowManual(true)}
              title={t('practice.addManual')}
              aria-label={t('practice.addManual')}
            >
              <Plus size={19} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void load()}
              title={t('common.refresh')}
            >
              <RotateCcw size={18} />
            </Button>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <section className="shrink-0 rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 shadow-[var(--card-shadow)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-primary-weak)] text-[var(--color-primary)]">
              <Inbox size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{t('practice.subtitle')}</h3>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold',
                    companion.running
                      ? 'bg-[var(--color-success-weak)] text-[var(--color-success)]'
                      : 'bg-[var(--color-warning-weak)] text-[var(--color-warning)]',
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      companion.running ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]',
                    )}
                  />
                  {companion.running && companion.port
                    ? t('practice.receiverOn', { port: companion.port })
                    : t('practice.receiverOff')}
                </span>
              </div>
              <p className="mt-1 line-clamp-1 text-xs text-[var(--color-text-muted)]">
                {t('practice.receiverHint')}
              </p>
            </div>
            <div className="hidden shrink-0 items-center gap-3 text-[10px] text-[var(--color-text-muted)] xl:flex">
              <span>1. {t('practice.importStep1')}</span>
              <span>2. {t('practice.importStep2')}</span>
              <span>3. {t('practice.importStep3')}</span>
            </div>
          </div>
        </section>

        {error && (
          <div className="shrink-0 rounded-[var(--radius-md)] border border-[var(--color-error)] bg-[var(--color-error-weak)] px-4 py-2 text-sm text-[var(--color-error)]">
            {error}
          </div>
        )}

        <div className="flex shrink-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
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
                    'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
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
          <label className="relative block w-full lg:max-w-xs">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={t('practice.searchPlaceholder')}
              className="h-9 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-3 text-xs outline-none focus:border-[var(--color-primary)]"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center text-[var(--color-text-muted)]">
            <LoaderCircle className="mr-2 animate-spin" size={18} />
            {t('common.loading')}
          </div>
        ) : problems.length === 0 ? (
          <section className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
            <Inbox className="text-[var(--color-primary)]" size={42} />
            <h4 className="mt-4 text-xl font-bold">{t('practice.emptyTitle')}</h4>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--color-text-muted)]">
              {t('practice.emptyDesc')}
            </p>
          </section>
        ) : (
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[330px_minmax(0,1fr)]">
            <div className="scrollbar-thin min-h-0 space-y-2 overflow-y-auto pr-1">
              <div className="px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                {t('practice.problemCount', { count: filtered.length })}
              </div>
              {filtered.length === 0 ? (
                <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
                  {t('practice.filterEmpty')}
                </div>
              ) : (
                filtered.map(problem => {
                  const logo = sourceLogo(problem.source);
                  return (
                    <button
                      key={problem.id}
                      type="button"
                      data-testid={`practice-problem-${problem.id}`}
                      onClick={() => setSelectedId(problem.id)}
                      className={cn(
                        'w-full rounded-[var(--radius-md)] border p-3 text-left transition-all',
                        selected?.id === problem.id
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-weak)] shadow-[var(--clay-inset)]'
                          : 'border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--color-primary)] hover:shadow-[var(--card-shadow)]',
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-[var(--color-border)] bg-white">
                          {logo ? (
                            <img
                              src={logo}
                              alt={problem.source}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileText size={15} className="text-[var(--color-primary)]" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-xs font-semibold text-[var(--color-text)]">
                            {problem.name}
                          </span>
                          <span className="mt-1 flex items-center justify-between gap-2 text-[10px] text-[var(--color-text-muted)]">
                            <span className="truncate">{problem.source || problem.group}</span>
                            <span
                              className={cn(
                                'shrink-0 rounded-full px-1.5 py-0.5 font-semibold',
                                STATUS_STYLES[problem.status],
                              )}
                            >
                              {t(`practice.${problem.status}` as MessageKey)}
                            </span>
                          </span>
                          <span className="mt-1.5 flex items-center gap-2 text-[9px] text-[var(--color-text-muted)]">
                            <span>
                              {t('practice.samplesCount', { count: problem.samples.length })}
                            </span>
                            {problem.code && <Code2 size={10} />}
                            {problem.notes && <FileText size={10} />}
                          </span>
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {selected ? (
              <section className="scrollbar-thin min-h-0 overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-[var(--card-shadow)]">
                <div className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-[10px] font-semibold',
                          STATUS_STYLES[selected.status],
                        )}
                      >
                        {t(`practice.${selected.status}` as MessageKey)}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {selected.source}
                      </span>
                    </div>
                    <h3 className="mt-2 text-xl font-[740] tracking-[-0.035em]">{selected.name}</h3>
                    {selected.group && (
                      <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
                        {selected.group}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-[var(--color-text-muted)]">
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
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {STATUS_ACTIONS.map(action => (
                    <button
                      key={action.status}
                      type="button"
                      onClick={() => void updateProblem(selected.id, { status: action.status })}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors',
                        selected.status === action.status
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-weak)] text-[var(--color-primary)]'
                          : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-text)]',
                      )}
                    >
                      {t(action.key)}
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  <section className="flex min-h-[300px] flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]/35 p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        <Code2 size={15} className="text-[var(--color-primary)]" />
                        {t('practice.code')}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={languageDraft}
                          onChange={event => setLanguageDraft(event.target.value)}
                          aria-label={t('practice.codeLanguage')}
                          className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[11px]"
                        >
                          {CODE_LANGUAGES.map(language => (
                            <option key={language.value} value={language.value}>
                              {language.label}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1 px-2"
                          disabled={!codeDraft}
                          onClick={() => void copyText(codeDraft, `${selected.id}-code`)}
                        >
                          {copiedKey === `${selected.id}-code` ? (
                            <Check size={12} />
                          ) : (
                            <Clipboard size={12} />
                          )}
                          {t('practice.copyCode')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 px-2"
                          onClick={() =>
                            void updateProblem(
                              selected.id,
                              { code: codeDraft, codeLanguage: languageDraft },
                              t('practice.codeSaved'),
                            )
                          }
                        >
                          <Save size={12} />
                          {t('practice.saveCode')}
                        </Button>
                      </div>
                    </div>
                    <CodeEditor
                      value={codeDraft}
                      onChange={setCodeDraft}
                      aria-label={t('practice.code')}
                      language={languageDraft}
                      testId="practice-code-editor"
                      placeholder={t('practice.codePlaceholder')}
                      className="min-h-[250px] flex-1 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]"
                    />
                    <p className="mt-2 text-[10px] leading-4 text-[var(--color-text-muted)]">
                      {t('practice.codeHint')}
                    </p>
                  </section>

                  <section className="flex min-h-[300px] flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]/35 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        <FileText size={15} className="text-[var(--color-primary)]" />
                        {t('practice.notes')}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 px-2"
                        onClick={() => void updateProblem(selected.id, { notes: noteDraft })}
                      >
                        <Save size={12} />
                        {t('practice.saveNotes')}
                      </Button>
                    </div>
                    <textarea
                      value={noteDraft}
                      onChange={event => setNoteDraft(event.target.value)}
                      aria-label={t('practice.notes')}
                      placeholder={t('practice.notesPlaceholder')}
                      className="min-h-[250px] flex-1 resize-none rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm leading-6 text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                    />
                    <p className="mt-2 text-[10px] leading-4 text-[var(--color-text-muted)]">
                      {t('practice.noteHint')}
                    </p>
                  </section>
                </div>

                <section className="mt-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">{t('practice.samples')}</h4>
                      <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                        {t('practice.samplesCount', { count: selected.samples.length })}
                      </span>
                    </div>
                    {selected.samples.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 px-2"
                        onClick={() => void copyAllSamples()}
                      >
                        {copiedKey === `${selected.id}-all` ? (
                          <Check size={12} />
                        ) : (
                          <Clipboard size={12} />
                        )}
                        {t('practice.copyAllSamples')}
                      </Button>
                    )}
                  </div>
                  {selected.samples.length === 0 ? (
                    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border)] p-5 text-center text-sm text-[var(--color-text-muted)]">
                      {t('practice.noSamples')}
                    </div>
                  ) : (
                    <div className="scrollbar-thin grid max-h-[360px] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                      {selected.samples.map((sample, index) => (
                        <div
                          key={`${selected.id}-${index}`}
                          className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]/25"
                        >
                          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                            <span>Sample #{index + 1}</span>
                            <button
                              type="button"
                              onClick={() =>
                                void copyText(
                                  `Input:\n${sample.input}\n\nOutput:\n${sample.output}`,
                                  `${selected.id}-${index}`,
                                )
                              }
                              className="inline-flex items-center gap-1 hover:text-[var(--color-primary)]"
                            >
                              {copiedKey === `${selected.id}-${index}` ? (
                                <Check size={11} />
                              ) : (
                                <Clipboard size={11} />
                              )}
                              {copiedKey === `${selected.id}-${index}`
                                ? t('practice.copied')
                                : t('practice.copy')}
                            </button>
                          </div>
                          {(['input', 'output'] as const).map(kind => (
                            <div
                              key={kind}
                              className="border-b border-[var(--color-border)] last:border-b-0"
                            >
                              <div className="bg-[var(--color-surface-muted)] px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                                {kind}
                              </div>
                              <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-[11px] text-[var(--color-text)]">
                                {sample[kind] || ' '}
                              </pre>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </section>
            ) : (
              <div className="flex items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
                {t('practice.selectProblem')}
              </div>
            )}
          </div>
        )}
      </div>

      {showManual && (
        <div className="fixed inset-0 z-[78] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowManual(false)}
          />
          <form
            onSubmit={event => {
              event.preventDefault();
              void addManualProblem();
            }}
            className="glass-panel relative z-10 w-full max-w-xl rounded-[var(--radius-xl)] p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t('practice.addManual')}</h3>
              <button
                type="button"
                onClick={() => setShowManual(false)}
                aria-label={t('common.close')}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--color-surface-muted)]"
              >
                <X size={17} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={manualForm.name}
                onChange={event =>
                  setManualForm(current => ({ ...current, name: event.target.value }))
                }
                placeholder={t('practice.manualTitle')}
                aria-label={t('practice.manualTitle')}
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
              />
              <input
                value={manualForm.url}
                onChange={event =>
                  setManualForm(current => ({ ...current, url: event.target.value }))
                }
                placeholder={t('practice.manualUrl')}
                aria-label={t('practice.manualUrl')}
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
              />
              <input
                value={manualForm.group}
                onChange={event =>
                  setManualForm(current => ({ ...current, group: event.target.value }))
                }
                placeholder={t('practice.manualGroup')}
                aria-label={t('practice.manualGroup')}
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <textarea
                  value={manualForm.input}
                  onChange={event =>
                    setManualForm(current => ({ ...current, input: event.target.value }))
                  }
                  placeholder={t('practice.manualSampleInput')}
                  aria-label={t('practice.manualSampleInput')}
                  className="min-h-24 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs outline-none focus:border-[var(--color-primary)]"
                />
                <textarea
                  value={manualForm.output}
                  onChange={event =>
                    setManualForm(current => ({ ...current, output: event.target.value }))
                  }
                  placeholder={t('practice.manualSampleOutput')}
                  aria-label={t('practice.manualSampleOutput')}
                  className="min-h-24 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)]">
                {t('practice.manualHint')}
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowManual(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!manualForm.name.trim() || !manualForm.url.trim()}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {flash && (
        <div className="fixed bottom-8 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[var(--color-text)] px-4 py-2 text-xs font-medium text-[var(--color-surface)] shadow-lg">
          {flash}
        </div>
      )}
    </div>
  );
}
