import { describe, expect, mock, test } from 'bun:test';
import { IPC_CHANNELS } from '../../shared/ipc-channels';

type InvokeCall = { channel: string; args: unknown[] };
type Listener = (...args: unknown[]) => void;

type ExposedApi = Record<string, (...args: unknown[]) => unknown>;

const exposed = new Map<string, ExposedApi>();
const invokes: InvokeCall[] = [];
const listeners = new Map<string, Set<Listener>>();

mock.module('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (name: string, api: ExposedApi) => {
      exposed.set(name, api);
    },
  },
  ipcRenderer: {
    invoke: async (channel: string, ...args: unknown[]) => {
      invokes.push({ channel, args });
      return { queued: true };
    },
    on: (channel: string, listener: Listener) => {
      const bucket = listeners.get(channel) ?? new Set<Listener>();
      bucket.add(listener);
      listeners.set(channel, bucket);
    },
    removeListener: (channel: string, listener: Listener) => {
      listeners.get(channel)?.delete(listener);
    },
  },
}));

await import('../../electron/preload');

function api(): ExposedApi {
  return exposed.get('api') ?? {};
}

function storeApi(): ExposedApi {
  return exposed.get('store') ?? {};
}

describe('preload bridge', () => {
  test('exposes whitelisted API and store namespaces', () => {
    expect(exposed.has('api')).toBe(true);
    expect(exposed.has('store')).toBe(true);
    expect(api()).not.toHaveProperty('ipcRenderer');
    expect(Object.keys(api())).toContain('getRecentContests');
    expect(Object.keys(storeApi())).toEqual(['get', 'set', 'getAll']);
  });

  test('forwards invocations with expected channel payloads', async () => {
    await api().getRecentContests(7);
    await api().getRating('Codeforces', 'u');
    await api().getSolvedNum('QOJ', 'v');
    await api().openUrl('https://example.com');
    await api().installUpdate('https://example.com/app.exe');
    await api().searchProblems({ query: 'dp' });
    await api().getCodeforcesReport('tourist');
    await api().listPracticeProblems();
    await api().createPracticeProblem({ name: 'Manual' });
    await api().updatePracticeProblem('p1', { status: 'practicing' });
    await api().deletePracticeProblem('p1');
    await api().getCompanionStatus();
    await api().copyText('sample');
    await api().clearCache();
    await api().minimizeWindow();
    await api().toggleMaximizeWindow();
    await api().closeWindow();
    await api().getWindowState();
    await api().getAutoLaunch();
    await api().setAutoLaunch(true);
    await api().setGlobalTemplateShortcut('CommandOrControl+Shift+T');
    await api().setNotification({ enabled: true, reminderMinutes: 15 });
    await api().getNotification();
    await storeApi().get('ui');
    await storeApi().set('ui.appMode', 'full');
    await storeApi().getAll();

    expect(invokes).toContainEqual({ channel: IPC_CHANNELS.GET_CONTESTS, args: [7] });
    expect(invokes).toContainEqual({
      channel: IPC_CHANNELS.GET_RATING,
      args: [{ platform: 'Codeforces', name: 'u' }],
    });
    expect(invokes).toContainEqual({
      channel: IPC_CHANNELS.SEARCH_PROBLEMS,
      args: [{ query: 'dp' }],
    });
    expect(invokes).toContainEqual({
      channel: IPC_CHANNELS.STORE_SET,
      args: ['ui.appMode', 'full'],
    });
    expect(invokes).toContainEqual({
      channel: IPC_CHANNELS.UPDATE_PRACTICE_PROBLEM,
      args: ['p1', { status: 'practicing' }],
    });
    expect(invokes).toContainEqual({
      channel: IPC_CHANNELS.CREATE_PRACTICE_PROBLEM,
      args: [{ name: 'Manual' }],
    });
    expect(invokes).toContainEqual({
      channel: IPC_CHANNELS.COPY_TEXT,
      args: ['sample'],
    });
    expect(invokes).toContainEqual({ channel: IPC_CHANNELS.WINDOW_MINIMIZE, args: [] });
    expect(invokes).toContainEqual({ channel: IPC_CHANNELS.WINDOW_CLOSE, args: [] });
    expect(invokes).toContainEqual({ channel: IPC_CHANNELS.AUTO_LAUNCH_SET, args: [true] });
    expect(invokes).toContainEqual({
      channel: IPC_CHANNELS.SET_TEMPLATE_SHORTCUT,
      args: ['CommandOrControl+Shift+T'],
    });
  });

  test('subscribes and unsubscribes streaming listeners', () => {
    const partials: unknown[] = [];
    const unsubscribe = api().onContestsPartial((payload: unknown) =>
      partials.push(payload),
    ) as () => void;
    const bucket = listeners.get(IPC_CHANNELS.CONTESTS_PARTIAL);
    expect(bucket?.size).toBe(1);
    for (const listener of bucket ?? []) {
      listener({}, { day: 7, platform: 'A', contests: [] });
    }
    expect(partials).toEqual([{ day: 7, platform: 'A', contests: [] }]);
    unsubscribe();
    expect(bucket?.size).toBe(0);
  });

  test('subscribes and unsubscribes tray refresh listener', () => {
    let calls = 0;
    const unsubscribe = api().onRefreshContestsRequested(() => {
      calls++;
    }) as () => void;
    for (const listener of listeners.get(IPC_CHANNELS.REFRESH_CONTESTS) ?? []) listener();
    expect(calls).toBe(1);
    unsubscribe();
    expect(listeners.get(IPC_CHANNELS.REFRESH_CONTESTS)?.size).toBe(0);
  });

  test('subscribes and unsubscribes window state updates', () => {
    const states: Array<{ maximized: boolean }> = [];
    const unsubscribe = api().onWindowStateChanged((state: unknown) =>
      states.push(state as { maximized: boolean }),
    ) as () => void;
    for (const listener of listeners.get(IPC_CHANNELS.WINDOW_STATE_CHANGED) ?? []) {
      listener({}, { maximized: true });
    }
    expect(states).toEqual([{ maximized: true }]);
    unsubscribe();
    expect(listeners.get(IPC_CHANNELS.WINDOW_STATE_CHANGED)?.size).toBe(0);
  });

  test('subscribes and unsubscribes practice import events', () => {
    const imported: unknown[] = [];
    const unsubscribe = api().onPracticeImported((problem: unknown) =>
      imported.push(problem),
    ) as () => void;
    for (const listener of listeners.get(IPC_CHANNELS.PRACTICE_IMPORTED) ?? []) {
      listener({}, { id: 'p1', name: 'A' });
    }
    expect(imported).toEqual([{ id: 'p1', name: 'A' }]);
    unsubscribe();
    expect(listeners.get(IPC_CHANNELS.PRACTICE_IMPORTED)?.size).toBe(0);
  });

  test('subscribes and unsubscribes app navigation events', () => {
    const paths: string[] = [];
    const unsubscribe = api().onNavigateTo((path: unknown) =>
      paths.push(String(path)),
    ) as () => void;
    for (const listener of listeners.get(IPC_CHANNELS.NAVIGATE_TO) ?? []) {
      listener({}, '/templates');
    }
    expect(paths).toEqual(['/templates']);
    unsubscribe();
    expect(listeners.get(IPC_CHANNELS.NAVIGATE_TO)?.size).toBe(0);
  });
});
