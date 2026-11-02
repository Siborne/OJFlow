import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

const TABS = [
  { id: 'today', key: 'common.today' },
  { id: 'tomorrow', key: 'common.tomorrow' },
  { id: 'thisWeek', key: 'common.thisWeek' },
  { id: 'all', key: 'common.all' },
] as const;

interface ContestDateTabsProps {
  value: string;
  onChange: (value: string) => void;
}

export function ContestDateTabs({ value, onChange }: ContestDateTabsProps) {
  const { t } = useI18n();
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map(tab => {
          const isActive = value === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-[var(--motion-base)]',
                isActive
                  ? 'bg-[var(--color-primary-weak)] text-[var(--color-primary)] font-semibold shadow-[var(--clay-inset)]'
                  : 'text-[var(--color-text-muted)] hover:-translate-y-0.5 hover:bg-[var(--color-primary-weak)] hover:text-[var(--color-text)]',
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--color-primary)]" />
              )}
              <span className="relative z-10">{t(tab.key)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
