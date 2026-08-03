import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export interface KeyboardShortcutOptions {
  onRefresh?: () => void;
  onEscape?: () => void;
  onSearch?: () => void;
}

const ROUTES = ['/contest', '/star', '/service', '/setting'];

export function useKeyboardShortcuts(options: KeyboardShortcutOptions = {}) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key >= '1' && e.key <= '4') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (ROUTES[idx]) navigate(ROUTES[idx]);
        return;
      }

      if (isCtrl && e.key === 'r') {
        e.preventDefault();
        options.onRefresh?.();
        return;
      }

      if (isCtrl && e.key === 'f') {
        e.preventDefault();
        options.onSearch?.();
        return;
      }

      if (e.key === 'Escape') {
        options.onEscape?.();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, options.onRefresh, options.onEscape, options.onSearch]);
}
