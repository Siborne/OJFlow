import appConfig from '../electron/app.config.json';

type Locale = 'zh-CN' | 'en-US';

const LOCALE_KEY = 'locale';
const DEFAULT_LOCALE = (appConfig?.i18n?.defaultLocale ?? 'zh-CN') as Locale;

const messages = {
  'zh-CN': {
    'tooltip.filter': '筛选平台',
    'tooltip.refresh': '刷新数据',
    'tooltip.sort': '切换排序',
    'tooltip.search': '搜索收藏',
    'tooltip.batch': '批量管理',
    'tooltip.hideDate': '隐藏日期',
    'settings.retentionPeriod': '回溯周期',
    'settings.retentionPeriodDesc': '1-30 天，修改后立即刷新',
  },
  'en-US': {
    'tooltip.filter': 'Filter',
    'tooltip.refresh': 'Refresh',
    'tooltip.sort': 'Toggle sort',
    'tooltip.search': 'Search',
    'tooltip.batch': 'Batch mode',
    'tooltip.hideDate': 'Hide dates',
    'settings.retentionPeriod': 'Retention Period',
    'settings.retentionPeriodDesc': '1-30 days, applies immediately',
  },
} satisfies Record<Locale, Record<string, string>>;

export function getLocale(): Locale {
  const raw = localStorage.getItem(LOCALE_KEY);
  if (raw === 'zh-CN' || raw === 'en-US') return raw;
  return DEFAULT_LOCALE;
}

export function setLocale(locale: Locale) {
  localStorage.setItem(LOCALE_KEY, locale);
}

export function t(key: string, locale: Locale = getLocale()) {
  const dict = messages[locale] || messages[DEFAULT_LOCALE];
  const d = dict as Record<string, string>;
  const fallback = messages[DEFAULT_LOCALE] as Record<string, string>;
  return d[key] ?? fallback[key] ?? key;
}
