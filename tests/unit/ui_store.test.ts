import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { createMemoryStorage, installDom } from './helpers';
import { useUiStore } from '../../src/stores/ui';

let dom: ReturnType<typeof installDom>;
let storage: Storage;

const defaultFeatures = {
  liveContestUpdates: true,
  showQuickStats: true,
  showContestHistory: true,
  enableKeyboardShortcuts: true,
  enableProblemSearch: true,
  enableExternalTools: true,
  enableCfReport: true,
  confirmExternalLinks: true,
  reduceMotion: false,
};

function setStoreApi(store: Partial<StoreApi>): void {
  Object.defineProperty(window, 'store', {
    configurable: true,
    value: store as StoreApi,
  });
}

function resetUiStore(): void {
  useUiStore.setState({
    themeScheme: 'ocean',
    colorMode: 'auto',
    locale: 'zh-CN',
    effectiveLocale: 'zh-CN',
    surfaceStyle: 'glass',
    appMode: 'simple',
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
    features: defaultFeatures,
    initialized: false,
  });
}

beforeAll(() => {
  dom = installDom();
});

afterAll(() => {
  dom.window.close();
});

beforeEach(() => {
  storage = createMemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  setStoreApi({
    get: async () => undefined,
    set: async () => {},
    getAll: async () => ({}),
  });
  document.head.innerHTML = '<meta name="theme-color" content="#ffffff" />';
  resetUiStore();
});

