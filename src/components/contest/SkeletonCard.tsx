interface SkeletonCardProps {
  rows?: number;
}

export function SkeletonCard({ rows = 3 }: SkeletonCardProps) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 mb-3">
      <div className="mb-4">
        <div className="h-3 w-[30%] rounded-[6px] bg-[var(--color-surface-muted)] animate-pulse" />
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3.5">
            <div className="h-8 w-8 rounded-lg bg-[var(--color-surface-muted)] animate-pulse" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3 w-[85%] rounded-[6px] bg-[var(--color-surface-muted)] animate-pulse" />
              <div className="h-3 w-[60%] rounded-[6px] bg-[var(--color-surface-muted)] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
