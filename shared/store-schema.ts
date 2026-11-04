import type {
  AppFeatures,
  AppMode,
  AutoRefreshSettings,
  CodeTemplate,
  DashboardScheduleScope,
  LocalePreference,
  PracticeProblem,
  ScheduleItem,
  SharePosterSettings,
  SurfaceStyle,
  ThemeScheme,
  TemplateExportOptions,
  ShortcutSettings,
  WindowCloseBehavior,
} from './types';

export interface UserConfig {
  /** UI preferences */
  ui: {
    themeScheme: ThemeScheme;
    colorMode: 'auto' | 'light' | 'dark';
    locale: LocalePreference;
    surfaceStyle: SurfaceStyle;
    startAtLogin: boolean;
    closeBehavior: WindowCloseBehavior;
    appMode: AppMode;
    dashboardScheduleScope: DashboardScheduleScope;
    shortcut: ShortcutSettings;
    templatesExpanded: boolean;
    autoRefresh: AutoRefreshSettings;
    autoCheckUpdates: boolean;
    sharePoster: SharePosterSettings;
    features: AppFeatures;
  };

  /** Contest settings */
  contest: {
    maxCrawlDays: number;
    hideDate: boolean;
    showEmptyDay: boolean;
    selectedPlatforms: Record<string, boolean>;
  };

  /** Favorites */
  favorites: Array<{
    name: string;
    platform: string;
    link?: string;
    startTime?: string;
    startTimeSeconds?: number;
    durationSeconds?: number;
    addedAt: number;
  }>;

  /** Usernames per platform */
  usernames: Record<string, string>;

  /** Cache for offline fallback */
  cache: {
    contests?: {
      data: unknown[];
      fetchedAt: number;
    };
    ratings?: Record<
      string,
      {
        data: unknown;
        fetchedAt: number;
      }
    >;
    solvedNums?: Record<
      string,
      {
        data: unknown;
        fetchedAt: number;
      }
    >;
  };

  /** Notification settings */
  notification: {
    enabled: boolean;
    reminderMinutes: number;
  };

  /** User-created dashboard schedule */
  schedule: ScheduleItem[];

  /** Problems imported from Competitive Companion */
  practice: {
    problems: PracticeProblem[];
  };

  /** Reusable competitive-programming code templates */
  templates: CodeTemplate[];
  templateExport: TemplateExportOptions;

  /** Internal: migration flag */
  _migrated?: boolean;
}
