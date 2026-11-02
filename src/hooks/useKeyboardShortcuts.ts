import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export interface KeyboardShortcutOptions {
  onRefresh?: () => void;
  onEscape?: () => void;
  onSearch?: () => void;
  enabled?: boolean;
  routes?: string[];
}

const DEFAULT_ROUTES = ['/contest', '/star', '/service', '/setting'];

export function useKeyboardShortcuts(options: KeyboardShortcutOptions = {}) {
  const navigate = useNavigate();
  const { enabled = true, routes = DEFAULT_ROUTES } = options;
  const { onRefresh, onEscape, onSearch } = options;

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (routes[idx]) navigate(routes[idx]);
        return;
      }

      if (isCtrl && e.key === 'r') {
        e.preventDefault();
        onRefresh?.();
        return;
      }

      if (isCtrl && (e.key === 'f' || e.key === 'k')) {
        e.preventDefault();
        onSearch?.();
        return;
      }

      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, navigate, onEscape, onRefresh, onSearch, routes]);
}
