import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Box,
  CalendarDays,
  Check,
  ChevronRight,
  Cloud,
  Database,
  Info,
  Keyboard,
  Languages,
  Link2,
  MonitorCog,
  Moon,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Square,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ContestService } from '@/services/contest';
import { checkUpdate } from '@/updater/checkUpdate';
import { useContestStore } from '@/stores/contest';
import { useUiStore, type ColorMode } from '@/stores/ui';
import { useI18n, type MessageKey } from '@/i18n';
import { cn } from '@/lib/utils';
import type {
  AppFeatures,
  AppMode,
  LocalePreference,
  SurfaceStyle,
  ThemeScheme,
  WindowCloseBehavior,
} from '../../shared/types';
import packageJson from '../../package.json';

type ToastState = { type: 'success' | 'error' | 'warning'; text: string } | null;

const PERIOD_OPTIONS = [7, 15, 30];

const colorModeKeys: Array<{ value: ColorMode; labelKey: MessageKey; icon: React.ElementType }> = [
  { value: 'auto', labelKey: 'common.system', icon: MonitorCog },
  { value: 'light', labelKey: 'common.light', icon: Sun },
  { value: 'dark', labelKey: 'common.dark', icon: Moon },
];

const schemes: Array<{
  value: ThemeScheme;
  labelKey: MessageKey;
  swatch: string;
}> = [
  { value: 'ocean', labelKey: 'settings.schemeOcean', swatch: '#0e7490' },
  { value: 'ember', labelKey: 'settings.schemeEmber', swatch: '#d05a2d' },
  { value: 'forest', labelKey: 'settings.schemeForest', swatch: '#3f7a42' },
  { value: 'berry', labelKey: 'settings.schemeBerry', swatch: '#b5385d' },
  { value: 'sky', labelKey: 'settings.schemeSky', swatch: '#2563eb' },
  { value: 'sand', labelKey: 'settings.schemeSand', swatch: '#b7791f' },
  { value: 'ink', labelKey: 'settings.schemeInk', swatch: '#475569' },
];

const surfaces: Array<{ value: SurfaceStyle; labelKey: MessageKey; icon: React.ElementType }> = [
  { value: 'glass', labelKey: 'settings.surfaceGlass', icon: Sparkles },
  { value: 'flat', labelKey: 'settings.surfaceFlat', icon: Square },
  { value: 'cloud', labelKey: 'settings.surfaceCloud', icon: Cloud },
  { value: 'clay', labelKey: 'settings.surfaceClay', icon: Box },
];

const settingsSections: Array<{
  id: string;
  labelKey: MessageKey;
  icon: React.ElementType;
}> = [
  { id: 'appearance', labelKey: 'settings.appearance', icon: SlidersHorizontal },
  { id: 'features', labelKey: 'settings.features', icon: Sparkles },
  { id: 'contest', labelKey: 'settings.contestPreferences', icon: CalendarDays },
  { id: 'reminders', labelKey: 'settings.remindersData', icon: Bell },
  { id: 'system', labelKey: 'settings.systemSection', icon: MonitorCog },
  { id: 'about', labelKey: 'settings.about', icon: Info },
];

