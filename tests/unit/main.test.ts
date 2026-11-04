import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { flushPromises, jsonResponse } from './helpers';
import { IPC_CHANNELS } from '../../shared/ipc-channels';

type Handler = (event: unknown, ...args: unknown[]) => unknown;

const handlers = new Map<string, Handler>();
const openedUrls: string[] = [];
const openedPaths: string[] = [];
const appEventHandlers = new Map<string, (...args: unknown[]) => void>();
const windowOpenHandlers: Array<(details: { url: string }) => { action: string }> = [];
const closeHandlers: Array<(event: { preventDefault: () => void }) => void> = [];
let lastBrowserWindow: FakeBrowserWindow | undefined;
let notificationSet: unknown;
let loginItemSettings: { openAtLogin: boolean; path?: string; args?: string[] } = {
  openAtLogin: false,
};
let dialogResponse = 1;
let dialogCalls = 0;
let mainModule: typeof import('../../electron/main');
let practiceModule: typeof import('../../electron/services/practice-service');
let copiedText = '';
const registeredShortcuts = new Map<string, () => void>();
const unregisteredShortcuts: string[] = [];

process.env.OJFLOW_DISABLE_COMPANION_SERVER = '1';

class FakeElectronStore {
  private data: Record<string, unknown>;
  constructor(options: { defaults?: Record<string, unknown> }) {
    this.data = structuredClone(options.defaults ?? {});
  }
  get(key: string): unknown {
    let value: unknown = this.data;
    for (const part of key.split('.')) {
      if (!value || typeof value !== 'object') return undefined;
      value = (value as Record<string, unknown>)[part];
    }
    return structuredClone(value);
  }
  set(key: string, value: unknown): void {
    const parts = key.split('.');
    let current = this.data;
    for (const part of parts.slice(0, -1)) {
      if (!current[part] || typeof current[part] !== 'object') current[part] = {};
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = structuredClone(value);
    if (key === 'notification') notificationSet = value;
  }
  get store(): Record<string, unknown> {
    return this.data;
  }
}

class FakeBrowserWindow {
  static windows: FakeBrowserWindow[] = [];
  static lastOptions: Record<string, unknown> | undefined;
  private maximized = false;
  private minimized = false;
  private hidden = false;
  private destroyed = false;
  private handlers = new Map<string, (...args: unknown[]) => void>();
  webContents = {
    send: (_channel: string, _payload?: unknown) => {},
    openDevTools: () => {},
    setWindowOpenHandler: (handler: (details: { url: string }) => { action: string }) => {
      windowOpenHandlers.push(handler);
    },
  };
  constructor(options?: Record<string, unknown>) {
    FakeBrowserWindow.lastOptions = options;
    FakeBrowserWindow.windows.push(this);
    FakeBrowserWindow.register(this);
  }
  private static register(window: FakeBrowserWindow) {
    lastBrowserWindow = window;
  }
  loadURL() {}
  loadFile() {}
  isDestroyed() {
    return this.destroyed;
  }
  minimize() {
    this.minimized = true;
  }
  maximize() {
    this.maximized = true;
    this.handlers.get('maximize')?.();
  }
  unmaximize() {
    this.maximized = false;
    this.handlers.get('unmaximize')?.();
  }
  isMaximized() {
    return this.maximized;
  }
  isMinimized() {
    return this.minimized;
  }
  isVisible() {
    return !this.hidden;
  }
  hide() {
    this.hidden = true;
  }
  show() {
    this.hidden = false;
  }
  focus() {}
  close() {
    let prevented = false;
    const handler = this.handlers.get('close');
    handler?.({
      preventDefault: () => {
        prevented = true;
      },
    });
    if (!prevented) this.destroyed = true;
  }
  on(event: string, handler: (event: { preventDefault: () => void }) => void) {
    this.handlers.set(event, handler as (...args: unknown[]) => void);
    if (event === 'close') closeHandlers.push(handler);
  }
  static getAllWindows() {
    return FakeBrowserWindow.windows;
  }
}

mock.module('electron-store', () => ({ default: FakeElectronStore }));
mock.module('../../electron/services/tray', () => ({
  createTray: () => ({}),
  scheduleContestReminders: async () => {},
  destroyTray: () => {},
}));
mock.module('electron', () => ({
  app: {
    isPackaged: false,
    whenReady: () => Promise.resolve(),
    on: (event: string, handler: (...args: unknown[]) => void) => {
      appEventHandlers.set(event, handler);
    },
    quit: () => {},
    setPath: () => {},
    getPath: () => tmpdir(),
    getVersion: () => '1.2.0',
    getLoginItemSettings: () => loginItemSettings,
    setLoginItemSettings: (settings: typeof loginItemSettings) => {
      loginItemSettings = settings;
    },
  },
  BrowserWindow: FakeBrowserWindow,
  ipcMain: {
    handle: (channel: string, handler: Handler) => handlers.set(channel, handler),
  },
  shell: {
    openExternal: async (url: string) => {
      openedUrls.push(url);
    },
    openPath: async (filePath: string) => {
      openedPaths.push(filePath);
      return '';
    },
  },
  dialog: {
    showMessageBox: async () => {
      dialogCalls++;
      return { response: dialogResponse };
    },
  },
  clipboard: {
    writeText: (text: string) => {
      copiedText = text;
    },
  },
  nativeImage: {
    createFromPath: () => ({ resize: () => ({}) }),
  },
  globalShortcut: {
    register: (accelerator: string, callback: () => void) => {
      if (registeredShortcuts.has(accelerator)) return false;
      registeredShortcuts.set(accelerator, callback);
      return true;
    },
    unregister: (accelerator: string) => {
      unregisteredShortcuts.push(accelerator);
      registeredShortcuts.delete(accelerator);
    },
    unregisterAll: () => {
      registeredShortcuts.clear();
    },
  },
  Menu: {
    buildFromTemplate: (template: unknown) => template,
  },
  Tray: class {
    setToolTip() {}
    setContextMenu() {}
    on() {}
    destroy() {}
  },
  Notification: class {
    static isSupported() {
      return true;
    }
    show() {}
  },
}));

const originalSetTimeout = globalThis.setTimeout;

beforeAll(async () => {
  globalThis.setTimeout = ((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
    if (Number(delay) >= 5000) return 1 as unknown as ReturnType<typeof setTimeout>;
    return originalSetTimeout(callback, delay, ...args);
  }) as typeof setTimeout;
  mainModule = await import('../../electron/main');
  practiceModule = await import('../../electron/services/practice-service');
  await flushPromises();
});

afterAll(() => {
  globalThis.setTimeout = originalSetTimeout;
});

async function invoke(channel: string, ...args: unknown[]): Promise<unknown> {
  const handler = handlers.get(channel);
  if (!handler) throw new Error(`Missing handler: ${channel}`);
  return handler({}, ...args);
}

describe('electron main process wiring', () => {
  test('registers window, IPC, update listeners and app lifecycle', () => {
    expect(lastBrowserWindow).toBeDefined();
    expect(windowOpenHandlers).toHaveLength(1);
    expect(appEventHandlers.has('window-all-closed')).toBe(true);
    expect(appEventHandlers.has('before-quit')).toBe(true);
    expect(handlers.size).toBeGreaterThanOrEqual(13);
  });

  test('validates and opens external URLs', async () => {
    await expect(invoke('open-url', 'javascript:alert(1)' as never)).rejects.toThrow(
      'Invalid URL protocol',
    );
    await invoke('open-url', 'https://codeforces.com' as never);
    expect(openedUrls).toContain('https://codeforces.com');

    const handler = windowOpenHandlers[0];
    expect(handler({ url: 'file:///C:/Windows/system32/calc.exe' })).toEqual({ action: 'deny' });
    expect(openedUrls).not.toContain('file:///C:/Windows/system32/calc.exe');
  });

  test('validates updater URLs', async () => {
    await expect(
      invoke('updater-install', { url: 'http://example.com/app.exe' } as never),
    ).rejects.toThrow('Invalid update URL');
    await expect(
      invoke('updater-install', { url: 'file:///tmp/app.exe' } as never),
    ).rejects.toThrow('Invalid update URL');
  });

  test('validates persistent store keys', async () => {
    await expect(invoke('store-get', 'bad.key' as never)).rejects.toThrow('Invalid store key');
    await expect(invoke('store-set', '__proto__.x', 1 as never)).rejects.toThrow(
      'Invalid store key',
    );
    await expect(invoke('store-get', 'ui.themeScheme' as never)).resolves.toBe('ocean');
  });

  test('controls the frameless window and launch-at-login', async () => {
    expect(FakeBrowserWindow.lastOptions?.frame).toBe(false);
    await invoke(IPC_CHANNELS.WINDOW_MINIMIZE);
    expect(lastBrowserWindow?.isMinimized()).toBe(true);

    await invoke(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE);
    expect(lastBrowserWindow?.isMaximized()).toBe(true);
    await expect(invoke(IPC_CHANNELS.WINDOW_GET_STATE)).resolves.toEqual({ maximized: true });

    await invoke(IPC_CHANNELS.AUTO_LAUNCH_SET, true as never);
    expect(loginItemSettings.openAtLogin).toBe(true);
    await expect(invoke(IPC_CHANNELS.AUTO_LAUNCH_GET)).resolves.toBe(true);
  });

  test('respects tray and quit close behaviors', async () => {
    await invoke(IPC_CHANNELS.STORE_SET, 'ui.closeBehavior', 'tray' as never);
    await invoke(IPC_CHANNELS.WINDOW_CLOSE);
    expect(lastBrowserWindow?.isVisible()).toBe(false);
    expect(lastBrowserWindow?.isDestroyed()).toBe(false);

    await invoke(IPC_CHANNELS.STORE_SET, 'ui.closeBehavior', 'quit' as never);
    await invoke(IPC_CHANNELS.WINDOW_CLOSE);
    expect(lastBrowserWindow?.isDestroyed()).toBe(true);
  });

  test('validates notification settings', async () => {
    await expect(
      invoke('notification-set', { enabled: true, reminderMinutes: 0 } as never),
    ).rejects.toThrow('Invalid notification settings');
    await invoke('notification-set', { enabled: true, reminderMinutes: 30 } as never);
    expect(notificationSet).toEqual({ enabled: true, reminderMinutes: 30 });
  });

  test('returns an empty contest response for invalid day values', async () => {
    const response = (await invoke('get-recent-contests', Number.NaN as never)) as {
      contests: unknown[];
    };
    expect(response.contests).toEqual([]);
  });

  test('routes problem search and report requests through main services', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      jsonResponse({
        status: 'OK',
        result: {
          problems: [{ contestId: 1, index: 'A', name: 'A', rating: 800, tags: ['math'] }],
        },
      })) as unknown as typeof fetch;
    try {
      const result = (await invoke('search-problems', {
        platform: 'Codeforces',
        query: 'A',
        pageSize: 10,
      } as never)) as { total: number };
      expect(result.total).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }

    await expect(invoke('get-cf-report', 'bad/handle' as never)).rejects.toThrow('格式不正确');
  });

