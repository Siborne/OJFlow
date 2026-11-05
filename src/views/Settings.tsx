import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Braces,
  Box,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Cloud,
  Database,
  Info,
  Images,
  Keyboard,
  Languages,
  Link2,
  MonitorCog,
  Moon,
  RefreshCw,
  RotateCcw,
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
  AutoRefreshModule,
  DashboardScheduleScope,
  LocalePreference,
  SurfaceStyle,
  SharePosterSettings,
  ThemeScheme,
  WindowCloseBehavior,
  ShortcutSettings,
} from '../../shared/types';

type ToastState = { type: 'success' | 'error' | 'warning'; text: string } | null;

const PERIOD_OPTIONS = [7, 15, 30];
const AUTO_REFRESH_INTERVALS = [5, 15, 30, 60];
const REMINDER_OPTIONS = [5, 10, 15, 30, 60];
const AUTO_REFRESH_MODULES: Array<{ key: AutoRefreshModule; labelKey: MessageKey }> = [
  { key: 'dashboard', labelKey: 'settings.autoRefreshDashboard' },
  { key: 'rating', labelKey: 'settings.autoRefreshRating' },
  { key: 'solved', labelKey: 'settings.autoRefreshSolved' },
  { key: 'report', labelKey: 'settings.autoRefreshReport' },
];
const SHARE_POSTER_SECTIONS: Array<{ key: keyof SharePosterSettings; labelKey: MessageKey }> = [
  { key: 'showRating', labelKey: 'settings.sharePosterRating' },
  { key: 'showPlatforms', labelKey: 'settings.sharePosterPlatforms' },
  { key: 'showTopics', labelKey: 'settings.sharePosterTopics' },
  { key: 'showSchedule', labelKey: 'settings.sharePosterSchedule' },
];

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
  {
    value: 'ocean',
    labelKey: 'settings.schemeOcean',
    swatch: 'linear-gradient(135deg, #075d68 0%, #0e8f99 48%, #72d7d1 100%)',
  },
  {
    value: 'ember',
    labelKey: 'settings.schemeEmber',
    swatch: 'linear-gradient(135deg, #9b3d1c 0%, #cf6337 48%, #f7c17d 100%)',
  },
  {
    value: 'forest',
    labelKey: 'settings.schemeForest',
    swatch: 'linear-gradient(135deg, #2f6f45 0%, #7aaa63 52%, #c4d86d 100%)',
  },
  {
    value: 'berry',
    labelKey: 'settings.schemeBerry',
    swatch: 'linear-gradient(135deg, #a72f62 0%, #d85278 48%, #f2a27f 100%)',
  },
  {
    value: 'sky',
    labelKey: 'settings.schemeSky',
    swatch: 'linear-gradient(135deg, #1d4ed8 0%, #2f8df5 50%, #67e8f9 100%)',
  },
  {
    value: 'sand',
    labelKey: 'settings.schemeSand',
    swatch: 'linear-gradient(135deg, #8f5a15 0%, #c68a32 55%, #f0d391 100%)',
  },
  {
    value: 'ink',
    labelKey: 'settings.schemeInk',
    swatch: 'linear-gradient(135deg, #1e293b 0%, #475569 48%, #0e7490 100%)',
  },
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
  const autoRefresh = useUiStore(state => state.autoRefresh);
  const autoCheckUpdates = useUiStore(state => state.autoCheckUpdates);
  const dashboardScheduleScope = useUiStore(state => state.dashboardScheduleScope);
  const templatesExpanded = useUiStore(state => state.templatesExpanded);
  const templateExport = useUiStore(state => state.templateExport);
  const sharePoster = useUiStore(state => state.sharePoster);
  const setAppMode = useUiStore(state => state.setAppMode);
  const setColorMode = useUiStore(state => state.setColorMode);
  const setLocale = useUiStore(state => state.setLocale);
  const setSurfaceStyle = useUiStore(state => state.setSurfaceStyle);
  const setThemeScheme = useUiStore(state => state.setThemeScheme);
  const setFeature = useUiStore(state => state.setFeature);
  const setAutoRefreshEnabled = useUiStore(state => state.setAutoRefreshEnabled);
  const setAutoRefreshInterval = useUiStore(state => state.setAutoRefreshInterval);
  const setAutoRefreshModule = useUiStore(state => state.setAutoRefreshModule);
  const setAutoCheckUpdates = useUiStore(state => state.setAutoCheckUpdates);
  const shortcut = useUiStore(state => state.shortcut);
  const setShortcutSettings = useUiStore(state => state.setShortcutSettings);
  const setDashboardScheduleScope = useUiStore(state => state.setDashboardScheduleScope);
  const setTemplatesExpanded = useUiStore(state => state.setTemplatesExpanded);
  const setTemplateExportOption = useUiStore(state => state.setTemplateExportOption);
  const setSharePosterSection = useUiStore(state => state.setSharePosterSection);

  const [isUpdatingDays, setIsUpdatingDays] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [activeSection, setActiveSection] = useState('appearance');
  const [startAtLogin, setStartAtLogin] = useState(false);
  const [shortcutListening, setShortcutListening] = useState(false);
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

  const resetAllSettings = useCallback(async () => {
    if (!window.confirm(t('settings.resetAllConfirm'))) return;
    try {
      await window.store.set('ui', {});
      await window.store.set('contest', {});
      await window.store.set('favorites', []);
      await window.store.set('usernames', {});
      await window.store.set('cache', {});
      await window.store.set('schedule', []);
      await window.store.set('templates', []);
      await window.store.set('templateExport', {
        includeTitle: true,
        includeLanguage: true,
        includeCategory: true,
      });
      await window.api.setShortcutSettings({
        enabled: true,
        accelerator: 'CommandOrControl+Shift+T',
        target: 'last',
      });
      localStorage.clear();
      showToast('success', t('settings.resetAllDone'));
      window.location.reload();
    } catch {
      showToast('error', t('settings.resetAllFailed'));
    }
  }, [showToast, t]);
  const updateShortcut = useCallback(
    async (patch: Partial<ShortcutSettings>) => {
      const previous = shortcut;
      const next = { ...previous, ...patch };
      setShortcutSettings(next);
      try {
        const result = await window.api.setShortcutSettings(next);
        if (!result.success) throw new Error(result.error ?? '');
        showToast('success', t('settings.shortcutSaved'));
      } catch {
        setShortcutSettings(previous);
        showToast('error', t('settings.shortcutSaveFailed'));
      }
    },
    [shortcut, setShortcutSettings, showToast, t],
  );

  useEffect(() => {
    if (!shortcutListening) return;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const key = event.key.length === 1 ? event.key : '';
      if (!key) return;
      const parts: string[] = [];
      if (event.metaKey) parts.push('Meta');
      else if (event.ctrlKey) parts.push('CommandOrControl');
      if (parts.length === 0) return;
      if (event.altKey) parts.push('Alt');
      if (event.shiftKey) parts.push('Shift');
      parts.push(key.toUpperCase());
      setShortcutListening(false);
      void updateShortcut({ accelerator: parts.join('+') });
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [shortcutListening, updateShortcut]);

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
            className="glass-panel sticky top-0 z-30 grid grid-cols-3 gap-1 rounded-[var(--radius-lg)] p-1.5 md:grid-cols-6"
            aria-label={t('settings.title')}
          >
            {settingsSections.map(section => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`flex min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-[var(--radius-md)] px-1.5 py-2 text-[11px] font-semibold transition xl:text-xs ${
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

          <section
            id="settings-section-appearance"
            className={cn(
              'glass-panel scroll-mt-24 overflow-hidden rounded-[var(--radius-xl)]',
              activeSection !== 'appearance' && 'hidden',
            )}
          >
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
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
                {schemes.map(scheme => (
                  <button
                    key={scheme.value}
                    type="button"
                    onClick={() => void setThemeScheme(scheme.value)}
                    className={`relative flex min-w-0 flex-col items-center gap-2 rounded-[var(--radius-md)] border p-2 text-center transition ${
                      themeScheme === scheme.value
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-weak)] shadow-[var(--clay-inset)]'
                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                    }`}
                    aria-pressed={themeScheme === scheme.value}
                  >
                    <span
                      className="relative h-11 w-full overflow-hidden rounded-[9px] border border-white/60 shadow-[0_6px_14px_rgba(0,0,0,0.16)]"
                      style={{ backgroundImage: scheme.swatch }}
                    >
                      <span className="absolute inset-x-1 top-1 h-2 rounded-full bg-white/30 blur-[2px]" />
                    </span>
                    <span className="w-full truncate text-[11px] font-semibold text-[var(--color-text)]">
                      {t(scheme.labelKey)}
                    </span>
                    {themeScheme === scheme.value && (
                      <Check
                        size={13}
                        className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-0.5 text-[var(--color-primary)] shadow-sm"
                      />
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
            <SettingRow
              icon={CalendarDays}
              title={t('settings.dashboardScheduleScope')}
              desc={t('settings.dashboardScheduleScopeDesc')}
            >
              <Segmented<DashboardScheduleScope>
                value={dashboardScheduleScope}
                options={[
                  {
                    value: 'today',
                    label: t('settings.scheduleScopeToday'),
                    icon: CalendarDays,
                  },
                  {
                    value: 'upcoming',
                    label: t('settings.scheduleScopeUpcoming'),
                    icon: Clock3,
                  },
                ]}
                onChange={scope => void setDashboardScheduleScope(scope)}
              />
            </SettingRow>
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
            <SettingRow
              icon={Braces}
              title={t('templates.expandCode')}
              desc={t('templates.expandCodeDesc')}
              testId="settings-templates-expanded"
            >
              <Switch
                checked={templatesExpanded}
                onCheckedChange={enabled => void setTemplatesExpanded(enabled)}
                aria-label={t('templates.expandCode')}
              />
            </SettingRow>
            <SettingRow
              icon={Braces}
              title={t('templates.export')}
              desc={t('templates.exportEmpty')}
              wide
            >
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { key: 'includeTitle', labelKey: 'templates.templateTitle' },
                    { key: 'includeLanguage', labelKey: 'templates.language' },
                    { key: 'includeCategory', labelKey: 'templates.category' },
                  ] as const
                ).map(section => (
                  <button
                    key={section.key}
                    type="button"
                    data-testid={`settings-template-export-${section.key}`}
                    onClick={() =>
                      void setTemplateExportOption(section.key, !templateExport[section.key])
                    }
                    aria-pressed={templateExport[section.key]}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                      templateExport[section.key]
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-weak)] text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)]',
                    )}
                  >
                    {t(section.labelKey)}
                  </button>
                ))}
              </div>
            </SettingRow>
            <SettingRow
              icon={RefreshCw}
              title={t('settings.autoRefresh')}
              desc={t('settings.autoRefreshDesc')}
              testId="settings-auto-refresh"
            >
              <Switch
                checked={autoRefresh.enabled}
                onCheckedChange={enabled => void setAutoRefreshEnabled(enabled)}
                aria-label={t('settings.autoRefresh')}
              />
            </SettingRow>
            <SettingRow
              icon={Clock3}
              title={t('settings.autoRefreshInterval')}
              desc={t('settings.autoRefreshIntervalDesc')}
            >
              <select
                value={autoRefresh.intervalMinutes}
                disabled={!autoRefresh.enabled}
                onChange={event => void setAutoRefreshInterval(Number(event.target.value))}
                className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-[var(--color-text)] outline-none disabled:opacity-50"
                aria-label={t('settings.autoRefreshInterval')}
              >
                {AUTO_REFRESH_INTERVALS.map(minutes => (
                  <option key={minutes} value={minutes}>
                    {t('settings.minutes', { count: minutes })}
                  </option>
                ))}
              </select>
            </SettingRow>
            <SettingRow
              icon={SlidersHorizontal}
              title={t('settings.autoRefreshModules')}
              desc={t('settings.autoRefreshModulesDesc')}
              wide
            >
              <div className="flex flex-wrap gap-2">
                {AUTO_REFRESH_MODULES.map(module => (
                  <button
                    key={module.key}
                    type="button"
                    data-testid={`settings-auto-refresh-${module.key}`}
                    disabled={!autoRefresh.enabled}
                    onClick={() =>
                      void setAutoRefreshModule(module.key, !autoRefresh.modules[module.key])
                    }
                    aria-pressed={autoRefresh.modules[module.key]}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-45',
                      autoRefresh.modules[module.key]
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-weak)] text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)]',
                    )}
                  >
                    {t(module.labelKey)}
                  </button>
                ))}
              </div>
            </SettingRow>
            <SettingRow
              icon={Images}
              title={t('settings.sharePosterContent')}
              desc={t('settings.sharePosterContentDesc')}
              wide
            >
              <div className="flex flex-wrap gap-2">
                {SHARE_POSTER_SECTIONS.map(section => (
                  <button
                    key={section.key}
                    type="button"
                    data-testid={`settings-share-poster-${section.key}`}
                    onClick={() =>
                      void setSharePosterSection(section.key, !sharePoster[section.key])
                    }
                    aria-pressed={sharePoster[section.key]}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                      sharePoster[section.key]
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-weak)] text-[var(--color-primary)]'
                        : 'border-[var(--color-border)] text-[var(--color-text-muted)]',
                    )}
                  >
                    {t(section.labelKey)}
                  </button>
                ))}
              </div>
            </SettingRow>
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
              <select
                value={reminderMinutes}
                disabled={!notificationsEnabled || isSavingNotifications}
                onChange={event => {
                  const minutes = Number(event.target.value);
                  setReminderMinutes(minutes);
                  void saveNotifications(notificationsEnabled, minutes);
                }}
                className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-[var(--color-text)] outline-none disabled:opacity-50"
                aria-label={t('settings.reminderLead')}
              >
                {REMINDER_OPTIONS.map(minutes => (
                  <option key={minutes} value={minutes}>
                    {t('settings.minutes', { count: minutes })}
                  </option>
                ))}
              </select>
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
              icon={Keyboard}
              title={t('settings.templateShortcut')}
              desc={t('settings.templateShortcutDesc')}
              testId="settings-template-shortcut"
            >
              <div className="flex items-center gap-2">
                <Switch
                  checked={shortcut.enabled}
                  onCheckedChange={enabled => void updateShortcut({ enabled })}
                  aria-label={t('settings.templateShortcut')}
                />
                <button
                  type="button"
                  onClick={() => setShortcutListening(true)}
                  aria-label={t('settings.templateShortcut')}
                  className={cn(
                    'h-9 rounded-[var(--radius-sm)] border px-3 text-sm transition',
                    shortcutListening
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary-weak)] text-[var(--color-primary)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]',
                  )}
                >
                  {shortcutListening
                    ? t('settings.shortcutListening')
                    : shortcut.accelerator === ''
                      ? t('settings.shortcutOff')
                      : shortcut.accelerator
                          .replace('CommandOrControl', 'Ctrl/Cmd')
                          .replaceAll('+', ' + ')}
                </button>
              </div>
            </SettingRow>
            <SettingRow
              icon={RefreshCw}
              title={t('settings.autoCheckUpdates')}
              desc={t('settings.autoCheckUpdatesDesc')}
              testId="settings-auto-updates"
            >
              <Switch
                checked={autoCheckUpdates}
                onCheckedChange={enabled => void setAutoCheckUpdates(enabled)}
                aria-label={t('settings.autoCheckUpdates')}
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
            <SettingRow
              icon={RotateCcw}
              title={t('settings.resetAll')}
              desc={t('settings.resetAllDesc')}
              testId="settings-reset-all"
            >
              <Button variant="destructive" size="sm" onClick={() => void resetAllSettings()}>
                {t('settings.resetAll')}
              </Button>
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
