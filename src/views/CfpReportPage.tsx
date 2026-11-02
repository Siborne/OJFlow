import { useState, useCallback } from 'react';
import { Search, BarChart3, Download } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { ReportService } from '@/services/report';
import type { ProblemStats, TagStats } from '../../shared/types';
import { useI18n } from '@/i18n';
import { getProblemTagLabel } from '../../shared/problem-tags';

export default function CfpReportPage() {
  const { t, locale } = useI18n();
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
      const report = await ReportService.getCodeforcesReport(handle.trim());
      setTotalSolved(report.totalSolved);
      setRatingStats(report.ratingStats);
      setTagStats(report.tagStats);
    } catch (e) {
      setError(
        locale === 'en-US'
          ? t('report.queryFailed')
          : e instanceof Error
            ? e.message
            : t('report.queryFailed'),
      );
    } finally {
      setLoading(false);
    }
  }, [handle, locale, t]);

  const maxCount = Math.max(1, ...ratingStats.map(r => r.count), ...tagStats.map(t => t.count));

  const exportReport = useCallback(() => {
    const payload = {
      handle: handle.trim(),
      generatedAt: new Date().toISOString(),
      totalSolved,
      ratingStats,
      tagStats,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ojflow-cf-report-${handle.trim() || 'user'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [handle, ratingStats, tagStats, totalSolved]);

  const ratingColors = ['#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#fbbf24', '#ef4444'];

  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader title={t('report.title')} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl">
          {/* Search */}
          <div className="mb-6 flex gap-2">
            <input
              type="text"
              value={handle}
              onChange={e => setHandle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchReport()}
              placeholder={t('report.handlePlaceholder')}
              className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <Button onClick={fetchReport} disabled={loading || !handle.trim()}>
              {loading ? (
                <div className="mr-1 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Search size={16} />
              )}
              {t('report.generate')}
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
                <div className="absolute inset-0 bg-[linear-gradient(130deg,var(--gradient-start),var(--gradient-end)_42%,transparent_72%)]" />
                <div className="relative z-10 text-center">
                  <div className="mb-1 text-sm text-[var(--color-text-muted)]">
                    {t('report.summary', { handle })}
                  </div>
                  <div className="text-5xl font-bold text-[var(--color-primary)]">
                    {totalSolved}
                  </div>
                  <div className="mt-1 text-sm text-[var(--color-text-muted)]">
                    {t('report.totalAc')}
                  </div>
                  <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={exportReport}>
                    <Download size={14} />
                    {t('report.export')}
                  </Button>
                </div>
              </div>

              {/* Rating distribution */}
              {ratingStats.length > 0 && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
                    <BarChart3 size={16} className="text-[var(--color-primary)]" />
                    {t('report.difficulty')}
                  </h4>
                  <div className="space-y-2">
                    {ratingStats.map((r, i) => (
                      <div key={r.rating} className="flex items-center gap-3">
                        <span className="w-14 text-right text-xs text-[var(--color-text-muted)]">
                          {r.rating}
                        </span>
                        <div className="flex-1">
                          <div
                            className="h-5 rounded transition-all duration-300"
                            style={{
                              width: `${(r.count / maxCount) * 100}%`,
                              backgroundColor: ratingColors[i % ratingColors.length],
                            }}
                          />
                        </div>
                        <span className="w-8 text-xs font-medium text-[var(--color-text)]">
                          {r.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tag distribution */}
              {tagStats.length > 0 && (
                <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
                  <h4 className="mb-4 text-sm font-semibold text-[var(--color-text)]">
                    {t('report.tags')}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {tagStats.map(topic => {
                      const opacity = 0.4 + (topic.count / maxCount) * 0.6;
                      return (
                        <span
                          key={topic.tag}
                          className="rounded-full px-3 py-1 text-xs font-medium transition-all hover:scale-105"
                          style={{
                            backgroundColor: `rgba(255, 161, 22, ${opacity})`,
                            color: 'var(--color-primary)',
                          }}
                        >
                          {getProblemTagLabel(topic.tag, locale)} ({topic.count})
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