  test('manages the practice inbox and clipboard through IPC', async () => {
    const imported = practiceModule.importPracticeProblem({
      name: 'A. Practice Round',
      group: 'Codeforces Round',
      url: 'https://codeforces.com/contest/1/problem/A',
      tests: [{ input: '1 2', output: '3' }],
    });
    expect(imported).not.toBeNull();

    const listed = (await invoke(IPC_CHANNELS.LIST_PRACTICE_PROBLEMS)) as Array<{
      id: string;
      status: string;
    }>;
    expect(listed).toHaveLength(1);
    expect(listed[0].status).toBe('inbox');

    const updated = (await invoke(IPC_CHANNELS.UPDATE_PRACTICE_PROBLEM, listed[0].id, {
      status: 'practicing',
      notes: 'think',
    })) as { status: string; notes: string };
    expect(updated).toMatchObject({ status: 'practicing', notes: 'think' });

    await invoke(IPC_CHANNELS.COPY_TEXT, 'sample input');
    expect(copiedText).toBe('sample input');
    await expect(invoke(IPC_CHANNELS.GET_COMPANION_STATUS)).resolves.toEqual({
      running: false,
      port: null,
    });
    await expect(invoke(IPC_CHANNELS.DELETE_PRACTICE_PROBLEM, listed[0].id)).resolves.toBe(true);
  });