describe('ui store', () => {
  test('initializes persisted appearance and feature settings', async () => {
    setStoreApi({
      get: async () =>
        ({
          themeScheme: 'violet',
          colorMode: 'dark',
          surfaceStyle: 'clay',
          appMode: 'full',
          autoRefresh: {
            enabled: false,
            intervalMinutes: 30,
            modules: { dashboard: false, rating: true },
          },
          autoCheckUpdates: false,
          sharePoster: { showRating: false, showTopics: false },
          features: { enableCfReport: false, reduceMotion: true },
        }) as unknown,
      set: async () => {},
      getAll: async () => ({}),
    });
    await useUiStore.getState().init();
    const state = useUiStore.getState();
    expect(state.themeScheme).toBe('ember');
    expect(state.colorMode).toBe('dark');
    expect(state.surfaceStyle).toBe('clay');
    expect(state.appMode).toBe('full');
    expect(state.autoRefresh).toMatchObject({
      enabled: false,
      intervalMinutes: 30,
      modules: { dashboard: false, solved: true },
    });
    expect(state.autoCheckUpdates).toBe(false);
    expect(state.sharePoster).toMatchObject({ showRating: false, showTopics: false });
    expect(state.features.enableCfReport).toBe(false);
    expect(state.features.reduceMotion).toBe(true);
    expect(state.initialized).toBe(true);
    expect(document.documentElement.dataset.scheme).toBe('ember');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.dataset.mode).toBe('full');
    expect(document.documentElement.dataset.surface).toBe('clay');
  });

  test('persists and applies color mode', async () => {
    const writes: unknown[] = [];
    setStoreApi({
      get: async () => undefined,
      set: async (key, value) => {
        writes.push([key, value]);
      },
      getAll: async () => ({}),
    });
    await useUiStore.getState().setColorMode('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('color_mode')).toBe('dark');
    expect(writes).toContainEqual(['ui.colorMode', 'dark']);
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
      '#101820',
    );
  });

  test('persists locale and applies it to the document', async () => {
    const writes: unknown[] = [];
    setStoreApi({
      get: async () => undefined,
      set: async (key, value) => {
        writes.push([key, value]);
      },
      getAll: async () => ({}),
    });
    await useUiStore.getState().setLocale('en-US');
    expect(document.documentElement.lang).toBe('en-US');
    expect(localStorage.getItem('locale')).toBe('en-US');
    expect(writes).toContainEqual(['ui.locale', 'en-US']);
  });

  test('resolves and persists system locale preference', async () => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'en-US' });
    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      value: ['en-US'],
    });
    const writes: unknown[] = [];
    setStoreApi({
      get: async () => undefined,
      set: async (key, value) => {
        writes.push([key, value]);
      },
      getAll: async () => ({}),
    });
    await useUiStore.getState().setLocale('system');
    expect(useUiStore.getState().locale).toBe('system');
    expect(useUiStore.getState().effectiveLocale).toBe('en-US');
    expect(document.documentElement.lang).toBe('en-US');
    expect(document.documentElement.dataset.locale).toBe('system');
    expect(writes).toContainEqual(['ui.locale', 'system']);
  });

  test('persists app mode and theme scheme', async () => {
    const writes: unknown[] = [];
    setStoreApi({
      get: async () => undefined,
      set: async (key, value) => {
        writes.push([key, value]);
      },
      getAll: async () => ({}),
    });
    await useUiStore.getState().setAppMode('full');
    await useUiStore.getState().setThemeScheme('ember');
    await useUiStore.getState().setSurfaceStyle('cloud');
    expect(document.documentElement.dataset.mode).toBe('full');
    expect(document.documentElement.dataset.scheme).toBe('ember');
    expect(localStorage.getItem('app_mode')).toBe('full');
    expect(localStorage.getItem('theme_scheme')).toBe('ember');
    expect(localStorage.getItem('surface_style')).toBe('cloud');
    expect(document.documentElement.dataset.surface).toBe('cloud');
    expect(writes).toContainEqual(['ui.appMode', 'full']);
    expect(writes).toContainEqual(['ui.themeScheme', 'ember']);
    expect(writes).toContainEqual(['ui.surfaceStyle', 'cloud']);
  });

  test('updates feature flags and reduced-motion state', async () => {
    const writes: unknown[] = [];
    setStoreApi({
      get: async () => undefined,
      set: async (key, value) => {
        writes.push([key, value]);
      },
      getAll: async () => ({}),
    });
    await useUiStore.getState().setFeature('reduceMotion', true);
    await useUiStore.getState().setFeature('enableProblemSearch', false);
    expect(useUiStore.getState().features.reduceMotion).toBe(true);
    expect(useUiStore.getState().features.enableProblemSearch).toBe(false);
    expect(document.documentElement.dataset.reduceMotion).toBe('true');
    expect(JSON.parse(localStorage.getItem('feature_flags') ?? '{}')).toMatchObject({
      reduceMotion: true,
      enableProblemSearch: false,
    });
    expect(writes.some(item => Array.isArray(item) && item[0] === 'ui.features')).toBe(true);
  });

  test('persists automatic refresh, update and poster preferences', async () => {
    const writes: Array<[string, unknown]> = [];
    setStoreApi({
      get: async () => undefined,
      set: async (key, value) => {
        writes.push([key, value]);
      },
      getAll: async () => ({}),
    });
    await useUiStore.getState().setAutoRefreshEnabled(false);
    await useUiStore.getState().setAutoRefreshInterval(30);
    await useUiStore.getState().setAutoRefreshModule('dashboard', false);
    await useUiStore.getState().setAutoCheckUpdates(false);
    await useUiStore.getState().setSharePosterSection('showTopics', false);

    expect(useUiStore.getState().autoRefresh).toMatchObject({
      enabled: false,
      intervalMinutes: 30,
      modules: { dashboard: false },
    });
    expect(useUiStore.getState().autoCheckUpdates).toBe(false);
    expect(useUiStore.getState().sharePoster.showTopics).toBe(false);
    expect(localStorage.getItem('auto_refresh_settings')).toContain('"intervalMinutes":30');
    expect(localStorage.getItem('auto_check_updates')).toBe('false');
    expect(localStorage.getItem('share_poster_settings')).toContain('"showTopics":false');
    expect(writes.some(([key]) => key === 'ui.autoRefresh')).toBe(true);
    expect(writes).toContainEqual(['ui.autoCheckUpdates', false]);
    expect(writes.some(([key]) => key === 'ui.sharePoster')).toBe(true);
  });

  test('keeps defaults when persistence fails', async () => {
    setStoreApi({
      get: async () => {
        throw new Error('store unavailable');
      },
      set: async () => {
        throw new Error('write failed');
      },
      getAll: async () => ({}),
    });
    await expect(useUiStore.getState().init()).resolves.toBeUndefined();
    await expect(useUiStore.getState().setThemeScheme('ember')).resolves.toBeUndefined();
    expect(useUiStore.getState().themeScheme).toBe('ember');
  });
});
