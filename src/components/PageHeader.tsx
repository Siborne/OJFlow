import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div className="app-bar flex h-[68px] flex-shrink-0 items-center justify-between border-b border-[var(--glass-border)] px-5 backdrop-blur-[var(--frost-blur-strong)]">
      <div className="flex items-center gap-3">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-[var(--color-primary-weak)] shadow-[var(--clay-inset)]"
          aria-hidden="true"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-[image:var(--gradient-primary)] shadow-[0_0_14px_var(--glow-primary)]" />
        </span>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">
            OJFlow
          </div>
          <h2 className="text-lg font-[700] tracking-[-0.025em]">{title}</h2>
        </div>
      </div>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}
