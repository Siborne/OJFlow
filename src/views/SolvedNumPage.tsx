import { useState, useEffect, useCallback, useRef } from 'react';
import * as echarts from 'echarts';
import { Search, RefreshCw, PieChart, HelpCircle, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SolvedNumService } from '@/services/solved';
import { Button } from '@/components/ui/button';
import { ContestService } from '@/services/contest';

interface PlatformConfig {
  name: string;
  shortName: string;
  color: string;
  labelField: string;
}

const PLATFORMS: PlatformConfig[] = [
  { name: 'Codeforces', shortName: 'CF', color: '#4080ff', labelField: '用户名' },
  { name: 'AtCoder', shortName: 'AtC', color: '#66b2ff', labelField: '用户名' },
  { name: '力扣', shortName: '力扣', color: '#9966ff', labelField: '用户名' },
  { name: '洛谷', shortName: '洛谷', color: '#32cd32', labelField: '用户名' },
  { name: '牛客', shortName: '牛客', color: '#ff6600', labelField: 'id' },
  { name: 'VJudge', shortName: 'VJ', color: '#ffa500', labelField: '用户名' },
  { name: 'HDU', shortName: 'HDU', color: '#969696', labelField: '用户名' },
  { name: 'POJ', shortName: 'POJ', color: '#c8c8c8', labelField: '用户名' },
  { name: '蓝桥云课', shortName: '蓝桥', color: '#ffd700', labelField: 'id' },
  { name: 'QOJ', shortName: 'QOJ', color: '#ff1493', labelField: '用户名' },
];

const images: Record<string, string> = {
  Codeforces: new URL('../assets/platforms/Codeforces.jpg', import.meta.url).href,
  AtCoder: new URL('../assets/platforms/AtCoder.jpg', import.meta.url).href,
  '力扣': new URL('../assets/platforms/LeetCode.jpg', import.meta.url).href,
  '洛谷': new URL('../assets/platforms/Luogu.jpg', import.meta.url).href,
  '牛客': new URL('../assets/platforms/Nowcoder.jpg', import.meta.url).href,
  VJudge: new URL('../assets/platforms/VJudge.jpg', import.meta.url).href,
  HDU: new URL('../assets/platforms/HDU.jpg', import.meta.url).href,
  POJ: new URL('../assets/platforms/POJ.jpg', import.meta.url).href,
  '蓝桥云课': new URL('../assets/platforms/Lanqiao.jpg', import.meta.url).href,
  QOJ: new URL('../assets/platforms/QOJ.jpg', import.meta.url).href,
};

const STORAGE_KEY = 'solved_usernames';

