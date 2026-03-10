import { defineStore } from 'pinia';
import appConfig from '../../electron/app.config.json';

type ThemeScheme = 'ocean' | 'violet';
type ColorMode = 'auto' | 'light' | 'dark';

const THEME_SCHEME_KEY = 'theme_scheme';
const COLOR_MODE_KEY = 'color_mode';

function isThemeScheme(value: unknown): value is ThemeScheme {
  return value === 'ocean' || value === 'violet';
}

function isColorMode(value: unknown): value is ColorMode {
  return value === 'auto' || value === 'light' || value === 'dark';
}

export const useUiStore = defineStore('ui', {
  state: () => {
    const rawScheme = localStorage.getItem(THEME_SCHEME_KEY);
    const rawMode = localStorage.getItem(COLOR_MODE_KEY);

    const defaultScheme = (appConfig?.theme?.defaultScheme ?? 'ocean') as ThemeScheme;
    const defaultMode = (appConfig?.theme?.defaultMode ?? 'auto') as ColorMode;

    return {
      themeScheme: isThemeScheme(rawScheme) ? rawScheme : defaultScheme,
      colorMode: isColorMode(rawMode) ? rawMode : defaultMode,
    };
  },
  actions: {
    applyToDom() {
      const el = document.documentElement;
      el.dataset.theme = this.themeScheme;
      el.dataset.mode = this.colorMode;
    },
    setThemeScheme(scheme: ThemeScheme) {
      this.themeScheme = scheme;
      localStorage.setItem(THEME_SCHEME_KEY, scheme);
      this.applyToDom();
    },
    setColorMode(mode: ColorMode) {
      this.colorMode = mode;
      localStorage.setItem(COLOR_MODE_KEY, mode);
      this.applyToDom();
    },
  },
});

