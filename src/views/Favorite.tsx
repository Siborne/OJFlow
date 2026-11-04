import { useState, useMemo, useEffect, useCallback } from 'react';
import { Star, Search, SortAsc, Edit3, Plus, Trash2, X, Timer } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useContestStore } from '@/stores/contest';
import { ContestService } from '@/services/contest';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Contest } from '@/types';
import { ContestUtils } from '@/utils/contest_utils';
import { useUiStore } from '@/stores/ui';
import { useI18n } from '@/i18n';
import { getPlatformLabel } from '@/utils/platform-labels';
import { VirtualContestDialog } from '@/components/contest/VirtualContestDialog';

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

function getContestState(contest: Contest): 'upcoming' | 'running' | 'ended' {
  const now = Date.now();
  const start = contest.startTimeSeconds * 1000;
  const end = start + contest.durationSeconds * 1000;
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'running';
  return 'ended';
}

function getStateKey(state: string) {
  if (state === 'upcoming') return 'contest.stateUpcoming' as const;
  if (state === 'running') return 'contest.stateRunning' as const;
  return 'contest.stateEnded' as const;
}

function getStateColor(state: string) {
  if (state === 'upcoming') return 'text-[var(--color-primary)] bg-[var(--color-primary-weak)]';
  if (state === 'running') return 'text-[var(--color-success)] bg-[var(--color-success-weak)]';
  return 'text-[var(--color-text-muted)] bg-[var(--color-surface-muted)]';
}

function getBarColor(state: string) {
  if (state === 'upcoming') return 'bg-[var(--color-primary)]';
  if (state === 'running') return 'bg-[var(--color-success)]';
  return 'bg-[rgba(148,163,184,0.62)]';
}

