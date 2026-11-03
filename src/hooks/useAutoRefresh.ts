import { useEffect, useRef } from 'react';
import type { AutoRefreshModule } from '../../shared/types';
import { useUiStore } from '@/stores/ui';

export function useModuleAutoRefresh(module: AutoRefreshModule, callback: () => void): boolean {
  const autoRefresh = useUiStore(state => state.autoRefresh);
  const callbackRef = useRef(callback);
  const enabled = autoRefresh.enabled && autoRefresh.modules[module];

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(
      () => callbackRef.current(),
      Math.max(1, autoRefresh.intervalMinutes) * 60_000,
    );
    return () => window.clearInterval(timer);
  }, [autoRefresh.intervalMinutes, enabled]);

  return enabled;
}
