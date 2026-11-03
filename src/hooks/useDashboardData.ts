import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CodeforcesReport } from '../../shared/types';
import { RatingService } from '@/services/rating';
import { ReportService } from '@/services/report';
import { SolvedNumService } from '@/services/solved';
import { useModuleAutoRefresh } from '@/hooks/useAutoRefresh';

const RATING_PLATFORMS = ['Codeforces', 'AtCoder', '力扣', '洛谷', '牛客'] as const;
const SOLVED_PLATFORMS = [
  'Codeforces',
  'AtCoder',
  '力扣',
  '洛谷',
  '牛客',
  'VJudge',
  'HDU',
  'POJ',
  '蓝桥云课',
  'QOJ',
] as const;

export interface DashboardRating {
  platform: string;
  name: string;
  rating: number;
  maxRating: number;
}

export interface DashboardSolved {
  platform: string;
  solved: number;
}

export interface DashboardData {
  ratings: DashboardRating[];
  solved: DashboardSolved[];
  report: CodeforcesReport | null;
  totalSolved: number;
  loading: boolean;
  updatedAt: number | null;
  refresh: () => void;
}

function readSolvedUsernames(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem('solved_usernames') ?? '{}');
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

function splitUsers(value: string): string[] {
  return value
    .split(';')
    .map(item => item.trim())
    .filter(Boolean);
}

function readRatingUsername(platform: string): string {
  try {
    return localStorage.getItem(`rating_username_${platform}`) ?? '';
  } catch {
    return '';
  }
}

export function useDashboardData(): DashboardData {
  const [ratings, setRatings] = useState<DashboardRating[]>([]);
  const [solved, setSolved] = useState<DashboardSolved[]>([]);
  const [report, setReport] = useState<CodeforcesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(key => key + 1), []);
  const autoRefreshEnabled = useModuleAutoRefresh('dashboard', refresh);

  useEffect(() => {
    if (refreshKey === 0 && !autoRefreshEnabled) {
      setLoading(false);
      return;
    }
    let active = true;
    const solvedUsers = readSolvedUsernames();

    const load = async () => {
      setLoading(true);
      const ratingTasks = RATING_PLATFORMS.flatMap(platform => {
        const username = readRatingUsername(platform);
        if (!username) return [];
        return [
          RatingService.getRating(platform, username)
            .then(result => ({
              platform,
              name: result.name,
              rating: result.curRating,
              maxRating: result.maxRating,
            }))
            .catch(() => null),
        ];
      });

      const solvedTasks = SOLVED_PLATFORMS.flatMap(platform => {
        const users = splitUsers(solvedUsers[platform] ?? '');
        if (users.length === 0) return [];
        return [
          Promise.all(users.map(username => SolvedNumService.getSolvedNum(platform, username)))
            .then(results => ({
              platform,
              solved: results.reduce((sum, item) => sum + Math.max(0, item.solvedNum), 0),
            }))
            .catch(() => null),
        ];
      });

      const cfHandle =
        readRatingUsername('Codeforces') || splitUsers(solvedUsers.Codeforces ?? '')[0] || '';
      const reportTask = cfHandle
        ? ReportService.getCodeforcesReport(cfHandle).catch(() => null)
        : Promise.resolve(null);

      const [ratingResults, solvedResults, reportResult] = await Promise.all([
        Promise.all(ratingTasks),
        Promise.all(solvedTasks),
        reportTask,
      ]);

      if (!active) return;
      const loadedRatings: DashboardRating[] = [];
      for (const item of ratingResults) {
        if (item) loadedRatings.push(item);
      }
      loadedRatings.sort((a, b) => b.rating - a.rating);

      const loadedSolved: DashboardSolved[] = [];
      for (const item of solvedResults) {
        if (item) loadedSolved.push(item);
      }
      loadedSolved.sort((a, b) => b.solved - a.solved);

      setRatings(loadedRatings);
      setSolved(loadedSolved);
      setReport(reportResult);
      setUpdatedAt(Date.now());
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [autoRefreshEnabled, refreshKey]);

  const totalSolved = useMemo(() => solved.reduce((sum, item) => sum + item.solved, 0), [solved]);

  return { ratings, solved, report, totalSolved, loading, updatedAt, refresh };
}
