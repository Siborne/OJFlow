export interface UserConfig {
  /** UI preferences */
  ui: {
    themeScheme: 'ocean' | 'violet';
    colorMode: 'auto' | 'light' | 'dark';
    locale: 'zh-CN' | 'en-US';
  };

  /** Contest settings */
  contest: {
    maxCrawlDays: number;
    hideDate: boolean;
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

  /** Internal: migration flag */
  _migrated?: boolean;
}