export default function Favorite() {
  const { t, locale } = useI18n();
  const store = useContestStore();
  const confirmExternalLinks = useUiStore(state => state.features.confirmExternalLinks);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [showAllEnded, setShowAllEnded] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; contest: Contest | null }>({
    show: false,
    contest: null,
  });
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [vpContest, setVpContest] = useState<Contest | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [toast, setToast] = useState('');
  const [manualForm, setManualForm] = useState({
    name: '',
    platform: 'Codeforces',
    start: '',
    durationMinutes: 120,
    link: '',
  });
  const pageSize = 20;

  const filteredFavorites = useMemo(() => {
    const list = store.favorites.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    list.sort((a, b) =>
      sortAsc ? a.startTimeSeconds - b.startTimeSeconds : b.startTimeSeconds - a.startTimeSeconds,
    );
    return list;
  }, [store.favorites, searchQuery, sortAsc]);

  const activeFavorites = useMemo(
    () => filteredFavorites.filter(c => getContestState(c) !== 'ended'),
    [filteredFavorites],
  );
  const endedFavorites = useMemo(
    () => filteredFavorites.filter(c => getContestState(c) === 'ended'),
    [filteredFavorites],
  );

  const pagedActiveFavorites = useMemo(() => {
    const start = (page - 1) * pageSize;
    return activeFavorites.slice(start, start + pageSize);
  }, [activeFavorites, page]);

  const activePageCount = Math.max(1, Math.ceil(activeFavorites.length / pageSize));

  useEffect(() => {
    if (page > activePageCount) setPage(activePageCount);
  }, [activePageCount, page]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const selectedNames = useMemo(() => Object.keys(selected).filter(k => selected[k]), [selected]);

  const openLink = useCallback(
    (contest: Contest) => {
      if (isBatchMode) {
        setSelected(prev => ({ ...prev, [contest.name]: !prev[contest.name] }));
        return;
      }
      if (!contest.link) return;
      if (!confirmExternalLinks) {
        void ContestService.openUrl(contest.link);
        return;
      }
      setConfirmDialog({ show: true, contest });
    },
    [confirmExternalLinks, isBatchMode],
  );

  const deleteSelected = useCallback(() => {
    if (selectedNames.length === 0) return;
    try {
      const { deleted } = store.removeFavorites(selectedNames);
      for (const name of deleted) {
        setSelected(prev => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
      setPage(1);
      setDeleteConfirm(false);
      setToast(t('favorites.deleted', { count: deleted.length }));
    } catch (error) {
      setToast(
        locale === 'en-US'
          ? t('favorites.deleteFailed')
          : error instanceof Error
            ? error.message
            : t('favorites.deleteFailed'),
      );
    }
  }, [locale, selectedNames, store, t]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isBatchMode) return;
      if (e.key.toLowerCase() === 'a' && e.ctrlKey) {
        e.preventDefault();
        const all: Record<string, boolean> = {};
        filteredFavorites.forEach(c => (all[c.name] = true));
        setSelected(all);
      }
      if (e.key === 'Delete') {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isBatchMode, filteredFavorites, deleteSelected]);

  const handleConfirmOpen = () => {
    if (confirmDialog.contest?.link) ContestService.openUrl(confirmDialog.contest.link);
    setConfirmDialog({ show: false, contest: null });
  };

  const addManualContest = () => {
    const name = manualForm.name.trim();
    if (!name) {
      setToast(t('favorites.nameRequired'));
      return;
    }
    if (!manualForm.start) {
      setToast(t('favorites.startRequired'));
      return;
    }
    const startSeconds = Math.floor(new Date(manualForm.start).getTime() / 1000);
    if (!Number.isFinite(startSeconds)) {
      setToast(t('favorites.invalidStart'));
      return;
    }
    const durationSeconds = Math.max(1, Math.floor(Number(manualForm.durationMinutes) || 60)) * 60;
    try {
      const contest = ContestUtils.createContest(
        name,
        startSeconds,
        durationSeconds,
        manualForm.platform,
        manualForm.link.trim() || undefined,
      );
      contest.isManual = true;
      store.addManualContest(contest);
      setShowManualDialog(false);
      setManualForm({
        name: '',
        platform: 'Codeforces',
        start: '',
        durationMinutes: 120,
        link: '',
      });
      setToast(t('favorites.added'));
    } catch (error) {
      setToast(
        locale === 'en-US'
          ? t('favorites.addFailed')
          : error instanceof Error
            ? error.message
            : t('favorites.addFailed'),
      );
    }
  };

  const renderContestCard = (contest: Contest) => {
    const state = getContestState(contest);
    return (
      <div
        key={contest.name}
        className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)] hover:border-[var(--color-primary)]"
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-[var(--radius-lg)] bg-[linear-gradient(180deg,var(--gradient-start),var(--gradient-end))]"
          style={{
            padding: '1px',
            mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />
        <div className="relative flex items-center p-3">
          {isBatchMode && (
            <input
              type="checkbox"
              data-testid={`favorite-checkbox-${contest.name}`}
              checked={!!selected[contest.name]}
              onChange={() =>
                setSelected(prev => ({ ...prev, [contest.name]: !prev[contest.name] }))
              }
              className="mr-2.5 h-4 w-4 rounded accent-[var(--color-primary)]"
            />
          )}
          <div
            className={cn(
              'absolute left-0 top-2 bottom-2 w-[3px] rounded-full',
              getBarColor(state),
            )}
          />
          <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)]">
            <img
              src={getPlatformImage(contest.platform)}
              alt={getPlatformLabel(contest.platform, locale)}
              className="h-full w-full object-cover"
            />
          </div>
          <div
            className="ml-3.5 flex-1 cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => openLink(contest)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLink(contest);
              }
            }}
          >
            <div className="mb-1 text-[15px] font-[610] leading-relaxed line-clamp-2 text-[var(--color-text)]">
              {contest.name}
            </div>
            {!store.hideDate && (
              <div className="text-[13px] text-[var(--color-text-muted)]">
                {new Intl.DateTimeFormat(locale, {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(contest.startTimeSeconds * 1000))}{' '}
                (
                {Math.floor(contest.durationSeconds / 3600) > 0
                  ? `${t('common.hoursShort', {
                      count: Math.floor(contest.durationSeconds / 3600),
                    })} `
                  : ''}
                {t('common.minutesShort', {
                  count: Math.floor((contest.durationSeconds % 3600) / 60),
                })}
                )
              </div>
            )}
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className={cn('rounded-full px-2 py-0.5 text-xs', getStateColor(state))}>
                {t(getStateKey(state))}
              </span>
              {contest.isManual && (
                <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                  {t('common.manual')}
                </span>
              )}
            </div>
          </div>
          {!isBatchMode && (
            <>
              <button
                onClick={() => setVpContest(contest)}
                aria-label={t('vp.button')}
                title={t('vp.button')}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[var(--color-primary)] hover:bg-[var(--color-primary-weak)]"
              >
                <Timer size={17} />
              </button>
              <button
                onClick={() => store.toggleFavorite(contest)}
                aria-label={t('contest.unfavorite')}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full hover:bg-[var(--color-surface-muted)]"
              >
                <Star
                  size={20}
                  className="fill-[var(--color-warning)] text-[var(--color-warning)]"
                />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      {/* App bar */}
      <PageHeader
        title={t('favorites.title')}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('favorites.addManual')}
              title={t('favorites.addManual')}
              onClick={() => setShowManualDialog(true)}
            >
              <Plus size={20} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('favorites.search')}
              title={t('favorites.search')}
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search size={20} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={sortAsc ? t('favorites.sortDesc') : t('favorites.sortAsc')}
              title={sortAsc ? t('favorites.sortDesc') : t('favorites.sortAsc')}
              onClick={() => setSortAsc(!sortAsc)}
            >
              <SortAsc size={20} className={cn(!sortAsc && 'rotate-180')} />
            </Button>
            <Button
              variant={isBatchMode ? 'secondary' : 'ghost'}
              size="icon"
              aria-label={t('favorites.batch')}
              title={t('favorites.batch')}
              data-testid="favorite-batch-toggle"
              onClick={() => {
                setIsBatchMode(!isBatchMode);
                setSelected({});
              }}
            >
              <Edit3 size={20} />
            </Button>
          </>
        }
      />

      {showSearch && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('favorites.searchPlaceholder')}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {filteredFavorites.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">
            {t('favorites.empty')}
          </div>
        ) : (
          <>
            {/* Summary grid */}
            <div className="mb-4 grid grid-cols-4 gap-3 max-md:grid-cols-2">
              <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--gradient-start),var(--gradient-end)_48%,transparent_80%)]" />
                <div className="relative z-10">
                  <div className="text-2xl font-bold text-[var(--color-primary)]">
                    {filteredFavorites.length}
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {t('favorites.currentResults')}
                  </div>
                  <div className="mt-2 text-xs text-[var(--color-text-soft)]">
                    {t('favorites.total', { count: store.favorites.length })}
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--gradient-start),var(--gradient-end)_48%,transparent_80%)]" />
                <div className="relative z-10">
                  <div className="text-2xl font-bold text-[var(--color-primary)]">
                    {activeFavorites.filter(c => getContestState(c) === 'upcoming').length}
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {t('contest.stateUpcoming')}
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--gradient-start),var(--gradient-end)_48%,transparent_80%)]" />
                <div className="relative z-10">
                  <div className="text-2xl font-bold text-[var(--color-success)]">
                    {activeFavorites.filter(c => getContestState(c) === 'running').length}
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {t('contest.stateRunning')}
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,var(--gradient-start),var(--gradient-end)_48%,transparent_80%)]" />
                <div className="relative z-10">
                  <div className="text-2xl font-bold text-[var(--color-text-muted)]">
                    {endedFavorites.length}
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {t('contest.stateEnded')}
                  </div>
                </div>
              </div>
            </div>

            {/* Active contests */}
            {pagedActiveFavorites.length > 0 && (
              <div className="mb-2 text-sm font-semibold text-[var(--color-text-soft)]">
                {t('favorites.activeSection')}
              </div>
            )}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
              {pagedActiveFavorites.map(renderContestCard)}
            </div>

            {activePageCount > 1 && (
              <div
                className="mt-3 flex items-center justify-center gap-2"
                data-testid="favorite-pagination"
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(current => current - 1)}
                >
                  {t('common.previous')}
                </Button>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {page} / {activePageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= activePageCount}
                  onClick={() => setPage(current => current + 1)}
                >
                  {t('common.next')}
                </Button>
              </div>
            )}

            {/* Ended contests */}
            {endedFavorites.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">
                  {t('favorites.ended', { count: endedFavorites.length })}
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 opacity-72 hover:opacity-100 transition-opacity">
                  {(showAllEnded ? endedFavorites : endedFavorites.slice(0, 20)).map(
                    renderContestCard,
                  )}
                </div>
                {endedFavorites.length > 20 && (
                  <div className="mt-3 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAllEnded(current => !current)}
                    >
                      {showAllEnded
                        ? t('favorites.collapseEnded')
                        : t('favorites.showAll', { count: endedFavorites.length })}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Batch bar */}
      {isBatchMode && (
        <div className="sticky bottom-0 flex h-14 items-center justify-between border-t border-[var(--color-border)] bg-[var(--nav-bg-color)] px-4 backdrop-blur-[var(--frost-blur)] shadow-[var(--shadow-3)]">
          <div className="flex items-center gap-2">
            <button
              className="text-xs font-medium text-[var(--color-primary)]"
              data-testid="favorite-select-all"
              onClick={() =>
                setSelected(
                  filteredFavorites.reduce<Record<string, boolean>>((acc, contest) => {
                    acc[contest.name] = true;
                    return acc;
                  }, {}),
                )
              }
            >
              {t('favorites.selectAll')}
            </button>
            <button
              className="text-xs text-[var(--color-text-muted)]"
              onClick={() => setSelected({})}
            >
              {t('favorites.clear')}
            </button>
            <span
              className="text-[13px] text-[var(--color-text-muted)]"
              data-testid="favorite-selected-count"
            >
              {t('favorites.selected', { count: selectedNames.length })}
            </span>
          </div>
          <Button
            variant="destructive"
            size="sm"
            data-testid="favorite-delete-selected"
            disabled={selectedNames.length === 0}
            onClick={() => setDeleteConfirm(true)}
          >
            <Trash2 size={14} className="mr-1" /> {t('favorites.deleteSelected')}
          </Button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-[var(--color-text)] px-4 py-2 text-xs font-medium text-[var(--color-surface)] shadow-lg">
          {toast}
        </div>
      )}

      {vpContest && <VirtualContestDialog contest={vpContest} onClose={() => setVpContest(null)} />}

      {showManualDialog && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowManualDialog(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">
                {t('favorites.addTitle')}
              </h3>
              <button
                onClick={() => setShowManualDialog(false)}
                aria-label={t('favorites.closeAdd')}
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={manualForm.name}
                onChange={event => setManualForm(form => ({ ...form, name: event.target.value }))}
                placeholder={t('favorites.contestName')}
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
              />
              <select
                value={manualForm.platform}
                onChange={event =>
                  setManualForm(form => ({ ...form, platform: event.target.value }))
                }
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
              >
                {['Codeforces', 'AtCoder', '洛谷', '蓝桥云课', '力扣', '牛客', 'Other'].map(
                  platform => (
                    <option key={platform} value={platform}>
                      {getPlatformLabel(platform, locale)}
                    </option>
                  ),
                )}
              </select>
              <input
                type="datetime-local"
                value={manualForm.start}
                onChange={event => setManualForm(form => ({ ...form, start: event.target.value }))}
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
              />
              <input
                type="number"
                min={1}
                value={manualForm.durationMinutes}
                onChange={event =>
                  setManualForm(form => ({ ...form, durationMinutes: Number(event.target.value) }))
                }
                placeholder={t('favorites.durationMinutes')}
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
              />
              <input
                value={manualForm.link}
                onChange={event => setManualForm(form => ({ ...form, link: event.target.value }))}
                placeholder={t('favorites.linkOptional')}
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowManualDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={addManualContest}>{t('common.save')}</Button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirm(false)} />
          <div className="relative z-10 w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-[var(--color-text)]">
              {t('favorites.deleteTitle')}
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              {t('favorites.deleteConfirm', { count: selectedNames.length })}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteConfirm(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="destructive" onClick={deleteSelected}>
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
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
