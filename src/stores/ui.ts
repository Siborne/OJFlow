import { create } from 'zustand';
import type {
  AppFeatures,
  AppLocale,
  AppMode,
  LocalePreference,
  SurfaceStyle,
  ThemeScheme,
} from '../../shared/types';
import appConfig from '../../electron/app.config.json';

export type ColorMode = 'auto' | 'light' | 'dark';

const DEFAULT_FEATURES: AppFeatures = {
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

const FEATURE_KEYS = Object.keys(DEFAULT_FEATURES) as (keyof AppFeatures)[];

function isThemeScheme(value: unknown): value is ThemeScheme {
  return (
    value === 'ocean' ||
    value === 'ember' ||
    value === 'forest' ||
    value === 'berry' ||
    value === 'sky' ||
    value === 'sand' ||
    value === 'ink'
  );
}

function isColorMode(value: unknown): value is ColorMode {
  return value === 'auto' || value === 'light' || value === 'dark';
}

function isAppMode(value: unknown): value is AppMode {
  return value === 'simple' || value === 'full';
}

function isSurfaceStyle(value: unknown): value is SurfaceStyle {
  return value === 'glass' || value === 'flat' || value === 'cloud' || value === 'clay';
}

function isLocale(value: unknown): value is AppLocale {
  return value === 'zh-CN' || value === 'en-US';
}

function isLocalePreference(value: unknown): value is LocalePreference {
  return value === 'system' || isLocale(value);
}

export function getSystemLocale(): AppLocale {
  if (typeof navigator === 'undefined') return 'zh-CN';
  const language = navigator.languages?.[0] ?? navigator.language ?? 'zh-CN';
  return language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
}

export function resolveLocale(preference: LocalePreference): AppLocale {
  return preference === 'system' ? getSystemLocale() : preference;
}

function normalizeScheme(value: unknown): ThemeScheme | undefined {
  if (value === 'violet') return 'ember';
  return isThemeScheme(value) ? value : undefined;
}

function normalizeFeatures(value: unknown): Partial<AppFeatures> {
  if (!value || typeof value !== 'object') return {};
  const source = value as Record<string, unknown>;
  return FEATURE_KEYS.reduce<Partial<AppFeatures>>((acc, key) => {
    if (typeof source[key] === 'boolean') {
      acc[key] = source[key] as never;
    }
    return acc;
  }, {});
}

function readLocalStorage(): Partial<UiState> {
  if (typeof localStorage === 'undefined') return {};
  const patch: Partial<UiState> = {};
  try {
    const scheme = normalizeScheme(localStorage.getItem('theme_scheme'));
    const mode = localStorage.getItem('color_mode');
    const locale = localStorage.getItem('locale');
    const surfaceStyle = localStorage.getItem('surface_style');
    const appMode = localStorage.getItem('app_mode');
    const rawFeatures = localStorage.getItem('feature_flags');

    if (scheme) patch.themeScheme = scheme;
    if (isColorMode(mode)) patch.colorMode = mode;
    if (isLocalePreference(locale)) patch.locale = locale;
    if (isSurfaceStyle(surfaceStyle)) patch.surfaceStyle = surfaceStyle;
    if (isAppMode(appMode)) patch.appMode = appMode;
    if (rawFeatures) {
      patch.features = {
        ...DEFAULT_FEATURES,
        ...normalizeFeatures(JSON.parse(rawFeatures)),
      };
    }
  } catch {
    // Invalid local preferences fall back to defaults.
  }
  return patch;
}

function getElectronStore(): StoreApi | undefined {
  return typeof window !== 'undefined' ? window.store : undefined;
}

interface UiState {
  themeScheme: ThemeScheme;
  colorMode: ColorMode;
  locale: LocalePreference;
  effectiveLocale: AppLocale;
  surfaceStyle: SurfaceStyle;
  appMode: AppMode;
  features: AppFeatures;
  initialized: boolean;
  init: () => Promise<void>;
  applyToDom: () => void;
  setThemeScheme: (scheme: ThemeScheme) => Promise<void>;
  setColorMode: (mode: ColorMode) => Promise<void>;
  setLocale: (locale: LocalePreference) => Promise<void>;
  setSurfaceStyle: (style: SurfaceStyle) => Promise<void>;
  setAppMode: (mode: AppMode) => Promise<void>;
  setFeature: (key: keyof AppFeatures, enabled: boolean) => Promise<void>;
}

const localDefaults = readLocalStorage();

export const useUiStore = create<UiState>((set, get) => ({
  themeScheme:
    normalizeScheme(appConfig?.theme?.defaultScheme) ?? localDefaults.themeScheme ?? 'ocean',
  colorMode: localDefaults.colorMode ?? 'auto',
  locale:
    localDefaults.locale ??
    (isLocalePreference(appConfig?.i18n?.defaultLocale) ? appConfig.i18n.defaultLocale : 'zh-CN'),
  effectiveLocale: resolveLocale(
    localDefaults.locale ??
      (isLocalePreference(appConfig?.i18n?.defaultLocale) ? appConfig.i18n.defaultLocale : 'zh-CN'),
  ),
  surfaceStyle: isSurfaceStyle(localDefaults.surfaceStyle)
    ? localDefaults.surfaceStyle
    : isSurfaceStyle(appConfig?.theme?.defaultSurface)
      ? appConfig.theme.defaultSurface
      : 'glass',
  appMode: localDefaults.appMode ?? 'simple',
  features: { ...DEFAULT_FEATURES, ...localDefaults.features },
  initialized: false,

  init: async () => {
    if (get().initialized) return;

    try {
      const eStore = getElectronStore();
      if (eStore) {
        const ui = (await eStore.get('ui')) as
          | {
              themeScheme?: unknown;
              colorMode?: unknown;
              locale?: unknown;
              surfaceStyle?: unknown;
              appMode?: unknown;
              features?: unknown;
            }
          | undefined;
        if (ui) {
          const patch: Partial<UiState> = {};
          const scheme = normalizeScheme(ui.themeScheme);
          if (scheme) patch.themeScheme = scheme;
          if (isColorMode(ui.colorMode)) patch.colorMode = ui.colorMode;
          if (isLocalePreference(ui.locale)) patch.locale = ui.locale;
          if (isSurfaceStyle(ui.surfaceStyle)) patch.surfaceStyle = ui.surfaceStyle;
          if (isAppMode(ui.appMode)) patch.appMode = ui.appMode;
          const features = normalizeFeatures(ui.features);
          if (Object.keys(features).length > 0) {
            patch.features = { ...get().features, ...features };
          }
          if (Object.keys(patch).length > 0) set(patch);
        }
      }
    } catch {
      // Keep locally cached preferences on failure.
    }

    const locale = get().locale;
    set({ initialized: true, effectiveLocale: resolveLocale(locale) });
    get().applyToDom();
  },

  applyToDom: () => {
    const el = typeof document !== 'undefined' ? document.documentElement : undefined;
    if (!el) return;
    const { themeScheme, colorMode, locale, surfaceStyle, appMode, features } = get();
    const effectiveLocale = resolveLocale(locale);
    el.dataset.scheme = themeScheme;
    el.dataset.theme = colorMode;
    el.dataset.mode = appMode;
    el.dataset.locale = locale;
    el.dataset.surface = surfaceStyle;
    el.lang = effectiveLocale;
    el.dataset.reduceMotion = features.reduceMotion ? 'true' : 'false';
    delete el.dataset.displayMode;

    const themeColor = colorMode === 'dark' ? '#101820' : '#f2f6f8';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
  },

  setThemeScheme: async (scheme: ThemeScheme) => {
    set({ themeScheme: scheme });
    get().applyToDom();
    try {
      await getElectronStore()?.set('ui.themeScheme', scheme);
    } catch {
      // Keep the active scheme even if persistence is temporarily unavailable.
    }
    try {
      localStorage.setItem('theme_scheme', scheme);
    } catch {
      // Ignore storage quota errors.
    }
  },

  setColorMode: async (mode: ColorMode) => {
    set({ colorMode: mode });
    get().applyToDom();
    try {
      await getElectronStore()?.set('ui.colorMode', mode);
    } catch {
      // Keep the active mode even if persistence is temporarily unavailable.
    }
    try {
      localStorage.setItem('color_mode', mode);
    } catch {
      // Ignore storage quota errors.
    }
  },

  setLocale: async (locale: LocalePreference) => {
    set({ locale, effectiveLocale: resolveLocale(locale) });
    get().applyToDom();
    try {
      await getElectronStore()?.set('ui.locale', locale);
    } catch {
      // Keep the active locale even if persistence is temporarily unavailable.
    }
    try {
      localStorage.setItem('locale', locale);
    } catch {
      // Ignore storage quota errors.
    }
  },

  setSurfaceStyle: async (style: SurfaceStyle) => {
    set({ surfaceStyle: style });
    get().applyToDom();
    try {
      await getElectronStore()?.set('ui.surfaceStyle', style);
    } catch {
      // Keep the active surface even if persistence is temporarily unavailable.
    }
    try {
      localStorage.setItem('surface_style', style);
    } catch {
      // Ignore storage quota errors.
    }
  },

  setAppMode: async (mode: AppMode) => {
    set({ appMode: mode });
    get().applyToDom();
    try {
      await getElectronStore()?.set('ui.appMode', mode);
    } catch {
      // Ignore persistence errors.
    }
    try {
      localStorage.setItem('app_mode', mode);
    } catch {
      // Ignore storage quota errors.
    }
  },

  setFeature: async (key: keyof AppFeatures, enabled: boolean) => {
    const features = { ...get().features, [key]: enabled };
    set({ features });
    get().applyToDom();
    try {
      await getElectronStore()?.set('ui.features', features);
    } catch {
      // Ignore persistence errors.
    }
    try {
      localStorage.setItem('feature_flags', JSON.stringify(features));
    } catch {
      // Ignore storage quota errors.
    }
  },
}));
