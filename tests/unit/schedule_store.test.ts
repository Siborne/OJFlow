import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { createContest, createMemoryStorage, installDom } from './helpers';
import { useScheduleStore } from '../../src/stores/schedule';

let dom: ReturnType<typeof installDom>;
let storage: Storage;
let storeWrites: Array<[string, unknown]>;

function resetSchedule(): void {
  useScheduleStore.setState({ items: [], initialized: false });
}

beforeAll(() => {
  dom = installDom();
});

afterAll(() => {
  dom.window.close();
});

beforeEach(() => {
  storage = createMemoryStorage();
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
  resetSchedule();
});

describe('schedule store', () => {
  test('adds, sorts, persists and completes schedule items', () => {
    const later = useScheduleStore.getState().addItem({
      title: 'Later review',
      startsAt: '2026-11-05T20:00',
      durationMinutes: 60,
      kind: 'review',
      note: 'review notes',
    });
    const earlier = useScheduleStore.getState().addItem({
      title: 'Practice DP',
      startsAt: '2026-11-03T19:00',
      durationMinutes: 90,
      kind: 'practice',
    });

    expect(useScheduleStore.getState().items.map(item => item.title)).toEqual([
      'Practice DP',
      'Later review',
    ]);
    expect(JSON.parse(localStorage.getItem('ojflow_schedule') ?? '[]')).toHaveLength(2);
    expect(storeWrites.some(([key]) => key === 'schedule')).toBe(true);

    useScheduleStore.getState().toggleCompleted(earlier.id);
    expect(useScheduleStore.getState().items[0].completed).toBe(true);

    useScheduleStore.getState().removeItem(later.id);
    expect(useScheduleStore.getState().items.map(item => item.id)).toEqual([earlier.id]);
  });

  test('loads persisted items and filters malformed entries', async () => {
    Object.defineProperty(window, 'store', {
      configurable: true,
      value: {
        get: async () => [
          {
            id: 'persisted',
            title: 'Persisted plan',
            startsAt: '2026-12-01T10:00',
            durationMinutes: 30,
            kind: 'custom',
            completed: false,
            createdAt: 1,
          },
          { id: 'broken' },
        ],
        set: async () => {},
        getAll: async () => ({}),
      } satisfies StoreApi,
    });

    await useScheduleStore.getState().init();
    expect(useScheduleStore.getState().items).toHaveLength(1);
    expect(useScheduleStore.getState().items[0].title).toBe('Persisted plan');
    expect(useScheduleStore.getState().initialized).toBe(true);
  });

  test('links and unlinks favorite contests automatically', () => {
    const contest = createContest('Linked Round', 1_900_000_000);
    useScheduleStore.getState().syncFavoriteContest(contest, true);
    expect(useScheduleStore.getState().items).toHaveLength(1);
    expect(useScheduleStore.getState().items[0]).toMatchObject({
      title: 'Linked Round',
      kind: 'contest',
      autoCreated: true,
    });

    useScheduleStore.getState().syncFavoriteContest(contest, true);
    expect(useScheduleStore.getState().items).toHaveLength(1);

    useScheduleStore.getState().syncFavoriteContest(contest, false);
    expect(useScheduleStore.getState().items).toHaveLength(0);
  });
});
