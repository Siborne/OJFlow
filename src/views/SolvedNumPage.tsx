import { useCallback, useEffect, useState } from 'react';
import { BarChart3, HelpCircle, LibraryBig, PieChart, RefreshCw, Search, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { DataDonut } from '@/components/dashboard/DataDonut';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { ContestService } from '@/services/contest';
import { SolvedNumService } from '@/services/solved';
import { getPlatformLabel } from '@/utils/platform-labels';

interface PlatformConfig {
  name: string;
  shortName: string;
  color: string;
  problemUrl: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    name: 'Codeforces',
    shortName: 'CF',
    color: '#4080ff',
    problemUrl: 'https://codeforces.com/problemset',
  },
  {
    name: 'AtCoder',
    shortName: 'AtC',
    color: '#66b2ff',
    problemUrl: 'https://atcoder.jp/contests/archive',
  },
  {
    name: '力扣',
    shortName: 'LC',
    color: '#9966ff',
    problemUrl: 'https://leetcode.cn/problemset/',
  },
  {
    name: '洛谷',
    shortName: 'LG',
    color: '#32cd32',
    problemUrl: 'https://www.luogu.com.cn/problem/list',
  },
  {
    name: '牛客',
    shortName: 'NC',
    color: '#ff6600',
    problemUrl: 'https://ac.nowcoder.com/acm/problem/list',
  },
  { name: 'VJudge', shortName: 'VJ', color: '#ffa500', problemUrl: 'https://vjudge.net/problem' },
  {
    name: 'HDU',
    shortName: 'HDU',
    color: '#969696',
    problemUrl: 'https://acm.hdu.edu.cn/listproblem.php?vol=1',
  },
  { name: 'POJ', shortName: 'POJ', color: '#c8c8c8', problemUrl: 'https://poj.org/problemlist' },
  {
    name: '蓝桥云课',
    shortName: 'LQ',
    color: '#ffd700',
    problemUrl: 'https://www.lanqiao.cn/problems/',
  },
  { name: 'QOJ', shortName: 'QOJ', color: '#ff1493', problemUrl: 'https://qoj.ac/problems' },
];

const images: Record<string, string> = {
  Codeforces: new URL('../assets/platforms/Codeforces.jpg', import.meta.url).href,
  AtCoder: new URL('../assets/platforms/AtCoder.jpg', import.meta.url).href,
  力扣: new URL('../assets/platforms/LeetCode.jpg', import.meta.url).href,
  洛谷: new URL('../assets/platforms/Luogu.jpg', import.meta.url).href,
  牛客: new URL('../assets/platforms/Nowcoder.jpg', import.meta.url).href,
  VJudge: new URL('../assets/platforms/VJudge.jpg', import.meta.url).href,
  HDU: new URL('../assets/platforms/HDU.jpg', import.meta.url).href,
  POJ: new URL('../assets/platforms/POJ.jpg', import.meta.url).href,
  蓝桥云课: new URL('../assets/platforms/Lanqiao.jpg', import.meta.url).href,
  QOJ: new URL('../assets/platforms/QOJ.jpg', import.meta.url).href,
};

const STORAGE_KEY = 'solved_usernames';

function loadSavedUsernames(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
}

function saveUsernames(data: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage failures.
  }
}

function splitUsers(value: string): string[] {
  return value
    .split(';')
    .map(item => item.trim())
    .filter(Boolean);
}

