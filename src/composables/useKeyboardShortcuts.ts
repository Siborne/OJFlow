import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

export interface KeyboardShortcutOptions {
  /** Enable Ctrl+R for refresh */
  onRefresh?: () => void;
  /** Enable Escape to close modals */
  onEscape?: () => void;
  /** Enable Ctrl+F for search/filter */
  onSearch?: () => void;
}

/**
 * Composable for keyboard shortcuts in the navigation shell.
 * Shortcuts:
 *   Ctrl+1..4 — navigate to tab 1-4
 *   Ctrl+R    — refresh (custom handler)
 *   Escape    — close modal (custom handler)
 *   Ctrl+F    — search/filter (custom handler)
 */
export function useKeyboardShortcuts(options: KeyboardShortcutOptions = {}) {
  const router = useRouter();

  const routes = ['/contest', '/star', '/service', '/setting'];

  const handler = (e: KeyboardEvent) => {
    const isCtrl = e.ctrlKey || e.metaKey;

    // Ctrl+1..4: navigate tabs
    if (isCtrl && e.key >= '1' && e.key <= '4') {
      e.preventDefault();
      const idx = parseInt(e.key) - 1;
      if (routes[idx]) {
        router.push(routes[idx]);
      }
      return;
    }

    // Ctrl+R: refresh
    if (isCtrl && e.key === 'r') {
      e.preventDefault();
      options.onRefresh?.();
      return;
    }

    // Ctrl+F: search/filter
    if (isCtrl && e.key === 'f') {
      e.preventDefault();
      options.onSearch?.();
      return;
    }

    // Escape: close modal
    if (e.key === 'Escape') {
      options.onEscape?.();
      return;
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handler);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handler);
  });
}
