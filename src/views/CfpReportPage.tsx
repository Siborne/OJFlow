import { useState, useCallback } from 'react';
import { Search, BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import axios from 'axios';
import { Button } from '@/components/ui/button';

interface ProblemStats {
  rating: number;
  count: number;
}

interface TagStats {
  tag: string;
  count: number;
}

export default function CfpReportPage() {
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalSolved, setTotalSolved] = useState(0);
  const [ratingStats, setRatingStats] = useState<ProblemStats[]>([]);
  const [tagStats, setTagStats] = useState<TagStats[]>([]);

  const fetchReport = useCallback(async () => {
    if (!handle.trim()) return;
    setLoading(true);
    setError('');
    setRatingStats([]);
    setTagStats([]);
    setTotalSolved(0);

    try {
      const url = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle.trim())}&from=1&count=1000000000`;
      const res = await axios.get(url, { timeout: 15000 });

      if (res.data?.status !== 'OK') {
        throw new Error(res.data?.comment || 'API error');
      }

      const submissions = res.data.result;
      if (!Array.isArray(submissions)) {
        throw new Error('Invalid response format');
      }

      const seen = new Set<string>();
      const ratingMap = new Map<number, number>();
      const tagMap = new Map<string, number>();
      let solved = 0;

      for (const sub of submissions) {
        if (!sub.problem || sub.verdict !== 'OK') continue;
        const key = `${sub.problem.contestId}${sub.problem.index}${sub.problem.name}`;
        if (seen.has(key)) continue;
        seen.add(key);
        solved++;

        const rating = sub.problem.rating || 0;
        ratingMap.set(rating, (ratingMap.get(rating) || 0) + 1);

        const tags: string[] = sub.problem.tags || [];
        for (const tag of tags) {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        }
      }

      setTotalSolved(solved);

      const ratings = Array.from(ratingMap.entries())
        .filter(([r]) => r > 0)
        .sort((a, b) => a[0] - b[0]);
      setRatingStats(ratings.map(([rating, count]) => ({ rating, count })));

      const tags = Array.from(tagMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
      setTagStats(tags.map(([tag, count]) => ({ tag, count })));
    } catch (e) {
      setError(e instanceof Error ? e.message : '查询失败');
    } finally {
      setLoading(false);
    }
  }, [handle]);

  const maxCount = Math.max(1, ...ratingStats.map((r) => r.count), ...tagStats.map((t) => t.count));

  const ratingColors = ['#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#fbbf24', '#ef4444'];

  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader title="CF 年度报告" />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl">
          {/* Search */}
          <div className="mb-6 flex gap-2">
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchReport()}
              placeholder="输入 Codeforces Handle..."
              className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <Button onClick={fetchReport} disabled={loading || !handle.trim()}>
              {loading ? (
                <div className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Search size={16} />
              )}
              生成报告
            </Button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-[var(--color-error)] bg-[rgba(248,113,113,0.1)] p-4 text-sm text-[var(--color-error)]">
              {error}
            </div>
          )}

          {totalSolved > 0 && (
            <div className="space-y-4">
              {/* Summary card */}
              <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
                <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(14,165,233,0.12),rgba(52,211,153,0.03)_42%,transparent_72%)]" />
                <div className="relative z-10 text-center">
                  <div className="mb-1 text-sm text-[var(--color-text-muted)]">{handle} 解题统计</div>
                  <div className="text-5xl font-bold text-[var(--color-primary)]">{totalSolved}</div>
                  <div className="mt-1 text-sm text-[var(--color-text-muted)]">Total AC (已去重)</div>
                </div>
              </div>

              {/* Rating distribution */}
              {ratingStats.length > 0 && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                    <BarChart3 size={16} className="text-[var(--color-primary)]" />
                    题目难度分布
                  </h4>
                  <div className="space-y-2">
                    {ratingStats.map((r, i) => (
                      <div key={r.rating} className="flex items-center gap-3">
                        <span className="w-14 text-right text-xs text-[var(--color-text-muted)]">{r.rating}</span>
                        <div className="flex-1">
                          <div
                            className="h-5 rounded transition-all duration-300"
                            style={{
                              width: `${(r.count / maxCount) * 100}%`,
                              backgroundColor: ratingColors[i % ratingColors.length],
                            }}
                          />
                        </div>
                        <span className="w-8 text-xs font-medium text-[var(--color-text)]">{r.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tag distribution */}
              {tagStats.length > 0 && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
                  <h4 className="mb-4 text-sm font-semibold text-[var(--color-text)]">算法标签分布 (Top 20)</h4>
                  <div className="flex flex-wrap gap-2">
                    {tagStats.map((t) => {
                      const opacity = 0.4 + (t.count / maxCount) * 0.6;
                      return (
                        <span
                          key={t.tag}
                          className="rounded-full px-3 py-1 text-xs font-medium transition-all hover:scale-105"
                          style={{
                            backgroundColor: `rgba(255, 161, 22, ${opacity})`,
                            color: 'var(--color-primary)',
                          }}
                        >
                          {t.tag} ({t.count})
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
