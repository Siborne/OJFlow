import { defineStore } from 'pinia';
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

export const useUiStore = defineStore('ui', {
  state: () => ({
    themeScheme: (appConfig?.theme?.defaultScheme ?? 'ocean') as ThemeScheme,
    colorMode: (appConfig?.theme?.defaultMode ?? 'auto') as ColorMode,
    initialized: false,
  }),
  actions: {
    async init() {
      if (this.initialized) return;

      try {
        const eStore = getElectronStore();
        if (eStore) {
          const ui = (await eStore.get('ui')) as
            | { themeScheme?: string; colorMode?: string }
            | undefined;
          if (ui) {
            if (isThemeScheme(ui.themeScheme)) this.themeScheme = ui.themeScheme;
            if (isColorMode(ui.colorMode)) this.colorMode = ui.colorMode;
          }
        } else {
          // Fallback to localStorage for non-Electron environments
          const rawScheme = localStorage.getItem('theme_scheme');
          const rawMode = localStorage.getItem('color_mode');
          if (isThemeScheme(rawScheme)) this.themeScheme = rawScheme;
          if (isColorMode(rawMode)) this.colorMode = rawMode;
        }
      } catch {
        // Keep defaults on error
      }

      this.initialized = true;
      this.applyToDom();
    },
    applyToDom() {
      const el = typeof document !== 'undefined' ? document.documentElement : undefined;
      if (!el) return;
      el.dataset.scheme = this.themeScheme;
      el.dataset.theme = this.colorMode;
      delete el.dataset.mode;
    },
    async setThemeScheme(scheme: ThemeScheme) {
      this.themeScheme = scheme;
      this.applyToDom();
      try {
        const eStore = getElectronStore();
        if (eStore) {
          await eStore.set('ui.themeScheme', scheme);
        }
      } catch {
        // Ignore persistence errors
      }
      try {
        localStorage.setItem('theme_scheme', scheme);
      } catch {
        // Ignore
      }
    },
    async setColorMode(mode: ColorMode) {
      this.colorMode = mode;
      this.applyToDom();
      try {
        const eStore = getElectronStore();
        if (eStore) {
          await eStore.set('ui.colorMode', mode);
        }
      } catch {
        // Ignore persistence errors
      }
      try {
        localStorage.setItem('color_mode', mode);
      } catch {
        // Ignore
      }
    },
  },
});
