import { describe, it, expect } from 'bun:test';
import { createPinia, setActivePinia } from 'pinia';
import { useContestStore } from '../../src/stores/contest';
import { useUiStore } from '../../src/stores/ui';

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
}

describe('设置默认值', () => {
  it('首次初始化应使用默认回溯周期 7 天', () => {
    const storage = createMemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

    setActivePinia(createPinia());
    const store = useContestStore();
    expect(store.day).toBe(7);
  });

  it('暗色模式开启时应写入 data-theme=dark', () => {
    const storage = createMemoryStorage();
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

    const documentElement = { dataset: {} as Record<string, string> };
    Object.defineProperty(globalThis, 'document', { value: { documentElement }, configurable: true });

    setActivePinia(createPinia());
    const ui = useUiStore();
    ui.setColorMode('dark');
    expect((document as any).documentElement.dataset.theme).toBe('dark');
  });
});

