import { useState, useMemo, useEffect, useCallback } from 'react';
import { Star, Search, SortAsc, Edit3, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useContestStore } from '@/stores/contest';
import { ContestService } from '@/services/contest';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { Contest } from '@/types';

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

function getContestState(contest: Contest): 'upcoming' | 'running' | 'ended' {
  const now = Date.now();
  const start = contest.startTimeSeconds * 1000;
  const end = start + contest.durationSeconds * 1000;
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'running';
  return 'ended';
}

function getStateLabel(state: string) {
  if (state === 'upcoming') return '即将开始';
  if (state === 'running') return '进行中';
  return '已结束';
}

function getStateColor(state: string) {
  if (state === 'upcoming') return 'text-[var(--color-primary)] bg-[rgba(14,165,233,0.1)]';
  if (state === 'running') return 'text-[var(--color-success)] bg-[rgba(52,211,153,0.1)]';
  return 'text-[var(--color-text-muted)] bg-[var(--color-surface-muted)]';
}

function getBarColor(state: string) {
  if (state === 'upcoming') return 'bg-[rgba(14,165,233,0.7)]';
  if (state === 'running') return 'bg-[rgba(52,211,153,0.78)]';
  return 'bg-[rgba(148,163,184,0.62)]';
}

export default function Favorite() {
  const store = useContestStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; contest: Contest | null }>({ show: false, contest: null });
  const pageSize = 20;

  const filteredFavorites = useMemo(() => {
    let list = store.favorites.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    list.sort((a, b) => (sortAsc ? a.startTimeSeconds - b.startTimeSeconds : b.startTimeSeconds - a.startTimeSeconds));
    return list;
  }, [store.favorites, searchQuery, sortAsc]);

  const activeFavorites = useMemo(() => filteredFavorites.filter((c) => getContestState(c) !== 'ended'), [filteredFavorites]);
  const endedFavorites = useMemo(() => filteredFavorites.filter((c) => getContestState(c) === 'ended'), [filteredFavorites]);

  const pagedActiveFavorites = useMemo(() => {
    const start = (page - 1) * pageSize;
    return activeFavorites.slice(start, start + pageSize);
  }, [activeFavorites, page]);

  const selectedNames = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);

  const openLink = useCallback((contest: Contest) => {
    if (isBatchMode) {
      setSelected((prev) => ({ ...prev, [contest.name]: !prev[contest.name] }));
      return;
    }
    if (!contest.link) return;
    setConfirmDialog({ show: true, contest });
  }, [isBatchMode]);

  const deleteSelected = useCallback(() => {
    if (selectedNames.length === 0) return;
    const { deleted } = store.removeFavorites(selectedNames);
    for (const name of deleted) {
      setSelected((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    setPage(1);
  }, [selectedNames, store]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isBatchMode) return;
      if (e.key.toLowerCase() === 'a' && e.ctrlKey) {
        e.preventDefault();
        const all: Record<string, boolean> = {};
        filteredFavorites.forEach((c) => (all[c.name] = true));
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

  const renderContestCard = (contest: Contest) => {
    const state = getContestState(contest);
    return (
      <div
        key={contest.name}
        className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)] backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)] hover:border-[rgba(14,165,233,0.2)]"
      >
        <div className="pointer-events-none absolute inset-0 rounded-[var(--radius-lg)] bg-[linear-gradient(180deg,rgba(14,165,233,0.14),rgba(52,211,153,0.08))]" style={{ padding: '1px', mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' }} />
        <div className="relative flex items-center p-3">
          {isBatchMode && (
            <input
              type="checkbox"
              checked={!!selected[contest.name]}
              onChange={() => setSelected((prev) => ({ ...prev, [contest.name]: !prev[contest.name] }))}
              className="mr-2.5 h-4 w-4 rounded accent-[var(--color-primary)]"
            />
          )}
          <div className={cn('absolute left-0 top-2 bottom-2 w-[3px] rounded-full', getBarColor(state))} />
          <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--color-border)]">
            <img src={getPlatformImage(contest.platform)} alt={contest.platform} className="h-full w-full object-cover" />
          </div>
          <div className="ml-3.5 flex-1 cursor-pointer" role="button" tabIndex={0} onClick={() => openLink(contest)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLink(contest); } }}>
            <div className="mb-1 text-[15px] font-[610] leading-relaxed line-clamp-2 text-[var(--color-text)]">{contest.name}</div>
            {!store.hideDate && (
              <div className="text-[13px] text-[var(--color-text-muted)]">{contest.formattedStartTime} ({contest.duration})</div>
            )}
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className={cn('rounded-full px-2 py-0.5 text-xs', getStateColor(state))}>{getStateLabel(state)}</span>
              {contest.isManual && <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">手动</span>}
            </div>
          </div>
          {!isBatchMode && (
            <button onClick={() => store.toggleFavorite(contest)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full hover:bg-[var(--color-surface-muted)]">
              <Star size={20} className="fill-[var(--color-warning)] text-[var(--color-warning)]" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      {/* App bar */}
      <PageHeader
        title="收藏比赛"
        actions={
          <>
            <Button variant="ghost" size="icon" onClick={() => setShowSearch(!showSearch)}><Search size={20} /></Button>
            <Button variant="ghost" size="icon" onClick={() => setSortAsc(!sortAsc)}><SortAsc size={20} /></Button>
            <Button variant="ghost" size="icon" onClick={() => setIsBatchMode(!isBatchMode)}><Edit3 size={20} /></Button>
          </>
        }
      />

      {showSearch && (
        <div className="border-b border-[var(--color-border)] bg-[rgba(255,255,255,0.58)] px-4 py-2.5">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索比赛..."
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {filteredFavorites.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[var(--color-text-muted)]">暂无收藏</div>
        ) : (
          <>
            {/* Summary grid */}
            <div className="mb-4 grid grid-cols-4 gap-3 max-md:grid-cols-2">
              <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(52,211,153,0.04)_48%,transparent_80%)]" />
                <div className="relative z-10">
                  <div className="text-2xl font-bold text-[var(--color-primary)]">{filteredFavorites.length}</div>
                  <div className="mt-1 text-xs text-[var(--color-text-muted)]">当前检索结果</div>
                  <div className="mt-2 text-xs text-[var(--color-text-soft)]">总收藏 {store.favorites.length} 场</div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(52,211,153,0.04)_48%,transparent_80%)]" />
                <div className="relative z-10 text-2xl font-bold text-[var(--color-primary)]">{activeFavorites.filter((c) => getContestState(c) === 'upcoming').length}</div>
              </div>
              <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(52,211,153,0.04)_48%,transparent_80%)]" />
                <div className="relative z-10 text-2xl font-bold text-[var(--color-success)]">{activeFavorites.filter((c) => getContestState(c) === 'running').length}</div>
              </div>
              <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(52,211,153,0.04)_48%,transparent_80%)]" />
                <div className="relative z-10 text-2xl font-bold text-[var(--color-text-muted)]">{endedFavorites.length}</div>
              </div>
            </div>

            {/* Active contests */}
            {pagedActiveFavorites.length > 0 && (
              <div className="mb-2 text-sm font-semibold text-[var(--color-text-soft)]">进行中 & 即将开始</div>
            )}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
              {pagedActiveFavorites.map(renderContestCard)}
            </div>

            {/* Ended contests */}
            {endedFavorites.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-sm font-semibold text-[var(--color-text-muted)]">已结束比赛 ({endedFavorites.length})</div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 opacity-72 hover:opacity-100 transition-opacity">
                  {endedFavorites.map(renderContestCard)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Batch bar */}
      {isBatchMode && (
        <div className="sticky bottom-0 flex h-14 items-center justify-between border-t border-[var(--color-border)] bg-[rgba(255,255,255,0.78)] px-4 backdrop-blur-[var(--frost-blur)] shadow-[0_-8px_18px_rgba(15,23,42,0.06)]">
          <span className="text-[13px] text-[var(--color-text-muted)]">已选 {selectedNames.length} 项</span>
          <Button variant="destructive" size="sm" disabled={selectedNames.length === 0} onClick={deleteSelected}>
            <Trash2 size={14} className="mr-1" /> 删除选中
          </Button>
        </div>
      )}

      {/* Confirm dialog */}
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
