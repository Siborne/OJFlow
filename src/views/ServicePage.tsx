import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import {
  Archive,
  ChevronRight,
  Trophy,
  BarChart3,
  FileText,
  Inbox,
  LibraryBig,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui';
import type { AppFeatures } from '../../shared/types';
import { useI18n, type MessageKey } from '@/i18n';

interface ServiceItem {
  titleKey: MessageKey;
  descKey: MessageKey;
  path: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  available: boolean;
  feature?: keyof AppFeatures;
  fullOnly?: boolean;
}

const ALL_SERVICES: ServiceItem[] = [
  {
    titleKey: 'service.problemsTitle',
    descKey: 'service.problemsDesc',
    path: '/problems',
    icon: LibraryBig,
    iconBg: 'linear-gradient(135deg, #ccfbf1 0%, #5eead4 100%)',
    iconColor: '#0f766e',
    available: true,
    feature: 'enableProblemSearch',
  },
  {
    titleKey: 'service.practiceTitle',
    descKey: 'service.practiceDesc',
    path: '/practice',
    icon: Inbox,
    iconBg: 'linear-gradient(135deg, #e0f2fe 0%, #7dd3fc 100%)',
    iconColor: '#0369a1',
    available: true,
  },
  {
    titleKey: 'service.solvedTitle',
    descKey: 'service.solvedDesc',
    path: '/solved_num',
    icon: BarChart3,
    iconBg: 'linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%)',
    iconColor: '#059669',
    available: true,
  },
  {
    titleKey: 'service.ratingTitle',
    descKey: 'service.ratingDesc',
    path: '/rating',
    icon: Trophy,
    iconBg: 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)',
    iconColor: '#2563eb',
    available: true,
  },
  {
    titleKey: 'service.archiveTitle',
    descKey: 'service.archiveDesc',
    path: '/archive',
    icon: Archive,
    iconBg: 'linear-gradient(135deg, #fce7f3 0%, #f9a8d4 100%)',
    iconColor: '#db2777',
    available: true,
    feature: 'enableExternalTools',
    fullOnly: true,
  },
  {
    titleKey: 'service.reportTitle',
    descKey: 'service.reportDesc',
    path: '/cf_report',
    icon: FileText,
    iconBg: 'linear-gradient(135deg, #fef9c3 0%, #fde047 100%)',
    iconColor: '#ca8a04',
    available: true,
    feature: 'enableCfReport',
    fullOnly: true,
  },
];

export default function ServicePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const appMode = useUiStore(state => state.appMode);
  const features = useUiStore(state => state.features);
  const availableServices = useMemo(
    () =>
      ALL_SERVICES.filter(
        service =>
          service.available &&
          (!service.fullOnly || appMode === 'full') &&
          (!service.feature || features[service.feature]),
      ),
    [appMode, features],
  );
  const upcomingServices = useMemo(() => ALL_SERVICES.filter(service => !service.available), []);

  const renderCard = (item: ServiceItem, idx: number, disabled?: boolean) => {
    const Icon = item.icon;
    return (
      <div
        key={item.titleKey}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && navigate(item.path)}
        onKeyDown={e => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            navigate(item.path);
          }
        }}
        className={cn(
          'group relative overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--card-bg)] shadow-[var(--card-shadow)] transition-all',
          disabled
            ? 'cursor-default border-dashed opacity-58 shadow-none'
            : 'cursor-pointer border-[var(--card-border)] hover:-translate-y-0.5 hover:shadow-[var(--card-shadow-hover)] hover:border-[var(--color-primary)] active:translate-y-0 active:scale-[0.99]',
        )}
        style={{ animationDelay: `${idx * 20}ms` }}
      >
        {!disabled && (
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-success)] opacity-0 transition-opacity group-hover:opacity-100" />
        )}
        <div className="flex items-center gap-3 px-5 py-4">
          <div
            className={cn(
              'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-transform group-hover:scale-106',
              disabled && 'opacity-70',
            )}
            style={{ background: item.iconBg }}
          >
            <Icon size={26} color={item.iconColor} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-base font-[620] text-[var(--color-text)]">
              {t(item.titleKey)}
            </span>
            <span className="truncate text-[11px] text-[var(--color-text-muted)]">
              {t(item.descKey)}
            </span>
          </div>
          {disabled ? (
            <span className="flex-shrink-0 rounded bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
              {t('service.pending')}
            </span>
          ) : (
            <ChevronRight
              size={18}
              className="flex-shrink-0 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--color-primary)]"
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      <PageHeader title={t('service.title')} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-5">
          <span className="mb-3 block text-[13px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {t('service.available')}
          </span>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3 max-md:grid-cols-1">
            {availableServices.map((item, idx) => renderCard(item, idx))}
          </div>
        </div>
        {upcomingServices.length > 0 && (
          <div>
            <span className="mb-3 block text-[13px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              {t('service.upcoming')}
            </span>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3 max-md:grid-cols-1">
              {upcomingServices.map((item, idx) => renderCard(item, idx, true))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