const featureRows: Array<{
  key: keyof AppFeatures;
  titleKey: MessageKey;
  descKey: MessageKey;
}> = [
  {
    key: 'liveContestUpdates',
    titleKey: 'settings.featureLive',
    descKey: 'settings.featureLiveDesc',
  },
  {
    key: 'showQuickStats',
    titleKey: 'settings.featureQuickStats',
    descKey: 'settings.featureQuickStatsDesc',
  },
  {
    key: 'showContestHistory',
    titleKey: 'settings.featureHistory',
    descKey: 'settings.featureHistoryDesc',
  },
  {
    key: 'enableKeyboardShortcuts',
    titleKey: 'settings.featureKeyboard',
    descKey: 'settings.featureKeyboardDesc',
  },
  {
    key: 'enableProblemSearch',
    titleKey: 'settings.featureProblem',
    descKey: 'settings.featureProblemDesc',
  },
  {
    key: 'enableExternalTools',
    titleKey: 'settings.featureExternal',
    descKey: 'settings.featureExternalDesc',
  },
  {
    key: 'enableCfReport',
    titleKey: 'settings.featureReport',
    descKey: 'settings.featureReportDesc',
  },
  {
    key: 'confirmExternalLinks',
    titleKey: 'settings.featureConfirmLinks',
    descKey: 'settings.featureConfirmLinksDesc',
  },
  {
    key: 'reduceMotion',
    titleKey: 'settings.featureReduceMotion',
    descKey: 'settings.featureReduceMotionDesc',
  },
];

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string; icon?: React.ElementType }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1">
      {options.map(option => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-1.5 rounded-[calc(var(--radius-md)-2px)] px-3 py-1.5 text-xs font-medium transition-all ${
              active
                ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
            aria-pressed={active}
          >
            {Icon ? <Icon size={14} /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SettingRow({
  icon: Icon,
  title,
  desc,
  children,
  testId,
  wide,
}: {
  icon: React.ElementType;
  title: string;
  desc?: string;
  children: React.ReactNode;
  testId?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        'settings-row flex min-h-[68px] gap-3 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0',
        wide ? 'flex-wrap items-start' : 'items-center',
      )}
      data-testid={testId}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-primary-weak)] text-[var(--color-primary)]">
        <Icon size={17} />
      </div>
      <div className={cn('min-w-0 flex-1', wide && 'min-w-[220px]')}>
        <div className="text-sm font-semibold text-[var(--color-text)]">{title}</div>
        {desc && (
          <div className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-muted)]">
            {desc}
          </div>
        )}
      </div>
      <div className={cn('shrink-0', wide && 'w-full pl-11')}>{children}</div>
    </div>
  );
}

