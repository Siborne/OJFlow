import Store from 'electron-store';
import * as os from 'node:os';
import * as path from 'node:path';
import type { UserConfig } from '../shared/store-schema';

const defaults: UserConfig = {
  ui: {
    themeScheme: 'ocean',
    colorMode: 'auto',
    locale: 'zh-CN',
    surfaceStyle: 'glass',
    startAtLogin: false,
    closeBehavior: 'tray',
    appMode: 'simple',
    autoRefresh: {
      enabled: true,
      intervalMinutes: 15,
      modules: {
        dashboard: true,
        rating: true,
        solved: true,
        report: true,
      },
    },
    autoCheckUpdates: true,
    sharePoster: {
      showRating: true,
      showPlatforms: true,
      showTopics: true,
      showSchedule: true,
    },
    features: {
      liveContestUpdates: true,
      showQuickStats: true,
      showContestHistory: true,
      enableKeyboardShortcuts: true,
      enableProblemSearch: true,
      enableExternalTools: true,
      enableCfReport: true,
      confirmExternalLinks: true,
      reduceMotion: false,
    },
  },
  contest: {
    maxCrawlDays: 7,
    hideDate: false,
    showEmptyDay: false,
    selectedPlatforms: {
      Codeforces: true,
      AtCoder: true,
      '\u6d1b\u8c37': true,
      '\u84dd\u6865\u4e91\u8bfe': true,
      '\u529b\u6263': true,
      '\u725b\u5ba2': true,
    },
  },
  favorites: [],
  usernames: {},
  cache: {},
  notification: {
    enabled: false,
    reminderMinutes: 15,
  },
  schedule: [],
  practice: {
    problems: [],
  },
};

const testConfigCwd =
  process.env.NODE_ENV === 'test'
    ? path.join(os.tmpdir(), `ojflow-config-${process.pid}`)
    : undefined;

export const store = new Store<UserConfig>({
  name: 'ojflow-config',
  defaults,
  ...(testConfigCwd ? { cwd: testConfigCwd } : {}),
});