  test('creates manual practice problems and manages the template shortcut', async () => {
    const created = (await invoke(IPC_CHANNELS.CREATE_PRACTICE_PROBLEM, {
      name: 'Manual problem',
      group: 'Local',
      url: 'https://codeforces.com/contest/1/problem/A',
      tests: [{ input: '1', output: '2' }],
    })) as { id: string; name: string; code: string; codeLanguage: string };
    expect(created.name).toBe('Manual problem');
    expect(created.code).toBe('');
    expect(created.codeLanguage).toBe('cpp');

    const result = await invoke(IPC_CHANNELS.SET_SHORTCUT_SETTINGS, {
      enabled: true,
      accelerator: 'CommandOrControl+Shift+T',
      target: 'last',
    });
    expect(result).toEqual({ success: true });
    expect(registeredShortcuts.has(mainModule.normalizeTemplateShortcut('Ctrl+Shift+T'))).toBe(
      true,
    );
    await expect(
      invoke(IPC_CHANNELS.SET_SHORTCUT_SETTINGS, {
        enabled: true,
        accelerator: 'Bad+Shortcut',
        target: 'last',
      }),
    ).resolves.toEqual({
      success: false,
      error: 'Unsupported shortcut',
    });
  });

  test('clears cache and triggers quit cleanup', async () => {
    await expect(invoke('clear-cache' as never)).resolves.toBeUndefined();
    expect(() => appEventHandlers.get('window-all-closed')?.()).not.toThrow();
    expect(() => appEventHandlers.get('before-quit')?.()).not.toThrow();
    expect(closeHandlers).toHaveLength(1);
  });
});