export default function Settings() {
  const { t, locale } = useI18n();
  const day = useContestStore(state => state.day);
  const hideDate = useContestStore(state => state.hideDate);
  const showEmptyDay = useContestStore(state => state.showEmptyDay);
  const setMaxCrawlDays = useContestStore(state => state.setMaxCrawlDays);
  const toggleHideDate = useContestStore(state => state.toggleHideDate);
  const toggleShowEmptyDay = useContestStore(state => state.toggleShowEmptyDay);

  const appMode = useUiStore(state => state.appMode);
  const colorMode = useUiStore(state => state.colorMode);
  const localePreference = useUiStore(state => state.locale);
  const surfaceStyle = useUiStore(state => state.surfaceStyle);
  const themeScheme = useUiStore(state => state.themeScheme);
  const features = useUiStore(state => state.features);
  const setAppMode = useUiStore(state => state.setAppMode);
  const setColorMode = useUiStore(state => state.setColorMode);
  const setLocale = useUiStore(state => state.setLocale);
  const setSurfaceStyle = useUiStore(state => state.setSurfaceStyle);
  const setThemeScheme = useUiStore(state => state.setThemeScheme);
  const setFeature = useUiStore(state => state.setFeature);

  const [isUpdatingDays, setIsUpdatingDays] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [activeSection, setActiveSection] = useState('appearance');
  const [startAtLogin, setStartAtLogin] = useState(false);
  const [closeBehavior, setCloseBehavior] = useState<WindowCloseBehavior>('tray');

  const showToast = useCallback((type: NonNullable<ToastState>['type'], text: string) => {
    setToast({ type, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    window.api
      .getNotification()
      .then(config => {
        if (!config) return;
        setNotificationsEnabled(config.enabled);
        setReminderMinutes(config.reminderMinutes);
      })
      .catch(() => {
        // Keep defaults when notification preferences cannot be read.
      });
  }, []);

  useEffect(() => {
    window.api
      .getAutoLaunch()
      .then(setStartAtLogin)
      .catch(() => {});
    window.store
      .get('ui.closeBehavior')
      .then(value => {
        if (value === 'tray' || value === 'quit') setCloseBehavior(value);
      })
      .catch(() => {});
  }, []);

  const updateMaxDays = useCallback(
    async (value: number) => {
      if (isUpdatingDays || value === day) return;
      setIsUpdatingDays(true);
      try {
        await setMaxCrawlDays(value);
        showToast('success', t('settings.queryUpdated', { days: value }));
      } catch (error) {
        showToast(
          'error',
          locale === 'en-US'
            ? t('settings.queryUpdateFailed')
            : error instanceof Error
              ? error.message
              : t('settings.queryUpdateFailed'),
        );
      } finally {
        setIsUpdatingDays(false);
      }
    },
    [day, isUpdatingDays, locale, setMaxCrawlDays, showToast, t],
  );

  const saveNotifications = useCallback(
    async (nextEnabled = notificationsEnabled, nextMinutes = reminderMinutes) => {
      if (isSavingNotifications) return;
      const safeMinutes = Math.max(1, Math.min(1440, Math.floor(Number(nextMinutes) || 15)));
      setIsSavingNotifications(true);
      try {
        await window.api.setNotification({
          enabled: nextEnabled,
          reminderMinutes: safeMinutes,
        });
        setNotificationsEnabled(nextEnabled);
        setReminderMinutes(safeMinutes);
        showToast('success', nextEnabled ? t('settings.remindersOn') : t('settings.remindersOff'));
      } catch (error) {
        showToast(
          'error',
          locale === 'en-US'
            ? t('settings.notificationSaveFailed')
            : error instanceof Error
              ? error.message
              : t('settings.notificationSaveFailed'),
        );
      } finally {
        setIsSavingNotifications(false);
      }
    },
    [isSavingNotifications, locale, notificationsEnabled, reminderMinutes, showToast, t],
  );

  const checkForUpdate = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      const info = await checkUpdate();
      if (info.state === 'update-available') {
        const message = `${info.currentVersion} → ${info.latestVersion}\n\n${info.notes ?? ''}`;
        if (info.packageUrl && window.confirm(message)) {
          await ContestService.installUpdate(info.packageUrl);
          showToast('success', t('settings.updateDownloading'));
        } else if (info.homepageUrl) {
          await ContestService.openUrl(info.homepageUrl);
          showToast('success', t('settings.releaseOpened'));
        } else {
          showToast('success', t('settings.updateFound', { version: info.latestVersion ?? '' }));
        }
      } else if (info.state === 'error') {
        showToast(
          'error',
          locale === 'en-US'
            ? t('settings.updateCheckFailed')
            : (info.errorMessage ?? t('settings.updateCheckFailed')),
        );
      } else {
        showToast('success', t('settings.latest', { version: info.currentVersion }));
      }
    } catch (error) {
      showToast(
        'error',
        locale === 'en-US'
          ? t('settings.updateCheckFailed')
          : error instanceof Error
            ? error.message
            : t('settings.updateCheckFailed'),
      );
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, locale, showToast, t]);

  const clearCache = useCallback(async () => {
    if (isClearingCache || !window.confirm(t('settings.clearCacheConfirm'))) return;
    setIsClearingCache(true);
    try {
      await ContestService.clearCache();
      showToast('success', t('settings.cacheCleared'));
    } catch (error) {
      showToast(
        'error',
        locale === 'en-US'
          ? t('settings.cacheClearFailed')
          : error instanceof Error
            ? error.message
            : t('settings.cacheClearFailed'),
      );
    } finally {
      setIsClearingCache(false);
    }
  }, [isClearingCache, locale, showToast, t]);

  const updateFeature = (key: keyof AppFeatures, enabled: boolean) => {
    void setFeature(key, enabled).catch(() => showToast('error', t('settings.featureSaveFailed')));
  };

  const updateAutoLaunch = useCallback(
    async (enabled: boolean) => {
      setStartAtLogin(enabled);
      try {
        await window.api.setAutoLaunch(enabled);
      } catch {
        setStartAtLogin(!enabled);
        showToast('error', t('settings.autoLaunchFailed'));
      }
    },
    [showToast, t],
  );

  const updateCloseBehavior = useCallback(
    async (behavior: WindowCloseBehavior) => {
      setCloseBehavior(behavior);
      try {
        await window.store.set('ui.closeBehavior', behavior);
      } catch {
        setCloseBehavior(behavior === 'tray' ? 'quit' : 'tray');
        showToast('error', t('settings.closeBehaviorFailed'));
      }
    },
    [showToast, t],
  );

  const modeLabel = (mode: AppMode) =>
    mode === 'simple' ? t('settings.simpleMode') : t('settings.fullMode');
  const colorModeLabel = (mode: ColorMode) =>
    mode === 'auto' ? t('common.system') : mode === 'dark' ? t('common.dark') : t('common.light');
  const schemeLabel = (scheme: ThemeScheme) =>
    t(schemes.find(item => item.value === scheme)?.labelKey ?? 'settings.schemeOcean');
  const surfaceLabel = (surface: SurfaceStyle) =>
    t(surfaces.find(item => item.value === surface)?.labelKey ?? 'settings.surfaceGlass');
  const periods = PERIOD_OPTIONS.includes(day) ? PERIOD_OPTIONS : [...PERIOD_OPTIONS, day];

  const localeOptions: Array<{ value: LocalePreference; label: string; icon: React.ElementType }> =
    [
      { value: 'system', label: t('settings.systemFollow'), icon: MonitorCog },
      { value: 'zh-CN', label: t('settings.chinese'), icon: Languages },
      { value: 'en-US', label: t('settings.english'), icon: Languages },
    ];

  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader title={t('settings.title')} />
      <div className="flex-1 overflow-y-auto p-4">
        {toast && (
          <div
            className={`fixed right-4 top-16 z-[80] max-w-[min(360px,calc(100vw-2rem))] rounded-[var(--radius-md)] px-4 py-2.5 text-sm shadow-lg ${
              toast.type === 'success'
                ? 'bg-[var(--color-success)] text-[var(--color-success-foreground)]'
                : toast.type === 'error'
                  ? 'bg-[var(--color-error)] text-[var(--color-error-foreground)]'
                  : 'bg-[var(--color-warning)] text-[var(--color-warning-foreground)]'
            }`}
            role="status"
          >
            {toast.text}
          </div>
        )}

        <div className="mx-auto max-w-4xl space-y-4">
          <nav
            className="glass-panel sticky top-0 z-30 flex gap-1 overflow-x-auto rounded-[var(--radius-lg)] p-1.5"
            aria-label={t('settings.title')}
          >
            {settingsSections.map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex min-w-max items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold transition ${
                    activeSection === section.id
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[var(--clay-shadow-sm)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-primary-weak)] hover:text-[var(--color-primary)]'
                  }`}
                  aria-current={activeSection === section.id ? 'location' : undefined}
                >
                  <Icon size={14} />
                  {t(section.labelKey)}
                </button>
              );
            })}
          </nav>

          <section className="glass-panel relative overflow-hidden rounded-[var(--radius-xl)] p-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-primary-weak),transparent_52%)]" />
            <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                  <Sparkles size={16} />
                  {t('settings.workbench')}
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-text)]">
                  v{packageJson.version}
                </h1>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {modeLabel(appMode)} · {schemeLabel(themeScheme)} · {surfaceLabel(surfaceStyle)} ·{' '}
                  {colorModeLabel(colorMode)} ·{' '}
                  {locale === 'zh-CN' ? t('settings.chinese') : t('settings.english')}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] px-3 py-2">
                  <div className="text-lg font-semibold text-[var(--color-text)]">{day}</div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">
                    {t('settings.queryDays')}
                  </div>
                </div>
                <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] px-3 py-2">
                  <div className="text-lg font-semibold text-[var(--color-text)]">
                    {Object.values(features).filter(Boolean).length}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">
                    {t('settings.enabledFeatures')}
                  </div>
                </div>
                <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] px-3 py-2">
                  <div className="text-lg font-semibold text-[var(--color-text)]">
                    {notificationsEnabled ? t('settings.on') : t('settings.off')}
                  </div>
                  <div className="text-[10px] text-[var(--color-text-muted)]">
                    {t('settings.contestReminder')}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            id="settings-section-appearance"
            className={cn(
              'glass-panel scroll-mt-24 overflow-hidden rounded-[var(--radius-xl)]',
              activeSection !== 'appearance' && 'hidden',
            )}
          >
            <div className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
              {t('settings.appearance')}
            </div>
            <SettingRow
              icon={SlidersHorizontal}
              title={t('settings.appMode')}
              desc={t('settings.appModeDesc')}
            >
              <Segmented
                value={appMode}
                options={[
                  { value: 'simple', label: t('settings.simpleMode') },
                  { value: 'full', label: t('settings.fullMode') },
                ]}
                onChange={mode => void setAppMode(mode)}
              />
            </SettingRow>
            <SettingRow
              icon={Sun}
              title={t('settings.colorMode')}
              desc={t('settings.colorModeDesc')}
              testId="settings-color-mode"
            >
              <Segmented
                value={colorMode}
                options={colorModeKeys.map(option => ({
                  value: option.value,
                  label: t(option.labelKey),
                  icon: option.icon,
                }))}
                onChange={mode => void setColorMode(mode)}
              />
            </SettingRow>
            <SettingRow
              icon={Sparkles}
              title={t('settings.accent')}
              desc={t('settings.accentDesc')}
              testId="settings-accent"
              wide
            >
              <div className="flex flex-wrap gap-2">
                {schemes.map(scheme => (
                  <button
                    key={scheme.value}
                    type="button"
                    onClick={() => void setThemeScheme(scheme.value)}
                    className={`flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-left transition ${
                      themeScheme === scheme.value
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-weak)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                    }`}
                    aria-pressed={themeScheme === scheme.value}
                  >
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: scheme.swatch }}
                    />
                    <span className="text-xs font-medium text-[var(--color-text)]">
                      {t(scheme.labelKey)}
                    </span>
                    {themeScheme === scheme.value && (
                      <Check size={13} className="text-[var(--color-primary)]" />
                    )}
                  </button>
                ))}
              </div>
            </SettingRow>
            <SettingRow
              icon={Box}
              title={t('settings.surface')}
              desc={t('settings.surfaceDesc')}
              testId="settings-surface"
              wide
            >
              <Segmented
                value={surfaceStyle}
                options={surfaces.map(option => ({
                  value: option.value,
                  label: t(option.labelKey),
                  icon: option.icon,
                }))}
                onChange={value => void setSurfaceStyle(value)}
              />
            </SettingRow>
            <SettingRow
              icon={Languages}
              title={t('settings.language')}
              desc={t('settings.languageDesc')}
              testId="settings-language"
            >
              <Segmented
                value={localePreference}
                options={localeOptions}
                onChange={value => void setLocale(value)}
              />
            </SettingRow>
          </section>

          <section
            id="settings-section-features"
            className={cn(
              'glass-panel scroll-mt-24 overflow-hidden rounded-[var(--radius-xl)]',
              activeSection !== 'features' && 'hidden',
            )}
          >
            <div className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
              {t('settings.features')}
            </div>
            {featureRows.map(row => (
              <SettingRow
                key={row.key}
                icon={row.key === 'enableKeyboardShortcuts' ? Keyboard : Sparkles}
                title={t(row.titleKey)}
                desc={t(row.descKey)}
              >
                <Switch
                  checked={features[row.key]}
                  onCheckedChange={checked => updateFeature(row.key, checked)}
                  aria-label={t(row.titleKey)}
                />
              </SettingRow>
            ))}
          </section>

          <section
            id="settings-section-contest"
            className={cn(
              'glass-panel scroll-mt-24 overflow-hidden rounded-[var(--radius-xl)]',
              activeSection !== 'contest' && 'hidden',
            )}
          >
            <div className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
              {t('settings.contestPreferences')}
            </div>
            <SettingRow
              icon={RefreshCw}
              title={t('settings.queryPeriod')}
              desc={t('settings.queryPeriodDesc')}
            >
              <div className="flex items-center gap-2">
                {isUpdatingDays && (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
                )}
                {periods.map(period => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => void updateMaxDays(period)}
                    disabled={isUpdatingDays}
                    aria-pressed={day === period}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      day === period
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                        : 'border-[var(--color-border)] bg-[var(--glass-highlight)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]'
                    }`}
                  >
                    {t('common.days', { count: period })}
                  </button>
                ))}
              </div>
            </SettingRow>
            <SettingRow
              icon={MonitorCog}
              title={t('settings.hideDates')}
              desc={t('settings.hideDatesDesc')}
            >
              <Switch
                checked={hideDate}
                onCheckedChange={value => void toggleHideDate(value)}
                aria-label={t('settings.hideDates')}
              />
            </SettingRow>
            <SettingRow
              icon={SlidersHorizontal}
              title={t('settings.emptyDays')}
              desc={t('settings.emptyDaysDesc')}
            >
              <Switch
                checked={showEmptyDay}
                onCheckedChange={toggleShowEmptyDay}
                aria-label={t('settings.emptyDays')}
              />
            </SettingRow>
          </section>

          <section
            id="settings-section-reminders"
            className={cn(
              'glass-panel scroll-mt-24 overflow-hidden rounded-[var(--radius-xl)]',
              activeSection !== 'reminders' && 'hidden',
            )}
          >
            <div className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
              {t('settings.remindersData')}
            </div>
            <SettingRow
              icon={Bell}
              title={t('settings.contestStartReminder')}
              desc={t('settings.contestStartReminderDesc')}
            >
              <Switch
                checked={notificationsEnabled}
                disabled={isSavingNotifications}
                onCheckedChange={enabled => void saveNotifications(enabled, reminderMinutes)}
                aria-label={t('settings.contestStartReminder')}
              />
            </SettingRow>
            <SettingRow
              icon={Bell}
              title={t('settings.reminderLead')}
              desc={t('settings.reminderLeadDesc')}
            >
              <input
                type="number"
                min={1}
                max={1440}
                value={reminderMinutes}
                disabled={!notificationsEnabled || isSavingNotifications}
                onChange={event => setReminderMinutes(Number(event.target.value))}
                onBlur={() => void saveNotifications(notificationsEnabled, reminderMinutes)}
                onKeyDown={event => {
                  if (event.key === 'Enter')
                    void saveNotifications(notificationsEnabled, reminderMinutes);
                }}
                className="h-9 w-[86px] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-[var(--color-text)] outline-none disabled:opacity-50"
                aria-label={t('settings.reminderLead')}
              />
            </SettingRow>
            <SettingRow
              icon={Database}
              title={t('settings.clearCache')}
              desc={t('settings.clearCacheDesc')}
            >
              <Button variant="outline" size="sm" disabled={isClearingCache} onClick={clearCache}>
                {isClearingCache ? t('settings.clearing') : t('settings.clearCache')}
              </Button>
            </SettingRow>
            <SettingRow
              icon={RefreshCw}
              title={t('settings.checkUpdate')}
              desc={t('settings.checkUpdateDesc')}
            >
              <Button variant="outline" size="sm" disabled={isChecking} onClick={checkForUpdate}>
                {isChecking ? t('settings.checking') : t('settings.checkUpdate')}
              </Button>
            </SettingRow>
          </section>

          <section
            id="settings-section-system"
            className={cn(
              'glass-panel scroll-mt-24 overflow-hidden rounded-[var(--radius-xl)]',
              activeSection !== 'system' && 'hidden',
            )}
          >
            <div className="border-b border-[var(--color-border)] px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
              {t('settings.systemSection')}
            </div>
            <SettingRow
              icon={MonitorCog}
              title={t('settings.startAtLogin')}
              desc={t('settings.startAtLoginDesc')}
              testId="settings-auto-launch"
            >
              <Switch
                checked={startAtLogin}
                onCheckedChange={enabled => void updateAutoLaunch(enabled)}
                aria-label={t('settings.startAtLogin')}
              />
            </SettingRow>
            <SettingRow
              icon={X}
              title={t('settings.closeBehavior')}
              desc={t('settings.closeBehaviorDesc')}
              testId="settings-close-behavior"
            >
              <Segmented
                value={closeBehavior}
                options={[
                  { value: 'tray', label: t('settings.closeToTray') },
                  { value: 'quit', label: t('settings.quitDirectly') },
                ]}
                onChange={behavior => void updateCloseBehavior(behavior)}
              />
            </SettingRow>
          </section>

          <section
            id="settings-section-about"
            className={cn(
              'glass-panel scroll-mt-24 overflow-hidden rounded-[var(--radius-xl)]',
              activeSection !== 'about' && 'hidden',
            )}
          >
            <button
              type="button"
              className="settings-row group flex w-full items-center gap-3 border-b border-[var(--color-border)] px-4 py-3.5 text-left hover:bg-[var(--nav-hover-bg)]"
              onClick={() => void ContestService.openUrl('https://github.com/Siborne/OJFlow')}
              aria-label={t('settings.about')}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-primary-weak)] text-[var(--color-primary)]">
                <Info size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[var(--color-text)]">
                  {t('settings.about')}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  github.com/Siborne/OJFlow
                </div>
              </div>
              <ChevronRight
                size={18}
                className="settings-row-affordance text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100"
              />
            </button>
            <button
              type="button"
              className="settings-row flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--nav-hover-bg)]"
              onClick={() => void ContestService.openUrl('https://github.com/2754LM/oj_helper')}
              aria-label={t('settings.reference')}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
                <Link2 size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-[var(--color-text)]">
                  {t('settings.reference')}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  github.com/2754LM/oj_helper
                </div>
              </div>
              <ChevronRight size={18} className="text-[var(--color-text-muted)]" />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
