import { cn } from '@/lib/utils';

interface DataDonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DataDonutProps {
  segments: DataDonutSegment[];
  centerLabel: string;
  centerValue: string | number;
  size?: number;
  className?: string;
}

export function DataDonut({
  segments,
  centerLabel,
  centerValue,
  size = 180,
  className,
}: DataDonutProps) {
  const total = Math.max(
    1,
    segments.reduce((sum, segment) => sum + segment.value, 0),
  );
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${centerLabel}: ${centerValue}`}
    >
      <svg viewBox="0 0 100 100" className="-rotate-90" width={size} height={size}>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--color-surface-muted)"
          strokeWidth="10"
        />
        {segments.map(segment => {
          const length = (segment.value / total) * circumference;
          const dashOffset = -offset;
          offset += length;
          return (
            <circle
              key={segment.label}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(0, length - 2)} ${circumference}`}
              strokeDashoffset={dashOffset}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <strong className="text-3xl font-[760] tracking-[-0.05em] text-[var(--color-text)]">
          {centerValue}
        </strong>
        <span className="mt-1 max-w-[80px] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}