function loadSavedUsernames(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveUsernames(data: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function PlatformCard({
  config,
  onRefresh,
  onQueryAll,
}: {
  config: PlatformConfig;
  onRefresh: (platform: string) => void;
  onQueryAll: (platform: string) => void;
}) {
  const [username, setUsername] = useState(() => loadSavedUsernames()[config.name] || '');
  const [result, setResult] = useState<{ solved: number; info: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const save = useCallback((value: string) => {
    setUsername(value);
    const all = loadSavedUsernames();
    all[config.name] = value;
    saveUsernames(all);
  }, [config.name]);

  const query = useCallback(async (userOverride?: string) => {
    const u = userOverride ?? username;
    if (!u.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      // Support multi-user with ; separator
      const users = u.split(';').map((s) => s.trim()).filter(Boolean);
      let totalSolved = 0;
      for (const user of users) {
        const data = await SolvedNumService.getSolvedNum(config.name, user);
        totalSolved += (data as { solvedNum: number }).solvedNum || 0;
      }
      const info = users.length > 1
        ? `总解题数: ${totalSolved} (${users.length}个用户)`
        : `已解决: ${totalSolved}`;
      setResult({ solved: totalSolved, info });
    } catch {
      setResult({ solved: 0, info: '查询失败，请检查网络或用户名是否正确' });
    } finally {
      setLoading(false);
    }
  }, [config.name, username]);

  // Listen for query-all from parent
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail === config.name) query();
    };
    window.addEventListener('solved-query-all', handler as EventListener);
    return () => window.removeEventListener('solved-query-all', handler as EventListener);
  }, [config.name, query]);

  const hasSpecialHelp = config.name === '牛客' || config.name === '蓝桥云课';

  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] shadow-[var(--card-shadow)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--card-divider)] bg-[rgba(211,218,220,0.3)] px-3 py-2">
        <img src={images[config.name]} alt={config.name} className="h-7 w-7 rounded-md border border-[var(--color-border)]" />
        <span className="text-sm font-bold text-[var(--color-text)]">{config.name}</span>
        <div className="flex-1" />
        {hasSpecialHelp && (
          <button
            onClick={() => {
              if (config.name === '牛客') ContestService.openUrl('https://ac.nowcoder.com/acm/home');
              else ContestService.openUrl('https://www.lanqiao.cn/users/');
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--color-primary)]"
          >
            <HelpCircle size={16} />
          </button>
        )}
        <button
          onClick={() => query()}
          disabled={loading}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--color-primary)]"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Input */}
      <div className="px-3 pt-3">
        <div className="relative">
          <input
            type="text"
            value={username}
            onChange={(e) => {
              save(e.target.value);
              setResult(null);
            }}
            disabled={loading}
            placeholder={config.name === '牛客' || config.name === '蓝桥云课' ? 'id' : '用户名'}
            className="w-full border-b border-[var(--color-border)] bg-transparent py-1.5 pr-8 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
          />
          {username && !loading && (
            <button
              onClick={() => { save(''); setResult(null); }}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="mt-0.5 text-[11px] text-gray-400">多用户用;分隔</div>
      </div>

      {/* Body */}
      <div className="px-3 pb-3 pt-2">
        {loading && (
          <div className="flex items-center gap-2 py-1">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-[rgba(126,186,213,0.3)]">
              <div className="h-full animate-pulse rounded-full bg-[var(--color-primary)]" style={{ width: '60%' }} />
            </div>
          </div>
        )}

        {result && !loading && (
          <div
            className={`text-center text-sm ${
              result.info.includes('失败') ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'
            }`}
          >
            {result.info}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SolvedNumPage() {
  const [pieData, setPieData] = useState<{
    platforms: { name: string; solved: number; color: string }[];
  } | null>(null);

  const queryAll = useCallback(() => {
    for (const p of PLATFORMS) {
      window.dispatchEvent(new CustomEvent('solved-query-all', { detail: p.name }));
    }
  }, []);

  const showPieChart = useCallback(async () => {
    const platformData: { name: string; solved: number; color: string }[] = [];
    const loaded = loadSavedUsernames();

    for (const p of PLATFORMS) {
      const u = loaded[p.name];
      if (!u?.trim()) continue;
      try {
        const users = u.split(';').map((s) => s.trim()).filter(Boolean);
        let sum = 0;
        for (const user of users) {
          const data = await SolvedNumService.getSolvedNum(p.name, user);
          sum += (data as { solvedNum: number }).solvedNum || 0;
        }
        if (sum > 0) {
          platformData.push({ name: p.name, solved: sum, color: p.color });
        }
      } catch {
        // skip platform on error
      }
    }

    if (platformData.length === 0) {
      setPieData({ platforms: [] });
    } else {
      setPieData({ platforms: platformData });
    }
  }, []);

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pieData || pieData.platforms.length === 0 || !chartRef.current) return;

    const chart = echarts.init(chartRef.current);

    chart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}题 ({d}%)',
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '75%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: 'transparent',
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: '{b}\n{d}%',
            fontSize: 11,
          },
          emphasis: {
            label: { fontSize: 16, fontWeight: 'bold' as const },
            scaleSize: 10,
          },
          data: pieData.platforms.map((p) => ({
            name: p.name,
            value: p.solved,
            itemStyle: { color: p.color },
          })),
        },
      ],
    });

    return () => chart.dispose();
  }, [pieData]);

  return (
    <div className="flex h-full flex-col bg-transparent">
      {/* App bar */}
      <PageHeader
        title="题数统计"
        actions={
          <>
            <button
              onClick={showPieChart}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--color-primary)]"
            >
              <PieChart size={22} />
            </button>
            <button
              onClick={queryAll}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--color-primary)]"
            >
              <Search size={22} />
            </button>
          </>
        }
      />

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3 max-md:grid-cols-1">
          {PLATFORMS.map((p) => (
            <PlatformCard key={p.name} config={p} onRefresh={queryAll} onQueryAll={queryAll} />
          ))}
        </div>
      </div>

      {/* Pie chart modal */}
      {pieData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPieData(null)} />
          <div className="relative z-10 w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
            <h3 className="mb-4 text-center text-lg font-semibold text-[var(--color-text)]">解题统计</h3>
            {pieData.platforms.length === 0 ? (
              <div className="py-8 text-center text-[var(--color-text-muted)]">
                暂无数据，请先查询题目
              </div>
            ) : (
              <div className="text-center">
                <div className="mb-2 text-xl font-bold text-[var(--color-success)]">
                  总计：{pieData.platforms.reduce((s, p) => s + p.solved, 0)}题
                </div>
                <div ref={chartRef} className="mx-auto h-72 w-72" />
              </div>
            )}
            <div className="mt-4 flex justify-center">
              <Button onClick={() => setPieData(null)}>关闭</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