function PlatformCard({ config }: { config: PlatformConfig }) {
  const { t, locale } = useI18n();
  const [username, setUsername] = useState(() => loadSavedUsernames()[config.name] || '');
  const [result, setResult] = useState<{
    solved: number;
    users: number;
    failed?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const save = useCallback(
    (value: string) => {
      setUsername(value);
      const all = loadSavedUsernames();
      all[config.name] = value;
      saveUsernames(all);
    },
    [config.name],
  );

  const query = useCallback(
    async (userOverride?: string) => {
      const raw = userOverride ?? username;
      const users = splitUsers(raw);
      if (users.length === 0) return;
      setLoading(true);
      setResult(null);
      try {
        let totalSolved = 0;
        for (const user of users) {
          const data = await SolvedNumService.getSolvedNum(config.name, user);
          totalSolved += Math.max(0, data.solvedNum);
        }
        setResult({ solved: totalSolved, users: users.length });
      } catch {
        setResult({ solved: 0, users: users.length, failed: true });
      } finally {
        setLoading(false);
      }
    },
    [config.name, username],
  );

  useEffect(() => {
    const handler = (event: CustomEvent) => {
      if (event.detail === config.name) void query();
    };
    window.addEventListener('solved-query-all', handler as EventListener);
    return () => window.removeEventListener('solved-query-all', handler as EventListener);
  }, [config.name, query]);

  const hasSpecialHelp = config.name === '牛客' || config.name === '蓝桥云课';
  const platformName = getPlatformLabel(config.name, locale);

  return (
    <div className="clay-card relative overflow-hidden rounded-[var(--radius-lg)]">
      <div className="flex items-center gap-2 border-b border-[var(--card-divider)] bg-[var(--color-surface-muted)] px-3 py-2">
        <img
          src={images[config.name]}
          alt={platformName}
          className="h-7 w-7 rounded-md border border-[var(--color-border)]"
        />
        <span className="text-sm font-bold text-[var(--color-text)]">{platformName}</span>
        <div className="flex-1" />
        {hasSpecialHelp && (
          <button
            type="button"
            onClick={() => {
              void ContestService.openUrl(
                config.name === '牛客'
                  ? 'https://ac.nowcoder.com/acm/home'
                  : 'https://www.lanqiao.cn/users/',
              );
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--color-primary)]"
          >
            <HelpCircle size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={() => void ContestService.openUrl(config.problemUrl)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--color-primary)]"
          title={t('solved.openLibrary', { platform: platformName })}
          aria-label={t('solved.openLibrary', { platform: platformName })}
        >
          <LibraryBig size={16} />
        </button>
        <button
          type="button"
          onClick={() => void query()}
          disabled={loading}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--color-primary)]"
          title={t('solved.refreshPlatform', { platform: platformName })}
          aria-label={t('solved.refreshPlatform', { platform: platformName })}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="px-3 pt-3">
        <div className="relative">
          <input
            type="text"
            value={username}
            onChange={event => {
              save(event.target.value);
              setResult(null);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter' && username.trim() && !loading) void query();
            }}
            disabled={loading}
            placeholder={
              config.name === '牛客' || config.name === '蓝桥云课'
                ? t('solved.idPlaceholder')
                : t('solved.userPlaceholder')
            }
            className="w-full border-b border-[var(--color-border)] bg-transparent py-1.5 pr-8 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
          />
          {username && !loading && (
            <button
              type="button"
              onClick={() => {
                save('');
                setResult(null);
              }}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[11px] text-[var(--color-text-muted)]">
            {t('solved.multiUserHint')}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => void query()}
            disabled={loading || !username.trim()}
            className="rounded-md bg-[var(--color-primary)] px-4 py-1 text-xs font-medium text-[var(--color-primary-foreground)] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? t('solved.querying') : t('common.query')}
          </button>
        </div>
      </div>

      <div className="px-3 pb-3 pt-2">
        {loading && (
          <div className="flex items-center gap-2 py-1">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
              <div
                className="h-full animate-pulse rounded-full bg-[var(--color-primary)]"
                style={{ width: '60%' }}
              />
            </div>
          </div>
        )}

        {result && !loading && (
          <div
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              result.failed
                ? 'bg-[var(--color-warning-weak)] text-[var(--color-warning)]'
                : 'bg-[var(--color-success-weak)] text-[var(--color-success)]'
            }`}
          >
            {result.failed
              ? t('solved.queryFailed')
              : result.users > 1
                ? t('solved.resultMulti', { count: result.solved, users: result.users })
                : t('solved.resultSingle', { count: result.solved })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SolvedNumPage() {
  const { t, locale } = useI18n();
  const [pieData, setPieData] = useState<{
    platforms: { name: string; solved: number; color: string }[];
  } | null>(null);

  const queryAll = useCallback(() => {
    for (const platform of PLATFORMS) {
      window.dispatchEvent(new CustomEvent('solved-query-all', { detail: platform.name }));
    }
  }, []);

  const showAnalytics = useCallback(async () => {
    const platformData: { name: string; solved: number; color: string }[] = [];
    const loaded = loadSavedUsernames();

    for (const platform of PLATFORMS) {
      const users = splitUsers(loaded[platform.name] ?? '');
      if (users.length === 0) continue;
      try {
        const results = await Promise.all(
          users.map(user => SolvedNumService.getSolvedNum(platform.name, user)),
        );
        const sum = results.reduce((total, result) => total + Math.max(0, result.solvedNum), 0);
        if (sum > 0) {
          platformData.push({ name: platform.name, solved: sum, color: platform.color });
        }
      } catch {
        // Skip a platform that cannot be queried.
      }
    }

    setPieData({ platforms: platformData.sort((a, b) => b.solved - a.solved) });
  }, []);

  const total = pieData?.platforms.reduce((sum, item) => sum + item.solved, 0) ?? 0;
  const topPlatform = pieData?.platforms[0] ?? null;

  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader
        title={t('solved.title')}
        actions={
          <>
            <button
              type="button"
              onClick={() => void showAnalytics()}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--color-primary)]"
              title={t('solved.generateChart')}
              aria-label={t('solved.generateChart')}
            >
              <PieChart size={22} />
            </button>
            <button
              type="button"
              onClick={queryAll}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--color-primary)]"
              title={t('solved.queryAll')}
              aria-label={t('solved.queryAll')}
            >
              <Search size={22} />
            </button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {PLATFORMS.map(platform => (
            <PlatformCard key={platform.name} config={platform} />
          ))}
        </div>
      </div>

      {pieData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setPieData(null)}
          />
          <div className="glass-panel relative z-10 w-full max-w-3xl rounded-[var(--radius-xl)] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                  <BarChart3 size={16} />
                  {t('solved.chartTitle')}
                </div>
                <h3 className="mt-1 text-2xl font-[740] tracking-[-0.04em] text-[var(--color-text)]">
                  {t('solved.platformBreakdown')}
                </h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPieData(null)}>
                <X size={18} />
              </Button>
            </div>

            {pieData.platforms.length === 0 ? (
              <div className="py-12 text-center text-[var(--color-text-muted)]">
                {t('solved.noData')}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                <div className="flex flex-col items-center justify-center rounded-[20px] border border-[var(--glass-border)] bg-[var(--glass-highlight)] p-4 shadow-[var(--clay-inset)]">
                  <DataDonut
                    segments={pieData.platforms.map(item => ({
                      label: getPlatformLabel(item.name, locale),
                      value: item.solved,
                      color: item.color,
                    }))}
                    centerLabel={t('solved.chartTitle')}
                    centerValue={total.toLocaleString()}
                    size={170}
                  />
                  <div className="mt-3 text-xs text-[var(--color-text-muted)]">
                    {t('solved.total', { count: total })}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-[16px] bg-[var(--color-primary-weak)] p-3">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                        {t('solved.topPlatform')}
                      </div>
                      <div className="mt-1 text-lg font-bold text-[var(--color-primary)]">
                        {getPlatformLabel(topPlatform?.name ?? '', locale)}
                      </div>
                    </div>
                    <div className="rounded-[16px] bg-[var(--color-surface-muted)] p-3">
                      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                        {t('solved.average')}
                      </div>
                      <div className="mt-1 text-lg font-bold text-[var(--color-text)]">
                        {Math.round(total / pieData.platforms.length)}
                      </div>
                    </div>
                  </div>
                  {pieData.platforms.map(item => {
                    const percent = total > 0 ? (item.solved / total) * 100 : 0;
                    return (
                      <div key={item.name}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium text-[var(--color-text)]">
                            {getPlatformLabel(item.name, locale)}
                          </span>
                          <span className="text-[var(--color-text-muted)]">
                            {item.solved.toLocaleString()} · {Math.round(percent)}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${percent}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
