/** Raw contest data from Electron main process (unformatted) */
export interface RawContest {
  name: string;
  startTime: number; // Unix timestamp (seconds)
  duration: number; // seconds
  platform: string;
  link?: string;
}

/** Streaming contest payload emitted by the main process. */
export interface ContestsPartialPayload {
  day: number;
  platform: string;
  contests: RawContest[];
}

/** Formatted contest data used by renderer process */
export interface Contest {
  name: string;
  startTime: string;
  endTime: string;
  duration: string;
  platform: string;
  link?: string;
  startDateTimeDay?: Date;
  startHourMinute: string;
  endHourMinute: string;
  startTimeSeconds: number;
  durationSeconds: number;
  formattedStartTime: string;
  formattedEndTime: string;
  formattedDuration: string;
  /** Whether this contest was manually added by the user */
  isManual?: boolean;
}

export interface Rating {
  name: string;
  curRating: number;
  maxRating: number;
  ranking?: number;
  time?: string;
}

export interface SolvedNum {
  name: string;
  solvedNum: number;
}

/** Supported OJ platform identifiers */
export type ContestPlatform =
  | 'Codeforces'
  | 'AtCoder'
  | '\u6d1b\u8c37'
  | '\u84dd\u6865\u4e91\u8bfe'
  | '\u529b\u6263'
  | '\u725b\u5ba2';

export type RatingPlatform =
  | 'Codeforces'
  | 'AtCoder'
  | '\u529b\u6263'
  | '\u6d1b\u8c37'
  | '\u725b\u5ba2';

export type SolvedPlatform =
  | 'Codeforces'
  | '\u529b\u6263'
  | 'VJudge'
  | '\u6d1b\u8c37'
  | 'AtCoder'
  | 'HDU'
  | 'POJ'
  | '\u725b\u5ba2'
  | 'QOJ';

/** Per-platform fetch status reported by aggregator */
export interface PlatformFetchStatus {
  platform: string;
  success: boolean;
  error?: string;
  errorType?: 'timeout' | 'network' | 'parse' | 'api' | 'unknown';
  elapsed: number;
}

/** Aggregated contest fetch response with platform status metadata */
export interface ContestFetchResponse {
  contests: RawContest[];
  platformStatus: PlatformFetchStatus[];
  totalElapsed: number;
  fromCache: boolean;
  cachedAt: number | null;
}

/** Aggregated rating fetch response */
export interface RatingFetchResponse {
  rating: Rating;
  fromCache: boolean;
  cachedAt: number | null;
}

/** Aggregated solved count fetch response */
export interface SolvedFetchResponse {
  solved: SolvedNum;
  fromCache: boolean;
  cachedAt: number | null;
}

export type ProblemPlatform = 'Codeforces' | 'AtCoder' | '力扣' | '洛谷' | '牛客' | 'QOJ';

/** Searchable problem returned by the main process. */
export interface ProblemSummary {
  id: string;
  platform: ProblemPlatform;
  contestId?: number;
  index: string;
  name: string;
  titleZh?: string;
  difficultyLabel?: string;
  rating?: number;
  tags: string[];
  url: string;
}

export interface ProblemSearchRequest {
  platform?: ProblemPlatform | 'all';
  query?: string;
  tag?: string;
  minRating?: number;
  maxRating?: number;
  page?: number;
  pageSize?: number;
}

export interface ProblemSourceStatus {
  platform: ProblemPlatform;
  success: boolean;
  count: number;
  error?: string;
}

export interface ProblemSearchResult {
  problems: ProblemSummary[];
  total: number;
  page: number;
  pageSize: number;
  sources: ProblemSourceStatus[];
}

export interface ProblemStats {
  rating: number;
  count: number;
}

export interface TagStats {
  tag: string;
  count: number;
}

export interface CodeforcesReport {
  handle: string;
  totalSolved: number;
  ratingStats: ProblemStats[];
  tagStats: TagStats[];
}

export type AppMode = 'simple' | 'full';
export type AppLocale = 'zh-CN' | 'en-US';
export type LocalePreference = AppLocale | 'system';
export type ThemeScheme = 'ocean' | 'ember' | 'forest' | 'berry' | 'sky' | 'sand' | 'ink';
export type SurfaceStyle = 'glass' | 'flat' | 'cloud' | 'clay';
export type WindowCloseBehavior = 'tray' | 'quit';
export type AutoRefreshModule = 'dashboard' | 'rating' | 'solved' | 'report';

export interface AutoRefreshSettings {
  enabled: boolean;
  intervalMinutes: number;
  modules: Record<AutoRefreshModule, boolean>;
}

export interface SharePosterSettings {
  showRating: boolean;
  showPlatforms: boolean;
  showTopics: boolean;
  showSchedule: boolean;
}

export interface ScheduleItem {
  id: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  kind: 'contest' | 'practice' | 'review' | 'custom';
  note?: string;
  completed: boolean;
  createdAt: number;
  contestKey?: string;
  autoCreated?: boolean;
  platform?: string;
  url?: string;
}

export type PracticeStatus = 'inbox' | 'practicing' | 'review' | 'solved';

export interface PracticeSample {
  input: string;
  output: string;
}

export interface PracticeProblem {
  id: string;
  name: string;
  group: string;
  url: string;
  source: string;
  status: PracticeStatus;
  notes: string;
  samples: PracticeSample[];
  timeLimitMs?: number;
  memoryLimitMb?: number;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  solvedAt?: number;
  reviewAt?: number;
}

export interface PracticeProblemUpdate {
  status?: PracticeStatus;
  notes?: string;
  reviewAt?: number | null;
}

export interface CompanionStatus {
  running: boolean;
  port: number | null;
}

export interface AppFeatures {
  liveContestUpdates: boolean;
  showQuickStats: boolean;
  showContestHistory: boolean;
  enableKeyboardShortcuts: boolean;
  enableProblemSearch: boolean;
  enableExternalTools: boolean;
  enableCfReport: boolean;
  confirmExternalLinks: boolean;
  reduceMotion: boolean;
}
