import { useContestStore } from '../../src/stores/contest';
import { useUiStore } from '../../src/stores/ui';
import { useScheduleStore } from '../../src/stores/schedule';
import { useTemplateStore } from '../../src/stores/templates';

export function installWindowApi(overrides: Partial<ElectronApi> = {}): ElectronApi {
  const api: ElectronApi = {
    getRecentContests: async () => ({
      contests: [],
      platformStatus: [],
      totalElapsed: 0,
      fromCache: false,
      cachedAt: null,
    }),
    getRating: async () => ({ name: 'user', curRating: 1500, maxRating: 1800 }),
    getSolvedNum: async () => ({ name: 'user', solvedNum: 100 }),
    openUrl: async () => {},
    installUpdate: async () => true,
    onContestsPartial: () => () => {},
    onRefreshContestsRequested: () => () => {},
    searchProblems: async () => ({
      problems: [],
      total: 0,
      page: 1,
      pageSize: 60,
      sources: [
        { platform: 'Codeforces', success: true, count: 0 },
        { platform: 'AtCoder', success: true, count: 0 },
        { platform: '力扣', success: true, count: 0 },
        { platform: '洛谷', success: true, count: 0 },
        { platform: '牛客', success: true, count: 0 },
        { platform: 'QOJ', success: true, count: 0 },
      ],
    }),
    getCodeforcesReport: async handle => ({
      handle,
      totalSolved: 0,
      ratingStats: [],
      tagStats: [],
    }),
    listPracticeProblems: async () => [],
    createPracticeProblem: async () => null,
    updatePracticeProblem: async () => null,
    deletePracticeProblem: async () => false,
    getCompanionStatus: async () => ({ running: true, port: 10043 }),
    onPracticeImported: () => () => {},
    onNavigateTo: () => () => {},
    copyText: async () => {},
    clearCache: async () => {},
    minimizeWindow: async () => {},
    toggleMaximizeWindow: async () => {},
    closeWindow: async () => {},
    getWindowState: async () => ({ maximized: false }),
    onWindowStateChanged: () => () => {},
    getAutoLaunch: async () => false,
    setAutoLaunch: async () => {},
    setShortcutSettings: async () => ({ success: true }),
    exportTemplateMarkdown: async () => true,
    setNotification: async () => {},
    getNotification: async () => ({ enabled: false, reminderMinutes: 15 }),
    ...overrides,
  };
  Object.defineProperty(window, 'api', { configurable: true, value: api });
  return api;
}

export function installWindowStore(overrides: Partial<StoreApi> = {}): StoreApi {
  const store: StoreApi = {
    get: async () => undefined,
    set: async () => {},
    getAll: async () => ({}),
    ...overrides,
  };
  Object.defineProperty(window, 'store', { configurable: true, value: store });
  return store;
}

export function resetFrontendStores(): void {
  useContestStore.setState({
    contests: [],
    loading: false,
    day: 7,
    showEmptyDay: false,
    selectedPlatforms: {
      Codeforces: true,
      AtCoder: true,
      洛谷: true,
      蓝桥云课: true,
      力扣: true,
      牛客: true,
    },
    favorites: [],
    hideDate: false,
    initialized: true,
    platformStatus: [],
    fromCache: false,
    cachedAt: null,
    totalElapsed: 0,
    error: null,
    lastUpdatedAt: null,
  });
  useUiStore.setState({
    themeScheme: 'ocean',
    colorMode: 'light',
    locale: 'zh-CN',
    effectiveLocale: 'zh-CN',
    surfaceStyle: 'glass',
    appMode: 'full',
    dashboardScheduleScope: 'today',
    autoRefresh: {
      enabled: true,
      intervalMinutes: 15,
      modules: { dashboard: true, rating: true, solved: true, report: true },
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
    initialized: true,
  });
  useScheduleStore.setState({
    items: [],
    initialized: true,
  });
  useTemplateStore.setState({
    items: [],
    initialized: true,
  });
}
