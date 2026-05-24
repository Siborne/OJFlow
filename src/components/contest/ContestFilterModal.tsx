import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ContestFilterModalProps {
  show: boolean;
  showEmptyDay: boolean;
  selectedPlatforms: Record<string, boolean>;
  platforms: string[];
  onClose: () => void;
  onToggleShowEmptyDay: (value: boolean) => void;
  onTogglePlatform: (platform: string, value: boolean) => void;
}

export function ContestFilterModal({
  show,
  showEmptyDay,
  selectedPlatforms,
  platforms,
  onClose,
  onToggleShowEmptyDay,
  onTogglePlatform,
}: ContestFilterModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-text)]">筛选平台</h3>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Switch
              checked={showEmptyDay}
              onCheckedChange={onToggleShowEmptyDay}
              id="show-empty-day"
            />
            <Label htmlFor="show-empty-day" className="text-sm text-[var(--color-text)] cursor-pointer">
              显示无赛程日
            </Label>
          </div>

          <div className="h-px bg-[var(--color-border)]" />

          {platforms.map((platform) => (
            <label key={platform} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={selectedPlatforms[platform] ?? true}
                onChange={(e) => onTogglePlatform(platform, e.target.checked)}
                className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)] accent-[var(--color-primary)]"
              />
              <span className="text-sm text-[var(--color-text)]">{platform}</span>
            </label>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-[var(--radius-sm)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          关闭
        </button>
      </div>
    </div>
  );
}
