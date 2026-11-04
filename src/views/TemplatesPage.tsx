import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Braces,
  Check,
  Clipboard,
  Code2,
  Pencil,
  Plus,
  Save,
  Search,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { useTemplateStore } from '@/stores/templates';
import type { CodeTemplate } from '../../shared/types';
import { templatesToMarkdown } from '@/utils/template-markdown';
import { useUiStore } from '@/stores/ui';
import { CodeEditor } from '@/components/CodeEditor';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = {
  title: '',
  language: 'cpp',
  category: '',
  content: '',
};

function languageLabel(value: string): string {
  return LANGUAGES.find(language => language.value === value)?.label ?? value;
}

function CodePreview({ content, className }: { content: string; className?: string }) {
  return <CodeEditor value={content} language="other" className={className} onChange={() => {}} />;
}

export default function TemplatesPage() {
  const { t } = useI18n();
  const items = useTemplateStore(state => state.items);
  const init = useTemplateStore(state => state.init);
  const addItem = useTemplateStore(state => state.addItem);
  const updateItem = useTemplateStore(state => state.updateItem);
  const removeItem = useTemplateStore(state => state.removeItem);
  const templatesExpanded = useUiStore(state => state.templatesExpanded);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('all');
  const [category, setCategory] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const editorRef = useRef<{ insertText: (text: string) => void } | null>(null);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 1800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const languages = useMemo(
    () => [...new Set(items.map(item => item.language).filter(Boolean))].sort(),
    [items],
  );
  const categories = useMemo(
    () => [...new Set(items.map(item => item.category).filter(Boolean))].sort(),
    [items],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter(item => {
      if (language !== 'all' && item.language !== language) return false;
      if (category !== 'all' && item.category !== category) return false;
      if (!query) return true;
      return `${item.title} ${item.category} ${item.content}`.toLowerCase().includes(query);
    });
  }, [category, items, language, search]);
  const selected = items.find(item => item.id === selectedId) ?? filtered[0] ?? null;

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  };

  const openEdit = (item: CodeTemplate) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      language: item.language,
      category: item.category,
      content: item.content,
    });
    setShowDialog(true);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    if (editingId) {
      const updated = updateItem(editingId, form);
      if (updated) setSelectedId(updated.id);
      setNotice(t('templates.updated'));
    } else {
      const created = addItem(form);
      setSelectedId(created.id);
      setNotice(t('templates.added'));
    }
    setShowDialog(false);
  };

  const copyTemplate = async (item: CodeTemplate) => {
    await window.api.copyText(item.content);
    setCopied(true);
    setNotice(t('templates.copied'));
    window.setTimeout(() => setCopied(false), 1400);
  };

  const exportMarkdown = async () => {
    if (filtered.length === 0) {
      setNotice(t('templates.exportEmpty'));
      return;
    }
    try {
      const markdown = templatesToMarkdown(filtered, useUiStore.getState().templateExport);
      const exported = await window.api.exportTemplateMarkdown({
        markdown,
        fileName: 'ojflow-templates.md',
      });
      setNotice(exported ? t('templates.exported') : t('templates.exportFailed'));
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : t('templates.exportFailed'));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      <PageHeader
        title={t('templates.title')}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void exportMarkdown()}
            >
              <Save size={15} />
              {t('templates.export')}
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={openCreate}
              data-testid="template-create"
            >
              <Plus size={15} />
              {t('templates.add')}
            </Button>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <section className="shrink-0 rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 shadow-[var(--card-shadow)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--color-primary-weak)] text-[var(--color-primary)]">
              <Braces size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">{t('templates.subtitle')}</h3>
              <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                {t('templates.count', { count: items.length })}
              </p>
            </div>
            <label className="relative block w-full lg:max-w-sm">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={t('templates.searchPlaceholder')}
                className="h-9 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] pl-9 pr-3 text-xs outline-none focus:border-[var(--color-primary)]"
              />
            </label>
          </div>
        </section>

        {items.length === 0 ? (
          <section className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] text-center">
            <Braces size={44} className="text-[var(--color-primary)] opacity-70" />
            <h4 className="mt-4 text-xl font-bold">{t('templates.emptyTitle')}</h4>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
              {t('templates.emptyDesc')}
            </p>
            <Button className="mt-4 gap-1.5" onClick={openCreate}>
              <Plus size={15} />
              {t('templates.add')}
            </Button>
          </section>
        ) : (
          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[330px_minmax(0,1fr)]">
            <aside className="flex min-h-0 flex-col gap-2">
              <div className="grid shrink-0 grid-cols-2 gap-2">
                <select
                  value={language}
                  onChange={event => setLanguage(event.target.value)}
                  aria-label={t('templates.language')}
                  className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs"
                >
                  <option value="all">{t('templates.allLanguages')}</option>
                  {languages.map(value => (
                    <option key={value} value={value}>
                      {languageLabel(value)}
                    </option>
                  ))}
                </select>
                <select
                  value={category}
                  onChange={event => setCategory(event.target.value)}
                  aria-label={t('templates.category')}
                  className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-xs"
                >
                  <option value="all">{t('templates.allCategories')}</option>
                  {categories.map(value => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {filtered.length === 0 ? (
                  <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">
                    {t('templates.noResults')}
                  </div>
                ) : (
                  filtered.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      data-testid={`template-${item.id}`}
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        'w-full rounded-[var(--radius-md)] border p-3 text-left transition',
                        selected?.id === item.id
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-weak)] shadow-[var(--clay-inset)]'
                          : 'border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--color-primary)]',
                      )}
                    >
                      <div className="line-clamp-1 text-xs font-semibold">{item.title}</div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
                        <span className="rounded-full bg-[var(--color-surface-muted)] px-1.5 py-0.5">
                          {languageLabel(item.language)}
                        </span>
                        <span className="truncate">{item.category}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </aside>

            {selected ? (
              <section className="scrollbar-thin flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)]">
                <div className="flex flex-col gap-3 border-b border-[var(--color-border)] p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate text-xl font-[740] tracking-[-0.035em]">
                      {selected.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-weak)] px-2 py-1 font-semibold text-[var(--color-primary)]">
                        <Code2 size={11} />
                        {languageLabel(selected.language)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2 py-1">
                        <Tag size={11} />
                        {selected.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => void copyTemplate(selected)}
                    >
                      {copied ? <Check size={14} /> : <Clipboard size={14} />}
                      {t('templates.copy')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('templates.edit')}
                      title={t('templates.edit')}
                      onClick={() => openEdit(selected)}
                    >
                      <Pencil size={15} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('common.delete')}
                      title={t('common.delete')}
                      onClick={() => {
                        if (
                          !window.confirm(t('templates.deleteConfirm', { title: selected.title }))
                        )
                          return;
                        removeItem(selected.id);
                        setSelectedId(null);
                        setNotice(t('templates.deleted'));
                      }}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
                <div className="scrollbar-thin min-h-0 flex-1 overflow-auto bg-[#111827] p-4">
                  {templatesExpanded ? (
                    <CodePreview content={selected.content} />
                  ) : (
                    <div className="flex h-full min-h-[220px] items-center justify-center text-xs text-slate-300">
                      {t('templates.expandCode')}
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <div className="flex items-center justify-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
                {t('templates.noResults')}
              </div>
            )}
          </div>
        )}
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
            className="glass-panel relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[var(--radius-xl)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] p-5">
              <h3 className="text-lg font-semibold">
                {editingId ? t('templates.edit') : t('templates.add')}
              </h3>
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                aria-label={t('common.close')}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--color-surface-muted)]"
              >
                <X size={17} />
              </button>
            </div>
            <div className="scrollbar-thin min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
              <input
                value={form.title}
                onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
                placeholder={t('templates.titlePlaceholder')}
                aria-label={t('templates.templateTitle')}
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={form.language}
                  onChange={event =>
                    setForm(current => ({ ...current, language: event.target.value }))
                  }
                  aria-label={t('templates.language')}
                  className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                >
                  {LANGUAGES.map(language => (
                    <option key={language.value} value={language.value}>
                      {language.label}
                    </option>
                  ))}
                </select>
                <input
                  value={form.category}
                  onChange={event =>
                    setForm(current => ({ ...current, category: event.target.value }))
                  }
                  placeholder={t('templates.categoryPlaceholder')}
                  aria-label={t('templates.category')}
                  list="template-categories"
                  className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
                />
                <datalist id="template-categories">
                  {categories.map(value => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </div>
              <CodeEditor
                value={form.content}
                onChange={content => setForm(current => ({ ...current, content }))}
                language={form.language}
                placeholder={t('templates.contentPlaceholder')}
                aria-label={t('templates.content')}
                data-testid="template-content"
                onReady={view => {
                  editorRef.current = {
                    insertText: (text: string) => {
                      const editorView = view as unknown as {
                        dispatch: (payload: unknown) => void;
                        state: { selection: { main: number } };
                      };
                      const pos = editorView.state.selection.main;
                      editorView.dispatch({
                        changes: { from: pos, to: pos, insert: text },
                        selection: { anchor: pos + text.length },
                      });
                    },
                  };
                }}
                className="min-h-[360px] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--color-border)] p-4">
              <Button type="button" variant="ghost" onClick={() => setShowDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={!form.title.trim() || !form.content.trim()}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
