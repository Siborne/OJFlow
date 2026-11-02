import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  CircleCheckBig,
  FileChartColumn,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  Settings,
  Star,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useUiStore } from '@/stores/ui';
import { useContestStore } from '@/stores/contest';
import { useI18n, type MessageKey } from '@/i18n';
import { WindowTitleBar } from '@/components/WindowTitleBar';

const appLogo = new URL('../assets/icon.png', import.meta.url).href;

type NavSection = 'explore' | 'insights' | 'community';

interface NavItem {
  key: string;
  labelKey: MessageKey;
  icon: React.ElementType;
  path: string;
  section: NavSection;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    section: 'explore',
  },
  {
    key: 'contest',
    labelKey: 'nav.contest',
    icon: CalendarDays,
    path: '/contest',
    section: 'explore',
  },
  {
    key: 'favorites',
    labelKey: 'nav.favorites',
    icon: Star,
    path: '/star',
    section: 'explore',
  },
  {
    key: 'problems',
    labelKey: 'nav.problems',
    icon: LibraryBig,
    path: '/problems',
    section: 'explore',
  },
  {
    key: 'rating',
    labelKey: 'nav.rating',
    icon: BarChart3,
    path: '/rating',
    section: 'insights',
  },
  {
    key: 'solved',
    labelKey: 'nav.solved',
    icon: CircleCheckBig,
    path: '/solved_num',
    section: 'insights',
  },
  {
    key: 'cf-report',
    labelKey: 'nav.cfReport',
    icon: FileChartColumn,
    path: '/cf_report',
    section: 'insights',
  },
  { key: 'ccpc', labelKey: 'nav.ccpc', icon: Trophy, path: '/ccpc', section: 'community' },
  {
    key: 'oier',
    labelKey: 'nav.oier',
    icon: GraduationCap,
    path: '/oier',
    section: 'community',
  },
];

const SECTION_LABELS: Record<NavSection, MessageKey> = {
  explore: 'nav.explore',
  insights: 'nav.insights',
  community: 'nav.community',
};

const SETTINGS_ITEM: NavItem = {
  key: 'settings',
  labelKey: 'nav.settings',
  icon: Settings,
  path: '/setting',
  section: 'community',
};

function getActiveKey(pathname: string): string {
  return [...NAV_ITEMS, SETTINGS_ITEM].find(item => item.path === pathname)?.key ?? 'dashboard';
}

