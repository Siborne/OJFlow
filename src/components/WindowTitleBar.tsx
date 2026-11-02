import { useEffect, useState } from 'react';
import { Maximize2, Minimize2, Minus, X } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

const appLogo = new URL('../assets/icon.png', import.meta.url).href;

export function WindowTitleBar() {
  const { t } = useI18n();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let active = true;
    window.api
      .getWindowState()
      .then(state => {
        if (active) setMaximized(state.maximized);
      })
      .catch(() => {});
    const unsubscribe = window.api.onWindowStateChanged(state => setMaximized(state.maximized));
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <header
      className="window-titlebar flex h-9 shrink-0 select-none items-center border-b border-[var(--glass-border)] bg-[var(--nav-bg-color)] px-3 backdrop-blur-[var(--frost-blur-strong)]"
      onDoubleClick={() => void window.api.toggleMaximizeWindow()}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <img
          src={appLogo}
          alt=""
          className="h-5 w-5 rounded-[6px] border border-[var(--glass-border)] object-cover"
        />
        <span className="text-[11px] font-[760] tracking-[-0.02em] text-[var(--color-text)]">
          OJFlow
        </span>
        <span className="hidden text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)] sm:inline">
          Practice Studio
        </span>
      </div>

      <div
        className="window-controls ml-3 flex self-stretch"
        onDoubleClick={event => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => void window.api.minimizeWindow()}
          className="window-control-button"
          aria-label={t('window.minimize')}
          title={t('window.minimize')}
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          onClick={() => void window.api.toggleMaximizeWindow()}
          className="window-control-button"
          aria-label={maximized ? t('window.restore') : t('window.maximize')}
          title={maximized ? t('window.restore') : t('window.maximize')}
        >
          {maximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
        <button
          type="button"
          onClick={() => void window.api.closeWindow()}
          className={cn('window-control-button window-control-close')}
          aria-label={t('window.close')}
          title={t('window.close')}
        >
          <X size={15} />
        </button>
      </div>
    </header>
  );
}
