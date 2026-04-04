import type { RawContest, Rating, SolvedNum } from '../../../shared/types';

/** Per-platform fetch result with metadata */
export interface FetchResult<T> {
  success: boolean;
  data: T;
  platform: string;
  /** Milliseconds elapsed */
  elapsed: number;
  /** Error message on failure */
  error?: string;
  /** Error classification for UI display */
  errorType?: 'timeout' | 'network' | 'parse' | 'api' | 'unknown';
}

/** Platform adapter interface — each OJ platform implements this */
export interface PlatformAdapter {
  /** Unique platform identifier */
  readonly id: string;
  /** Display name (may include CJK characters) */
  readonly displayName: string;

  /** Fetch upcoming contests within N days */
  fetchContests?(days: number): Promise<RawContest[]>;
  /** Query user rating */
  fetchRating?(handle: string): Promise<Rating>;
  /** Query solved problem count */
  fetchSolvedCount?(handle: string): Promise<SolvedNum>;
  /** Health check: verify platform API reachability */
  healthCheck?(): Promise<boolean>;
}

/** Aggregated result from all platform adapters */
export interface AggregateResult<T> {
  data: T[];
  /** Per-platform status reports */
  platformStatus: FetchResult<T[]>[];
  /** Total wall-clock time in milliseconds */
  totalElapsed: number;
}