export default function NavigationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const appMode = useUiStore(state => state.appMode);
  const keyboardEnabled = useUiStore(state => state.features.enableKeyboardShortcuts);
  const problemSearchEnabled = useUiStore(state => state.features.enableProblemSearch);
  const externalToolsEnabled = useUiStore(state => state.features.enableExternalTools);
  const cfReportEnabled = useUiStore(state => state.features.enableCfReport);
  const { t } = useI18n();
  const fetchContests = useContestStore(state => state.fetchContests);
  const [isWide, setIsWide] = useState(() => window.innerWidth > 900);
  const isCompact = appMode === 'simple';

  const visibleItems = useMemo(
    () =>
      NAV_ITEMS.filter(item => {
        if (item.key === 'problems') return problemSearchEnabled;
        if (item.key === 'cf-report') return cfReportEnabled;
        if (item.key === 'ccpc' || item.key === 'oier') return externalToolsEnabled;
        return true;
      }),
    [cfReportEnabled, externalToolsEnabled, problemSearchEnabled],
  );
  const activeKey = getActiveKey(location.pathname);
  const routes = useMemo(() => visibleItems.map(item => item.path), [visibleItems]);

  useKeyboardShortcuts({
    enabled: keyboardEnabled,
    routes,
    onRefresh: () => {
      void fetchContests().catch(() => {
        // The contest page renders the store error.
      });
    },
    onSearch: () => {
      if (problemSearchEnabled) navigate('/problems');
    },
  });

  useEffect(() => {
    const checkLayout = () => setIsWide(window.innerWidth > 900);
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);

  const renderNavButton = (item: NavItem, mobile = false) => {
    const Icon = item.icon;
    const label = t(item.labelKey);
    const isActive = activeKey === item.key;
    const showLabel = !isCompact;

    return (
      <button
        key={item.key}
        type="button"
        onClick={() => navigate(item.path)}
        className={cn(
          'nav-item group relative flex items-center transition-all duration-[var(--motion-base)]',
          mobile
            ? cn(
                'min-w-[64px] flex-1 justify-center rounded-[18px] px-3 py-2',
                showLabel ? 'flex-col gap-0.5' : 'flex-col',
              )
            : cn(
                isCompact ? 'h-[48px] w-full rounded-[16px]' : 'h-[44px] w-full rounded-[14px]',
                isCompact ? 'justify-center' : 'justify-start gap-3 px-3.5',
              ),
          isActive
            ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-color)] shadow-[var(--clay-inset)]'
            : 'text-[var(--nav-text-color)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--nav-hover-color)]',
        )}
        aria-current={isActive ? 'page' : undefined}
        aria-label={label}
        title={label}
        data-nav-key={item.key}
      >
        {isActive && !mobile && (
          <span className="absolute -left-1.5 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-[var(--color-primary)] shadow-[0_0_14px_var(--color-primary)]" />
        )}
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] transition-transform group-hover:scale-105',
            isActive ? 'bg-[var(--glass-highlight)]' : '',
          )}
        >
          <Icon size={19} strokeWidth={2.15} />
        </span>
        {showLabel && (
          <span className={cn('truncate font-semibold', mobile ? 'text-[10px]' : 'text-[13px]')}>
            {label}
          </span>
        )}
      </button>
    );
  };

  const groupedItems = useMemo(() => {
    const groups: Array<{ section: NavSection; items: NavItem[] }> = [];
    for (const section of Object.keys(SECTION_LABELS) as NavSection[]) {
      const items = visibleItems.filter(item => item.section === section);
      if (items.length > 0) groups.push({ section, items });
    }
    return groups;
  }, [visibleItems]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <WindowTitleBar />
      <div className={cn('flex min-h-0 flex-1', isWide ? 'flex-row' : 'flex-col')}>
        {isWide ? (
          <nav
            className={cn(
              'nav-shell fixed left-0 top-9 z-40 flex h-[calc(100vh-2.25rem)] flex-col border-r border-[var(--glass-border)] px-3 pb-3 pt-4 backdrop-blur-[var(--frost-blur-strong)] transition-[width] duration-[var(--motion-page)]',
              isCompact ? 'w-[76px] items-center' : 'w-[224px]',
            )}
            role="navigation"
            aria-label={t('nav.main')}
            data-compact={isCompact ? 'true' : 'false'}
          >
            <button
              type="button"
              className={cn(
                'brand-orb mb-5 flex items-center rounded-[20px]',
                isCompact ? 'h-12 w-12 justify-center' : 'h-14 w-full gap-3 px-3',
              )}
              onClick={() => navigate('/dashboard')}
              aria-label={t('nav.home')}
              title="OJFlow"
            >
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[15px] border border-[var(--glass-border)] bg-white shadow-[var(--clay-shadow-sm)]">
                <img src={appLogo} alt="" className="h-full w-full object-cover" />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--nav-bg-color)] bg-[var(--color-success)]" />
              </span>
              {!isCompact && (
                <span className="min-w-0 text-left">
                  <span className="block font-[760] tracking-[-0.04em] text-[var(--color-text)]">
                    OJFlow
                  </span>
                  <span className="block text-[10px] font-medium tracking-[0.12em] text-[var(--color-text-muted)]">
                    PRACTICE STUDIO
                  </span>
                </span>
              )}
            </button>

            <div className="nav-items flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
              {groupedItems.map(({ section, items }, groupIndex) => (
                <div key={section} className={cn(groupIndex > 0 && 'mt-3')}>
                  {!isCompact && (
                    <div className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]/70">
                      {t(SECTION_LABELS[section])}
                    </div>
                  )}
                  {isCompact && groupIndex > 0 && (
                    <div className="mx-auto mb-2 h-px w-7 bg-[var(--color-border)]" />
                  )}
                  <div className="space-y-1">{items.map(item => renderNavButton(item))}</div>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-3">
              <div className="mb-2 h-px w-full bg-[var(--color-border)]" />
              {renderNavButton(SETTINGS_ITEM)}
              {!isCompact ? (
                <div className="mt-3 flex items-center justify-between rounded-[14px] border border-[var(--glass-border)] bg-[var(--glass-highlight)] px-3 py-2 text-[10px] text-[var(--color-text-muted)]">
                  <span>{t('nav.fullMode')}</span>
                  <span className="rounded-md bg-[var(--color-surface-muted)] px-1.5 py-0.5 font-mono">
                    Ctrl+K
                  </span>
                </div>
              ) : (
                <div
                  className="mx-auto mt-3 h-2 w-2 rounded-full bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]"
                  title={t('nav.simpleMode')}
                />
              )}
            </div>
          </nav>
        ) : null}

        <main
          className={cn(
            'min-h-0 flex-1 overflow-hidden',
            isWide && (isCompact ? 'ml-[76px]' : 'ml-[224px]'),
            !isWide && 'pb-[calc(var(--nav-height)+env(safe-area-inset-bottom))]',
          )}
        >
          <Outlet />
        </main>

        {!isWide && (
          <nav
            className="nav-shell fixed bottom-0 left-0 right-0 z-50 overflow-x-auto border-t border-[var(--glass-border)] shadow-[var(--shadow-2)] backdrop-blur-[var(--frost-blur-strong)]"
            style={{
              height: 'calc(var(--nav-height) + env(safe-area-inset-bottom))',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
            role="navigation"
            aria-label={t('nav.main')}
          >
            <div className="flex h-[var(--nav-height)] min-w-full items-center gap-1 px-2">
              {visibleItems.map(item => renderNavButton(item, true))}
              {renderNavButton(SETTINGS_ITEM, true)}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