describe('main process update helpers', () => {
  test('normalizes and compares semantic versions', () => {
    expect(mainModule.normalizeVersion(undefined)).toBe('v0.0.0');
    expect(mainModule.normalizeVersion('1.2.3')).toBe('v1.2.3');
    expect(mainModule.parseSemver('v1.2.3-beta')).toEqual([1, 2, 3]);
    expect(mainModule.compareVersions('v1.2.4', '1.2.3')).toBe(1);
    expect(mainModule.compareVersions('v1.2.3', '1.2.3')).toBe(0);
    expect(mainModule.compareVersions('v1.2.2', '1.2.3')).toBe(-1);
  });

  test('detects manifests and picks platform package URLs', () => {
    const plain = {
      version: 'v2.0.0',
      notes: 'notes',
      packages: { win32: { url: 'https://example.com/app.exe' } },
      packageUrl: 'https://example.com/default.exe',
    };
    expect(mainModule.detectManifest(null)).toBeNull();
    expect(mainModule.detectManifest({})).toBeNull();
    expect(mainModule.detectManifest(plain)).toEqual(plain);

    const github = mainModule.detectManifest({
      tag_name: 'v3.0.0',
      body: 'release',
      html_url: 'https://github.com/release',
      assets: [{ browser_download_url: 'https://example.com/app.exe' }],
    });
    expect(github).toMatchObject({ version: 'v3.0.0', packageUrl: 'https://example.com/app.exe' });
    expect(mainModule.pickPackageUrl(plain)).toBe(
      process.platform === 'win32'
        ? 'https://example.com/app.exe'
        : 'https://example.com/default.exe',
    );
  });

  test('classifies fetch errors and applies retries', async () => {
    expect(mainModule.classifyFetchError(new mainModule.TimeoutError('slow')).type).toBe('timeout');
    expect(mainModule.classifyFetchError({ name: 'AbortError' }).type).toBe('timeout');
    expect(mainModule.classifyFetchError(new Error('Failed to fetch')).type).toBe('network');
    expect(mainModule.classifyFetchError({ cause: { code: 'ENOTFOUND' } }).type).toBe('network');
    expect(mainModule.classifyFetchError(new Error('bad')).type).toBe('unknown');

    const originalFetch = globalThis.fetch;
    let attempts = 0;
    globalThis.fetch = (async () => {
      attempts++;
      if (attempts === 1) return new Response('down', { status: 503 });
      return jsonResponse({ ok: true });
    }) as unknown as typeof fetch;
    try {
      const result = await mainModule.fetchJsonWithRetry('https://example.com/update.json', {
        timeoutMs: 1000,
        retryCount: 2,
        backoffBaseMs: 1,
      });
      expect(result.ok).toBe(true);
      expect(result.payload).toEqual({ ok: true });
      expect(attempts).toBe(2);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('times out stalled requests', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => new Promise<Response>(() => {})) as unknown as typeof fetch;
    try {
      await expect(
        mainModule.fetchWithTimeout('https://example.com', {}, 10),
      ).rejects.toBeInstanceOf(mainModule.TimeoutError);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('loads .env without overriding existing values', async () => {
    const dotenvPath = `${tmpdir()}/ojflow-dotenv-${Date.now()}.env`;
    process.env.OJFLOW_DOTENV_TEST = 'existing';
    await fs.writeFile(
      dotenvPath,
      '# comment\nOJFLOW_DOTENV_TEST=replaced\nOJFLOW_DOTENV_NEW=added\n',
    );
    try {
      mainModule.loadDotEnv(dotenvPath);
      expect(process.env.OJFLOW_DOTENV_TEST).toBe('existing');
      expect(process.env.OJFLOW_DOTENV_NEW).toBe('added');
    } finally {
      delete process.env.OJFLOW_DOTENV_NEW;
      delete process.env.OJFLOW_DOTENV_TEST;
      await fs.unlink(dotenvPath);
    }
  });

  test('downloads a safe update package and opens it', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response('binary-data', { status: 200 })) as unknown as typeof fetch;
    try {
      await mainModule.downloadAndLaunch('https://example.com/OJFlow.exe');
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(openedPaths.some(path => path.includes('OJFlow-update-'))).toBe(true);
  });

  test('checks startup manifests and respects dialog choice', async () => {
    const originalFetch = globalThis.fetch;
    const previousManifest = process.env.VITE_UPDATE_MANIFEST_URL;
    const previousVersion = process.env.VITE_APP_VERSION;
    process.env.VITE_UPDATE_MANIFEST_URL = 'https://example.com/update.json';
    process.env.VITE_APP_VERSION = '1.0.0';
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      if (String(url).endsWith('update.json')) {
        return jsonResponse({
          version: 'v1.1.0',
          notes: 'new',
          packageUrl: 'https://example.com/OJFlow.exe',
        });
      }
      return new Response('binary', { status: 200 });
    }) as unknown as typeof fetch;

    try {
      dialogResponse = 1;
      const beforeDialogs = dialogCalls;
      await mainModule.checkForUpdatesOnStartup(lastBrowserWindow as never);
      expect(dialogCalls).toBe(beforeDialogs + 1);

      dialogResponse = 0;
      await mainModule.checkForUpdatesOnStartup(lastBrowserWindow as never);
      expect(openedPaths.length).toBeGreaterThan(0);
    } finally {
      dialogResponse = 1;
      globalThis.fetch = originalFetch;
      if (previousManifest === undefined) delete process.env.VITE_UPDATE_MANIFEST_URL;
      else process.env.VITE_UPDATE_MANIFEST_URL = previousManifest;
      if (previousVersion === undefined) delete process.env.VITE_APP_VERSION;
      else process.env.VITE_APP_VERSION = previousVersion;
    }
  });

  test('exposes icon path and creates additional windows', () => {
    expect(mainModule.getIconPath()).toContain('icon.png');
    const created = mainModule.createWindow();
    expect(created).toBeDefined();
  });
});
