import { cn } from '@/lib/utils';

const TABS = [
  { id: 'today', label: '今天' },
  { id: 'tomorrow', label: '明天' },
  { id: 'thisWeek', label: '本周' },
  { id: 'all', label: '全部' },
];

interface ContestDateTabsProps {
  value: string;
  onChange: (value: string) => void;
}

export function ContestDateTabs({ value, onChange }: ContestDateTabsProps) {
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const isActive = value === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-[var(--motion-base)]',
                isActive
                  ? 'bg-[rgba(255,161,22,0.12)] text-[var(--color-primary)] font-semibold'
                  : 'text-[var(--color-text-muted)] hover:bg-[rgba(255,161,22,0.08)] hover:text-[var(--color-text)]',
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--color-primary)]" />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
