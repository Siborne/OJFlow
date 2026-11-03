import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { RatingService } from '@/services/rating';
import { Button } from '@/components/ui/button';
import { getRatingColor, getRatingTierName } from '@/utils/rating-colors';
import { useI18n } from '@/i18n';
import { getPlatformLabel } from '@/utils/platform-labels';
import { useModuleAutoRefresh } from '@/hooks/useAutoRefresh';

const PLATFORMS = ['Codeforces', 'AtCoder', '力扣', '洛谷', '牛客'] as const;
const STORAGE_PREFIX = 'rating_username_';
const RESULT_PREFIX = 'rating_result_';
const LAST_PLATFORM_KEY = 'rating_last_platform';

type RatingPlatform = (typeof PLATFORMS)[number];
type RatingResult = { rating: number; maxRating: number; name: string };
type SavedRatingResult = { result: RatingResult; fetchedAt: number };

function isRatingPlatform(value: string | null): value is RatingPlatform {
  return value !== null && PLATFORMS.includes(value as RatingPlatform);
}

function readLastPlatform(): RatingPlatform {
  try {
    const value = localStorage.getItem(LAST_PLATFORM_KEY);
    return isRatingPlatform(value) ? value : 'Codeforces';
  } catch {
    return 'Codeforces';
  }
}

function saveLastPlatform(platform: RatingPlatform): void {
  try {
    localStorage.setItem(LAST_PLATFORM_KEY, platform);
  } catch {
    // Platform persistence is optional.
  }
}

function readSavedUsername(platform: string): string {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${platform}`) ?? '';
  } catch {
    return '';
  }
}

function saveUsername(platform: string, username: string): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${platform}`, username);
  } catch {
    // Username persistence is optional.
  }
}

function readSavedResult(platform: string): SavedRatingResult | null {
  try {
    const raw = localStorage.getItem(`${RESULT_PREFIX}${platform}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    const result = record.result;
    if (!result || typeof result !== 'object' || Array.isArray(result)) return null;
    const rating = result as Record<string, unknown>;
    if (
      typeof rating.name !== 'string' ||
      typeof rating.rating !== 'number' ||
      typeof rating.maxRating !== 'number' ||
      typeof record.fetchedAt !== 'number'
    ) {
      return null;
    }
    return {
      result: { name: rating.name, rating: rating.rating, maxRating: rating.maxRating },
      fetchedAt: record.fetchedAt,
    };
  } catch {
    return null;
  }
}

function saveResult(platform: string, result: RatingResult): number {
  const fetchedAt = Date.now();
  try {
    localStorage.setItem(`${RESULT_PREFIX}${platform}`, JSON.stringify({ result, fetchedAt }));
  } catch {
    // Result persistence is optional.
  }
  return fetchedAt;
}

export default function RatingPage() {
  const { t, locale } = useI18n();
  const [platform, setPlatform] = useState<RatingPlatform>(readLastPlatform);
  const [username, setUsername] = useState(() => readSavedUsername(readLastPlatform()));
  const initialResult = useMemo(() => readSavedResult(readLastPlatform()), []);
  const [result, setResult] = useState<RatingResult | null>(initialResult?.result ?? null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(initialResult?.fetchedAt ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadingRef = useRef(false);
  const autoQueryStarted = useRef(false);
  const initialPlatform = useRef(platform);
  const initialUsername = useRef(username);

  useEffect(() => {
    saveLastPlatform(platform);
    setUsername(readSavedUsername(platform));
    const saved = readSavedResult(platform);
    setResult(saved?.result ?? null);
    setFetchedAt(saved?.fetchedAt ?? null);
    setError('');
  }, [platform]);

  const handleSearch = useCallback(
    async (platformOverride = platform, usernameOverride = username) => {
      const handle = usernameOverride.trim();
      if (!handle || loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError('');
      try {
        const data = await RatingService.getRating(platformOverride, handle);
        saveUsername(platformOverride, handle);
        const next = { rating: data.curRating, maxRating: data.maxRating, name: data.name };
        setResult(next);
        setFetchedAt(saveResult(platformOverride, next));
      } catch (caught) {
        setError(
          locale === 'en-US'
            ? t('rating.queryFailed')
            : caught instanceof Error
              ? caught.message
              : t('rating.queryFailed'),
        );
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [locale, platform, t, username],
  );
  const autoRefreshEnabled = useModuleAutoRefresh('rating', () => {
    void handleSearch();
  });

  useEffect(() => {
    if (!autoRefreshEnabled) return;
    if (autoQueryStarted.current) return;
    autoQueryStarted.current = true;
    if (initialUsername.current.trim()) {
      void handleSearch(initialPlatform.current, initialUsername.current);
    }
  }, [autoRefreshEnabled, handleSearch]);

  const ratingProgress = useMemo(
    () => (result ? Math.min(100, Math.max(3, (result.rating / 3000) * 100)) : 0),
    [result],
  );

  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader title={t('rating.title')} />
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-2xl">
          <section className="rounded-[var(--radius-xl)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)]">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
              <Trophy size={17} />
              {t('rating.subtitle')}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={platform}
                onChange={event => setPlatform(event.target.value as RatingPlatform)}
                className="h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
                aria-label={t('rating.selectPlatform')}
              >
                {PLATFORMS.map(item => (
                  <option key={item} value={item}>
                    {getPlatformLabel(item, locale)}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={username}
                onChange={event => {
                  const next = event.target.value;
                  setUsername(next);
                  saveUsername(platform, next);
                  setError('');
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter') void handleSearch();
                }}
                placeholder={t('rating.usernamePlaceholder')}
                className="h-10 min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-weak)]"
              />
              <Button
                className="h-10 gap-2"
                onClick={() => void handleSearch()}
                disabled={loading || !username.trim()}
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Search size={16} />
                )}
                {t('common.query')}
              </Button>
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">{t('rating.note')}</p>
          </section>

          {error && (
            <div className="mt-4 rounded-[var(--radius-lg)] border border-[var(--color-error)] bg-[var(--color-error-weak)] p-4 text-sm text-[var(--color-error)]">
              {error}
            </div>
          )}

          {result && (
            <section className="mt-4 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-[var(--color-text-muted)]">
                    {getPlatformLabel(platform, locale)} · {result.name}
                  </div>
                  {fetchedAt && (
                    <div className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                      {t('dashboard.updated', {
                        time: new Date(fetchedAt).toLocaleTimeString(locale, {
                          hour: '2-digit',
                          minute: '2-digit',
                        }),
                      })}
                    </div>
                  )}
                  <div
                    className="mt-2 text-5xl font-bold tracking-tight"
                    style={{ color: getRatingColor(result.rating) }}
                  >
                    {result.rating}
                  </div>
                  <div className="mt-1 text-sm font-medium text-[var(--color-text)]">
                    {getRatingTierName(result.rating)}
                  </div>
                </div>
                <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] px-4 py-3 text-right">
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {t('rating.maxRating')}
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-[var(--color-text)]">
                    {result.maxRating}
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <div className="mb-1 flex justify-between text-xs text-[var(--color-text-muted)]">
                  <span>0</span>
                  <span>3000+</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${ratingProgress}%`,
                      backgroundColor: getRatingColor(result.rating),
                    }}
                  />
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
