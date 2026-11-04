import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { createMemoryStorage, installDom } from './helpers';
import { useTemplateStore } from '../../src/stores/templates';

let dom: ReturnType<typeof installDom>;
let storeWrites: Array<[string, unknown]>;

function resetTemplates(): void {
  useTemplateStore.setState({ items: [], initialized: false });
}

beforeAll(() => {
  dom = installDom();
});

afterAll(() => {
  dom.window.close();
});

beforeEach(() => {
  const storage = createMemoryStorage();
  storeWrites = [];
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(window, 'store', {
    configurable: true,
    value: {
      get: async () => undefined,
      set: async (key: string, value: unknown) => {
        storeWrites.push([key, value]);
      },
      getAll: async () => ({}),
    } satisfies StoreApi,
  });
  resetTemplates();
});

describe('template store', () => {
  test('adds, updates, sorts and persists templates', () => {
    const first = useTemplateStore.getState().addItem({
      title: 'Fast IO',
      language: 'cpp',
      category: 'IO',
      content: 'ios::sync_with_stdio(false);',
    });
    const second = useTemplateStore.getState().addItem({
      title: 'Segment tree',
      language: 'cpp',
      category: 'Data structures',
      content: 'struct SegTree {};',
    });

    expect(useTemplateStore.getState().items.map(item => item.id)).toEqual([second.id, first.id]);
    expect(storeWrites.some(([key]) => key === 'templates')).toBe(true);

    const updated = useTemplateStore.getState().updateItem(first.id, {
      title: 'Fast IO v2',
      language: 'cpp',
      category: 'IO',
      content: 'scanf("%d", &x);',
    });
    expect(updated).toMatchObject({ title: 'Fast IO v2', content: 'scanf("%d", &x);' });
    expect(useTemplateStore.getState().items.find(item => item.id === first.id)?.title).toBe(
      'Fast IO v2',
    );

    useTemplateStore.getState().removeItem(second.id);
    expect(useTemplateStore.getState().items.map(item => item.id)).toEqual([first.id]);
  });

  test('loads persisted templates and filters malformed entries', async () => {
    Object.defineProperty(window, 'store', {
      configurable: true,
      value: {
        get: async () => [
          {
            id: 't1',
            title: 'DSU',
            language: 'cpp',
            category: 'Graph',
            content: 'int parent[N];',
            createdAt: 1,
            updatedAt: 2,
          },
          { id: 'broken' },
        ],
        set: async () => {},
        getAll: async () => ({}),
      } satisfies StoreApi,
    });
    await useTemplateStore.getState().init();
    expect(useTemplateStore.getState().items).toHaveLength(1);
    expect(useTemplateStore.getState().items[0].title).toBe('DSU');
    expect(useTemplateStore.getState().initialized).toBe(true);
  });
});
