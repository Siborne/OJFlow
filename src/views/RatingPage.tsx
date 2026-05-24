import { useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { RatingService } from '@/services/rating';
import { Button } from '@/components/ui/button';

export default function RatingPage() {
  const [platform, setPlatform] = useState('Codeforces');
  const [username, setUsername] = useState('');
  const [result, setResult] = useState<{ rating: number; maxRating: number; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = useCallback(async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await RatingService.getRating(platform, username);
      setResult({ rating: data.curRating, maxRating: data.maxRating, name: data.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : '查询失败');
    } finally {
      setLoading(false);
    }
  }, [platform, username]);

  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader title="排位分查询" />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-xl">
          <div className="mb-6 flex gap-2">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            >
              <option value="Codeforces">Codeforces</option>
              <option value="AtCoder">AtCoder</option>
            </select>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入用户名..."
              className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <Button onClick={handleSearch} disabled={loading || !username.trim()}>
              {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Search size={16} />}
              查询
            </Button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-[var(--color-error)] bg-[rgba(248,113,113,0.1)] p-4 text-sm text-[var(--color-error)]">{error}</div>
          )}

          {result && (
            <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
              <div className="mb-2 text-sm text-[var(--color-text-muted)]">{platform} - {username}</div>
              <div className="text-4xl font-bold text-[var(--color-primary)]">{result.rating}</div>
              <div className="mt-2 text-sm text-[var(--color-text-muted)]">最高: {result.maxRating}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
