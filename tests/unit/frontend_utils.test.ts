import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { installDom } from './helpers';
import { ContestUtils } from '../../src/utils/contest_utils';
import { getRatingColor, getRatingTier, getRatingTierName } from '../../src/utils/rating-colors';
import {
  getPlatformAbbr,
  getPlatformBrand,
  getPlatformColor,
  platformBrands,
} from '../../src/utils/platform-icons';
import { getLocale, setLocale, t } from '../../src/i18n';
import { migrateFromLocalStorage } from '../../src/utils/migrate-storage';
import { cn } from '../../src/lib/utils';
import { echarts } from '../../src/utils/echarts-setup';

let dom: ReturnType<typeof installDom>;

beforeAll(() => {
  dom = installDom();
});

afterAll(() => {
  dom.window.close();
});

describe('ContestUtils', () => {
  test('creates formatted contest fields', () => {
    const contest = ContestUtils.createContest(
      'Round',
      1_800_000_000,
      5400,
      'Codeforces',
      'https://codeforces.com/contest/1',
    );
    expect(contest.duration).toBe('1 小时 30 分钟');
    expect(contest.durationSeconds).toBe(5400);
    expect(contest.startHourMinute).toMatch(/^\d{2}:\d{2}$/);
    expect(contest.endHourMinute).toMatch(/^\d{2}:\d{2}$/);
    expect(contest.formattedStartTime).toBe(contest.startTime);
    expect(contest.formattedDuration).toBe(contest.duration);
  });

  test('returns relative day labels', () => {
    expect(ContestUtils.getDayName(0).startsWith('今天')).toBe(true);
    expect(ContestUtils.getDayName(1).startsWith('明天')).toBe(true);
    expect(ContestUtils.getDayName(2).startsWith('后天')).toBe(true);
    expect(ContestUtils.getDayName(5)).toMatch(/^周[一二三四五六日]/);
  });
});

describe('rating colors', () => {
  test('maps rating boundaries and CSS variables', () => {
    expect(getRatingTierName(0)).toBe('Newbie');
    expect(getRatingTierName(1199)).toBe('Newbie');
    expect(getRatingTierName(1200)).toBe('Pupil');
    expect(getRatingTierName(1400)).toBe('Specialist');
    expect(getRatingTierName(1600)).toBe('Expert');
    expect(getRatingTierName(1900)).toBe('Candidate Master');
    expect(getRatingTierName(2100)).toBe('Master');
    expect(getRatingTierName(2400)).toBe('Grandmaster');
    expect(getRatingTierName(3000)).toBe('Legendary Grandmaster');
    expect(getRatingTier(9999).name).toBe('Legendary Grandmaster');
    expect(getRatingColor(1500)).toBe('var(--rating-specialist)');
    expect(getRatingColor(2000)).toBe('var(--rating-candidate-master)');
    expect(getRatingTier(-1).name).toBe('Newbie');
  });
});

describe('platform icons', () => {
  test('resolves IDs, display names and fallbacks', () => {
    expect(platformBrands).toHaveLength(6);
    expect(getPlatformBrand('codeforces')?.abbr).toBe('CF');
    expect(getPlatformBrand('洛谷')?.id).toBe('luogu');
    expect(getPlatformColor('AtCoder')).toBe('var(--platform-atcoder)');
    expect(getPlatformColor('missing')).toBe('var(--color-text-muted)');
    expect(getPlatformAbbr('codeforces')).toBe('CF');
    expect(getPlatformAbbr('VJudge')).toBe('VJ');
  });
});

describe('i18n', () => {
  test('uses locale, fallbacks and dictionary keys', () => {
    setLocale('en-US');
    expect(getLocale()).toBe('en-US');
    expect(t('tooltip.refresh')).toBe('Refresh');
    expect(t('tooltip.refresh', 'zh-CN')).toBe('刷新数据');
    expect(t('missing.key' as never)).toBe('missing.key');
  });

  test('falls back to default locale for invalid values', () => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'zh-CN' });
    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      value: ['zh-CN'],
    });
    localStorage.setItem('locale', 'bad-locale');
    expect(getLocale()).toBe('zh-CN');
    expect(t('tooltip.filter')).toBe('筛选平台');
  });

  test('resolves the system language preference', () => {
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'en-US' });
    Object.defineProperty(navigator, 'languages', {
      configurable: true,
      value: ['en-US'],
    });
    setLocale('system');
    expect(getLocale()).toBe('en-US');
    expect(t('nav.dashboard')).toBe('Workbench');
  });
});

describe('cn utility', () => {
  test('merges Tailwind classes and handles conditions', () => {
    const hidden = false;
    expect(cn('p-2', hidden && 'hidden', 'p-4')).toBe('p-4');
  });
});

describe('storage migration', () => {
  test('migrates supported values once', async () => {
    const writes: Array<[string, unknown]> = [];
    const store = {
      get: async (key: string) => (key === '_migrated' ? false : undefined),
      set: async (key: string, value: unknown) => {
        writes.push([key, value]);
      },
      getAll: async () => ({}),
    };
    Object.defineProperty(window, 'store', { configurable: true, value: store });
    localStorage.setItem('theme_scheme', 'ocean');
    localStorage.setItem('color_mode', 'dark');
    localStorage.setItem('locale', 'en-US');
    localStorage.setItem('surface_style', 'cloud');
    localStorage.setItem('max_crawl_days', '12');
    localStorage.setItem('hide_date', '1');
    localStorage.setItem('favourite_contests_list', JSON.stringify([{ name: 'A' }]));
    localStorage.setItem('rating_username_Codeforces', 'tourist');

    await migrateFromLocalStorage();
    expect(writes).toContainEqual(['ui.themeScheme', 'ocean']);
    expect(writes).toContainEqual(['ui.colorMode', 'dark']);
    expect(writes).toContainEqual(['ui.locale', 'en-US']);
    expect(writes).toContainEqual(['ui.surfaceStyle', 'cloud']);
    expect(writes).toContainEqual(['contest.maxCrawlDays', 12]);
    expect(writes).toContainEqual(['contest.hideDate', true]);
    expect(writes).toContainEqual(['favorites', [{ name: 'A' }]]);
    expect(writes).toContainEqual(['usernames', { Codeforces: 'tourist' }]);
    expect(writes).toContainEqual(['_migrated', true]);
  });

  test('skips already migrated and missing stores', async () => {
    Object.defineProperty(window, 'store', {
      configurable: true,
      value: {
        get: async () => true,
        set: async () => {},
        getAll: async () => ({}),
      },
    });
    await migrateFromLocalStorage();

    Object.defineProperty(window, 'store', { configurable: true, value: undefined });
    await expect(migrateFromLocalStorage()).resolves.toBeUndefined();
  });
});

describe('echarts setup', () => {
  test('exports a configured ECharts namespace', () => {
    expect(typeof echarts.init).toBe('function');
    expect(typeof echarts.use).toBe('function');
  });
});
