import { create } from 'zustand';
import appConfig from '../../electron/app.config.json';

type ThemeScheme = 'ocean' | 'violet';
type ColorMode = 'auto' | 'light' | 'dark';

function isThemeScheme(value: unknown): value is ThemeScheme {
  return value === 'ocean' || value === 'violet';
}

function isColorMode(value: unknown): value is ColorMode {
  return value === 'auto' || value === 'light' || value === 'dark';
}

function getElectronStore(): StoreApi | undefined {
  return typeof window !== 'undefined' ? window.store : undefined;
}

interface UiState {
  themeScheme: ThemeScheme;
  colorMode: ColorMode;
  initialized: boolean;
  init: () => Promise<void>;
  applyToDom: () => void;
  setThemeScheme: (scheme: ThemeScheme) => Promise<void>;
  setColorMode: (mode: ColorMode) => Promise<void>;
}

export const useUiStore = create<UiState>((set, get) => ({
  themeScheme: (appConfig?.theme?.defaultScheme ?? 'ocean') as ThemeScheme,
  colorMode: (appConfig?.theme?.defaultMode ?? 'auto') as ColorMode,
  initialized: false,

  init: async () => {
    if (get().initialized) return;

    try {
      const eStore = getElectronStore();
      if (eStore) {
        const ui = (await eStore.get('ui')) as
          | { themeScheme?: string; colorMode?: string }
          | undefined;
        if (ui) {
          const patch: Partial<UiState> = {};
          if (isThemeScheme(ui.themeScheme)) patch.themeScheme = ui.themeScheme;
          if (isColorMode(ui.colorMode)) patch.colorMode = ui.colorMode;
          if (Object.keys(patch).length > 0) set(patch);
        }
      } else {
        const rawScheme = localStorage.getItem('theme_scheme');
        const rawMode = localStorage.getItem('color_mode');
        const patch: Partial<UiState> = {};
        if (isThemeScheme(rawScheme)) patch.themeScheme = rawScheme;
        if (isColorMode(rawMode)) patch.colorMode = rawMode;
        if (Object.keys(patch).length > 0) set(patch);
      }
    } catch {
      // Keep defaults on error
    }

    set({ initialized: true });
    get().applyToDom();
  },

  applyToDom: () => {
    const el = typeof document !== 'undefined' ? document.documentElement : undefined;
    if (!el) return;
    const { themeScheme, colorMode } = get();
    el.dataset.scheme = themeScheme;
    el.dataset.theme = colorMode;
    delete el.dataset.mode;
  },

  setThemeScheme: async (scheme: ThemeScheme) => {
    set({ themeScheme: scheme });
    get().applyToDom();
    try {
      const eStore = getElectronStore();
      if (eStore) await eStore.set('ui.themeScheme', scheme);
    } catch {
      // Ignore persistence errors
    }
    try {
      localStorage.setItem('theme_scheme', scheme);
    } catch {
      // Ignore
    }
  },

  setColorMode: async (mode: ColorMode) => {
    set({ colorMode: mode });
    get().applyToDom();
    try {
      const eStore = getElectronStore();
      if (eStore) await eStore.set('ui.colorMode', mode);
    } catch {
      // Ignore persistence errors
    }
    try {
      localStorage.setItem('color_mode', mode);
    } catch {
      // Ignore
    }
  },
}));
