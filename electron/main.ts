import { app, BrowserWindow, clipboard, ipcMain, shell, dialog, globalShortcut } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fetchAllContestsDedup } from './services/contest-aggregator';
import { fetchRatingDedup } from './services/rating-aggregator';
import { fetchSolvedCountDedup } from './services/solved-aggregator';
import { createTray, scheduleContestReminders, destroyTray } from './services/tray';
import {
  getCachedContests,
  setCachedContests,
  getCachedRating,
  setCachedRating,
  getCachedSolved,
  setCachedSolved,
  clearAllCache,
  CACHE_TTL,
} from './services/cache-service';
import { store } from './store';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import { getCodeforcesReport } from './services/codeforces-service';
import { clearProblemSearchCache, searchProblems } from './services/problem-service';
import { isAllowedStoreKey, isSafeExternalUrl, isSafeUpdateUrl } from './services/url-security';
import {
  clearQuerySnapshots,
  closeQueryDatabase,
  getPersistedQuerySnapshot,
  initQueryDatabase,
  persistQuerySnapshot,
  waitForQueryDatabase,
} from './services/query-store';
import {
  deletePracticeProblem,
  importPracticeProblem,
  listPracticeProblems,
  updatePracticeProblem,
} from './services/practice-service';
import { startCompanionServer, type CompanionServerHandle } from './services/companion-server';
import type {
  CompanionStatus,
  ContestFetchResponse,
  PracticeProblemUpdate,
  Rating,
  SolvedNum,
} from '../shared/types';

export function loadDotEnv(dotenvPath: string): void {
  try {
    if (!fs.existsSync(dotenvPath)) return;
    const raw = fs.readFileSync(dotenvPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!key) continue;
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // Ignore .env load errors
  }
}

loadDotEnv(path.join(__dirname, '..', '.env'));

export function normalizeVersion(raw: string | undefined): string {
  const v = String(raw ?? '').trim();
  if (!v) return 'v0.0.0';
  return v.startsWith('v') ? v : `v${v}`;
}

export function parseSemver(v: string): [number, number, number] {
  const normalized = normalizeVersion(v).slice(1);
  const parts = normalized
    .split('-')[0]
    .split('.')
    .slice(0, 3)
    .map(n => Number(n));
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

export function compareVersions(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}

interface UpdateManifest {
  version: string;
  notes?: string;
  homepageUrl?: string;
  packages?: Partial<Record<string, { url: string }>>;
  packageUrl?: string;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

export function detectManifest(payload: unknown): UpdateManifest | null {
  if (!payload || typeof payload !== 'object') return null;
  const object = payload as Record<string, unknown>;
  if (typeof object.version === 'string') {
    return object as unknown as UpdateManifest;
  }
  if (typeof object.tag_name === 'string') {
    const assets = Array.isArray(object.assets) ? object.assets : [];
    const packageAsset = assets.find(asset => {
      const item = toRecord(asset);
      return typeof item?.browser_download_url === 'string';
    });
    const packageUrl = toRecord(packageAsset)?.browser_download_url as string | undefined;
    return {
      version: object.tag_name,
      notes: typeof object.body === 'string' ? object.body : undefined,
      homepageUrl: typeof object.html_url === 'string' ? object.html_url : undefined,
      packageUrl,
    };
  }
  return null;
}

export function pickPackageUrl(manifest: UpdateManifest): string | undefined {
  const byPlatform = manifest.packages?.[process.platform]?.url;
  return byPlatform ?? manifest.packageUrl;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
  const fetchPromise = fetch(url, { ...options, signal: controller?.signal });

  const timeoutPromise = new Promise<never>((_, reject) => {
    const t = setTimeout(() => {
      try {
        controller?.abort();
      } catch {
        // Ignore abort errors
      }
      reject(new TimeoutError(`\u8bf7\u6c42\u8d85\u65f6: ${timeoutMs}ms`));
    }, timeoutMs);
    fetchPromise.finally?.(() => clearTimeout(t));
  });

  return Promise.race([fetchPromise, timeoutPromise]);
}

interface ClassifiedError {
  type: string;
  message: string;
}

function getErrorCode(error: unknown): string | undefined {
  const record = toRecord(error);
  const cause = toRecord(record?.cause);
  const code = cause?.code ?? record?.code;
  return typeof code === 'string' ? code : undefined;
}

export function classifyFetchError(e: unknown): ClassifiedError {
  const message =
    e instanceof Error ? e.message : typeof e === 'string' ? e : '\u672a\u77e5\u9519\u8bef';
  if (e instanceof TimeoutError) return { type: 'timeout', message };
  if (toRecord(e)?.name === 'AbortError')
    return { type: 'timeout', message: '\u8bf7\u6c42\u8d85\u65f6' };
  if (/Failed to fetch/i.test(message)) return { type: 'network', message: 'Failed to fetch' };
  const code = getErrorCode(e);
  if (typeof code === 'string' && /ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT/i.test(code)) {
    return { type: 'network', message: String(code) };
  }
  return { type: 'unknown', message };
}

interface FetchJsonResult {
  ok: boolean;
  payload?: unknown;
  status?: number;
  error?: ClassifiedError;
}

export async function fetchJsonWithRetry(
  url: string,
  opts: { timeoutMs: number; retryCount: number; backoffBaseMs: number },
): Promise<FetchJsonResult> {
  let lastError: ClassifiedError | undefined;
  let lastStatus: number | undefined;
  for (let attempt = 1; attempt <= opts.retryCount; attempt++) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          redirect: 'follow',
        },
        opts.timeoutMs,
      );
      if (!res.ok) {
        lastStatus = res.status;
        console.warn('[updater] http error', { status: res.status, attempt, url });
        const canRetry = res.status >= 500 && attempt < opts.retryCount;
        if (canRetry) {
          await sleep(opts.backoffBaseMs * attempt);
          continue;
        }
        return { ok: false, status: res.status };
      }
      const payload = await res.json();
      return { ok: true, payload };
    } catch (e: unknown) {
      lastError = classifyFetchError(e);
      console.warn('[updater] fetch failed', {
        attempt,
        url,
        errorType: lastError.type,
        errorMessage: lastError.message,
        causeCode: getErrorCode(e),
      });
      const canRetry =
        (lastError.type === 'timeout' || lastError.type === 'network') && attempt < opts.retryCount;
      if (canRetry) {
        await sleep(opts.backoffBaseMs * attempt);
        continue;
      }
      break;
    }
  }
  return { ok: false, status: lastStatus, error: lastError };
}

export async function downloadAndLaunch(url: string): Promise<void> {
  if (!isSafeUpdateUrl(url)) {
    throw new Error('Invalid update URL');
  }

  const timeoutMs = Number(process.env.VITE_UPDATE_TIMEOUT_MS) || 8_000;
  const retryCount = Math.max(1, Math.min(3, Number(process.env.VITE_UPDATE_RETRY_COUNT) || 3));
  const backoffBaseMs = Number(process.env.VITE_UPDATE_RETRY_BACKOFF_MS) || 1_000;

  let last: Response | undefined;
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const res = await fetchWithTimeout(url, { redirect: 'follow' }, timeoutMs);
      if (!res.ok || !res.body) {
        console.warn('[updater] download http error', {
          status: res.status,
          attempt,
          url,
        });
        const canRetry = res.status >= 500 && attempt < retryCount;
        if (canRetry) {
          await sleep(backoffBaseMs * attempt);
          continue;
        }
        throw new Error(`\u4e0b\u8f7d\u5931\u8d25: ${res.status}`);
      }
      last = res;
      break;
    } catch (e: unknown) {
      const classified = classifyFetchError(e);
      console.warn('[updater] download failed', {
        attempt,
        url,
        errorType: classified.type,
        errorMessage: classified.message,
      });
      if (
        (classified.type === 'timeout' || classified.type === 'network') &&
        attempt < retryCount
      ) {
        await sleep(backoffBaseMs * attempt);
        continue;
      }
      throw e;
    }
  }

  if (!last?.body) throw new Error('\u4e0b\u8f7d\u5931\u8d25');

  const ext = path.extname(new URL(url).pathname) || '.bin';
  const dest = path.join(app.getPath('temp'), `OJFlow-update-${Date.now()}${ext}`);
  const webStream = last.body as unknown as import('node:stream/web').ReadableStream<Uint8Array>;
  await pipeline(Readable.fromWeb(webStream), fs.createWriteStream(dest));
  await shell.openPath(dest);
  app.quit();
}

export async function checkForUpdatesOnStartup(win: BrowserWindow): Promise<void> {
  const manifestUrl = process.env.VITE_UPDATE_MANIFEST_URL;
  if (!manifestUrl) return;

  const currentVersion = normalizeVersion(process.env.VITE_APP_VERSION ?? app.getVersion());
  const timeoutMs = Number(process.env.VITE_UPDATE_TIMEOUT_MS) || 8_000;
  const retryCount = Math.max(1, Math.min(3, Number(process.env.VITE_UPDATE_RETRY_COUNT) || 3));
  const backoffBaseMs = Number(process.env.VITE_UPDATE_RETRY_BACKOFF_MS) || 1_000;

  try {
    const fetchResult = await fetchJsonWithRetry(manifestUrl, {
      timeoutMs,
      retryCount,
      backoffBaseMs,
    });
    if (!fetchResult.ok) return;
    const payload = fetchResult.payload;
    const manifest = detectManifest(payload);
    if (!manifest) return;

    const latestVersion = normalizeVersion(manifest.version);
    if (compareVersions(latestVersion, currentVersion) <= 0) return;

    const detail = [
      `\u5f53\u524d\u7248\u672c: ${currentVersion}`,
      `\u6700\u65b0\u7248\u672c: ${latestVersion}`,
      manifest.notes ? `\n\u66f4\u65b0\u5185\u5bb9:\n${manifest.notes}` : '',
    ].join('\n');

    const dialogResult = await dialog.showMessageBox(win, {
      type: 'info',
      title: '\u53d1\u73b0\u65b0\u7248\u672c',
      message: '\u53d1\u73b0\u65b0\u7248\u672c\uff0c\u662f\u5426\u7acb\u5373\u66f4\u65b0\uff1f',
      detail,
      buttons: ['\u7acb\u5373\u66f4\u65b0', '\u7a0d\u540e\u63d0\u9192'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });

    if (dialogResult.response !== 0) return;

    const packageUrl = pickPackageUrl(manifest) ?? manifest.homepageUrl;
    if (packageUrl) {
      await downloadAndLaunch(packageUrl);
    }
  } catch (e: unknown) {
    const classified = classifyFetchError(e);
    console.warn('[updater] startup check failed', {
      manifestUrl,
      errorType: classified.type,
      errorMessage: classified.message,
      causeCode: getErrorCode(e),
    });
  }
}

// Determine if running in development mode. Playwright uses NODE_ENV=test to load dist/.
const isTest = process.env.NODE_ENV === 'test';
const isPreview = process.env.NODE_ENV === 'preview' || process.env.OJFLOW_PREVIEW_DIST === '1';
const isDev = !isTest && !isPreview && (process.env.NODE_ENV === 'development' || !app.isPackaged);
if (isTest) {
  app.setPath(
    'userData',
    path.join(
      app.getPath('temp'),
      `ojflow-e2e-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ),
  );
}
let isQuitting = false;
let companionServer: CompanionServerHandle | null = null;
let companionStatus: CompanionStatus = { running: false, port: null };
let registeredTemplateShortcut = '';

export const TEMPLATE_SHORTCUTS = [
  '',
  'CommandOrControl+Shift+T',
  'CommandOrControl+Shift+O',
  'CommandOrControl+Alt+T',
  'Alt+T',
] as const;

export function registerTemplateShortcut(
  win: BrowserWindow,
  accelerator: string,
): { success: boolean; error?: string } {
  if (registeredTemplateShortcut) {
    globalShortcut.unregister(registeredTemplateShortcut);
    registeredTemplateShortcut = '';
  }
  if (!accelerator) return { success: true };
  if (!(TEMPLATE_SHORTCUTS as readonly string[]).includes(accelerator)) {
    return { success: false, error: 'Unsupported shortcut' };
  }
  const success = globalShortcut.register(accelerator, () => {
    if (!win.isDestroyed()) {
      win.show();
      win.focus();
      win.webContents.send(IPC_CHANNELS.NAVIGATE_TO, '/templates');
    }
  });
  if (!success) return { success: false, error: 'Shortcut is already in use' };
  registeredTemplateShortcut = accelerator;
  return { success: true };
}

export function getIconPath(): string {
  // Unpackaged runs use the project asset, including production previews with NODE_ENV=test.
  if (!app.isPackaged) {
    return path.join(__dirname, '../../src/assets/icon.png');
  }
  // In production, icon is in extraResources (copied to resources folder)
  const resourcesRoot =
    typeof process.resourcesPath === 'string'
      ? process.resourcesPath
      : path.join(__dirname, '../..');
  return path.join(resourcesRoot, 'src/assets/icon.png');
}

export function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: getIconPath(),
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false, // electron-store needs access to Node APIs in preload
    },
    autoHideMenuBar: true,
  });

  const sendWindowState = () => {
    if (!win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.WINDOW_STATE_CHANGED, {
        maximized: win.isMaximized(),
      });
    }
  };
  win.on('maximize', sendWindowState);
  win.on('unmaximize', sendWindowState);
  win.on('close', event => {
    if (!isQuitting && store.get('ui.closeBehavior') === 'tray') {
      event.preventDefault();
      win.hide();
    }
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  return win;
}

app.whenReady().then(() => {
  void initQueryDatabase(path.join(app.getPath('userData'), 'ojflow.sqlite')).catch(error => {
    console.warn('[query-store] SQLite initialization failed:', error);
  });
  const win = createWindow();
  const templateShortcut = store.get('ui.templateShortcut');
  const shortcutResult = registerTemplateShortcut(
    win,
    typeof templateShortcut === 'string' ? templateShortcut : 'CommandOrControl+Shift+T',
  );
  if (!shortcutResult.success) {
    console.warn('[shortcut] Failed to register template shortcut:', shortcutResult.error);
  }
  if (process.env.OJFLOW_DISABLE_COMPANION_SERVER !== '1') {
    void startCompanionServer({
      onImported: problem => {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.PRACTICE_IMPORTED, problem);
        }
      },
    })
      .then(server => {
        companionServer = server;
        companionStatus = { running: true, port: server.port };
        console.warn(`[companion] listening on 127.0.0.1:${server.port}`);
      })
      .catch(error => {
        companionStatus = { running: false, port: null };
        console.warn('[companion] receiver failed to start:', error);
      });
  }
  if (store.get('ui.startAtLogin')) {
    app.setLoginItemSettings({
      openAtLogin: true,
      ...(app.isPackaged
        ? {}
        : {
            path: process.execPath,
            args: [path.resolve(__dirname, '../..')],
          }),
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // IPC Handlers
  ipcMain.handle(IPC_CHANNELS.GET_CONTESTS, async (_event, day: number) => {
    try {
      if (!Number.isFinite(day)) {
        throw new Error('Invalid day');
      }
      // Cache-first: return cached data immediately, then fetch fresh in background
      const cached = getCachedContests();
      if (cached) {
        fetchAllContestsDedup(day, win)
          .then(fresh => setCachedContests(fresh))
          .catch(e => console.warn('[ipc] background contest refresh failed:', e));
        return cached;
      }

      await waitForQueryDatabase().catch(() => {});
      const persisted = getPersistedQuerySnapshot<ContestFetchResponse>(
        'contests',
        'all',
        `days-${day}`,
        CACHE_TTL.contests,
      );
      if (persisted) {
        const response = {
          ...persisted.payload,
          fromCache: true,
          cachedAt: persisted.fetchedAt,
        };
        setCachedContests(response);
        return response;
      }

      const response = await fetchAllContestsDedup(day, win);
      setCachedContests(response);
      await waitForQueryDatabase().catch(() => {});
      try {
        persistQuerySnapshot('contests', 'all', `days-${day}`, response);
      } catch {
        // SQLite persistence is best-effort.
      }
      return response;
    } catch (error) {
      console.error('Error fetching contests:', error);
      return {
        contests: [],
        platformStatus: [],
        totalElapsed: 0,
        fromCache: false,
        cachedAt: null,
      };
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.GET_RATING,
    async (_event, { platform, name }: { platform: string; name: string }) => {
      if (typeof platform !== 'string' || typeof name !== 'string') {
        throw new Error('Invalid parameters');
      }
      if (name.length > 100 || platform.length > 50) {
        throw new Error('Parameter too long');
      }
      try {
        // Cache-first
        const cached = getCachedRating(platform, name);
        if (cached) {
          fetchRatingDedup(platform, name)
            .then(fresh => setCachedRating(platform, name, fresh))
            .catch(() => {});
          return cached.rating;
        }

        await waitForQueryDatabase().catch(() => {});
        const persisted = getPersistedQuerySnapshot<Rating>(
          'rating',
          platform,
          name,
          CACHE_TTL.ratings,
        );
        if (persisted) {
          const response = {
            rating: persisted.payload,
            fromCache: true,
            cachedAt: persisted.fetchedAt,
          };
          setCachedRating(platform, name, response);
          return response.rating;
        }

        const response = await fetchRatingDedup(platform, name);
        setCachedRating(platform, name, response);
        await waitForQueryDatabase().catch(() => {});
        try {
          persistQuerySnapshot('rating', platform, name, response.rating);
        } catch {
          // SQLite persistence is best-effort.
        }
        return response.rating;
      } catch (error) {
        console.error(`Error fetching rating for ${platform}:`, error);
        throw error;
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_SOLVED_NUM,
    async (_event, { platform, name }: { platform: string; name: string }) => {
      if (typeof platform !== 'string' || typeof name !== 'string') {
        throw new Error('Invalid parameters');
      }
      if (name.length > 100 || platform.length > 50) {
        throw new Error('Parameter too long');
      }
      try {
        // Cache-first
        const cached = getCachedSolved(platform, name);
        if (cached) {
          fetchSolvedCountDedup(platform, name)
            .then(fresh => setCachedSolved(platform, name, fresh))
            .catch(() => {});
          return cached.solved;
        }

        await waitForQueryDatabase().catch(() => {});
        const persisted = getPersistedQuerySnapshot<SolvedNum>(
          'solved',
          platform,
          name,
          CACHE_TTL.solved,
        );
        if (persisted) {
          const response = {
            solved: persisted.payload,
            fromCache: true,
            cachedAt: persisted.fetchedAt,
          };
          setCachedSolved(platform, name, response);
          return response.solved;
        }

        const response = await fetchSolvedCountDedup(platform, name);
        setCachedSolved(platform, name, response);
        await waitForQueryDatabase().catch(() => {});
        try {
          persistQuerySnapshot('solved', platform, name, response.solved);
        } catch {
          // SQLite persistence is best-effort.
        }
        return response.solved;
      } catch (error) {
        console.error(`Error fetching solved num for ${platform}:`, error);
        throw error;
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.OPEN_URL, async (_event, url: string) => {
    if (!isSafeExternalUrl(url)) {
      throw new Error('Invalid URL protocol');
    }
    await shell.openExternal(url);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATER_INSTALL, async (_event, { url }: { url: string }) => {
    if (!isSafeUpdateUrl(url)) {
      throw new Error('Invalid update URL');
    }
    await downloadAndLaunch(url);
    return true;
  });

  ipcMain.handle(
    IPC_CHANNELS.SEARCH_PROBLEMS,
    async (_event, payload: Parameters<typeof searchProblems>[0]) => {
      return searchProblems(payload ?? {});
    },
  );

  ipcMain.handle(IPC_CHANNELS.GET_CF_REPORT, async (_event, handle: string) => {
    return getCodeforcesReport(handle);
  });

  ipcMain.handle(IPC_CHANNELS.LIST_PRACTICE_PROBLEMS, () => {
    return listPracticeProblems();
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_PRACTICE_PROBLEM, (_event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid practice problem payload');
    }
    return importPracticeProblem(payload);
  });

  ipcMain.handle(
    IPC_CHANNELS.UPDATE_PRACTICE_PROBLEM,
    (_event, id: string, updates: PracticeProblemUpdate) => {
      if (typeof id !== 'string' || id.length === 0 || !updates || typeof updates !== 'object') {
        throw new Error('Invalid practice problem update');
      }
      return updatePracticeProblem(id, updates);
    },
  );

  ipcMain.handle(IPC_CHANNELS.DELETE_PRACTICE_PROBLEM, (_event, id: string) => {
    if (typeof id !== 'string' || id.length === 0) {
      throw new Error('Invalid practice problem id');
    }
    return deletePracticeProblem(id);
  });

  ipcMain.handle(IPC_CHANNELS.GET_COMPANION_STATUS, () => companionStatus);

  ipcMain.handle(IPC_CHANNELS.COPY_TEXT, (_event, text: string) => {
    if (typeof text !== 'string' || text.length > 1_000_000) {
      throw new Error('Invalid clipboard text');
    }
    clipboard.writeText(text);
  });

  ipcMain.handle(IPC_CHANNELS.CLEAR_CACHE, () => {
    clearAllCache();
    clearProblemSearchCache();
    clearQuerySnapshots();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    win.minimize();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE, () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    if (!win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.WINDOW_STATE_CHANGED, {
        maximized: win.isMaximized(),
      });
    }
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, () => {
    win.close();
  });

  ipcMain.handle(IPC_CHANNELS.WINDOW_GET_STATE, () => ({
    maximized: win.isMaximized(),
  }));

  ipcMain.handle(IPC_CHANNELS.AUTO_LAUNCH_GET, () => {
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle(IPC_CHANNELS.AUTO_LAUNCH_SET, (_event, enabled: boolean) => {
    if (typeof enabled !== 'boolean') throw new Error('Invalid auto launch setting');
    const loginSettings = {
      openAtLogin: enabled,
      ...(enabled && !app.isPackaged
        ? {
            path: process.execPath,
            args: [path.resolve(__dirname, '../..')],
          }
        : {}),
    };
    app.setLoginItemSettings(loginSettings);
    store.set('ui.startAtLogin', enabled);
  });

  ipcMain.handle(IPC_CHANNELS.SET_TEMPLATE_SHORTCUT, (_event, accelerator: string) => {
    if (typeof accelerator !== 'string') {
      return { success: false, error: 'Invalid shortcut' };
    }
    const result = registerTemplateShortcut(win, accelerator);
    if (result.success) store.set('ui.templateShortcut', accelerator);
    return result;
  });

  // Store IPC handlers
  ipcMain.handle(IPC_CHANNELS.STORE_GET, (_event, key: string) => {
    if (!isAllowedStoreKey(key)) throw new Error('Invalid store key');
    return store.get(key);
  });

  ipcMain.handle(IPC_CHANNELS.STORE_SET, (_event, key: string, value: unknown) => {
    if (!isAllowedStoreKey(key)) throw new Error('Invalid store key');
    store.set(key, value);
  });

  ipcMain.handle(IPC_CHANNELS.STORE_GET_ALL, () => {
    return store.store;
  });

  // Notification handlers
  ipcMain.handle(
    IPC_CHANNELS.NOTIFICATION_SET,
    (_event, payload: { enabled: boolean; reminderMinutes: number }) => {
      if (
        !payload ||
        typeof payload.enabled !== 'boolean' ||
        !Number.isFinite(payload.reminderMinutes) ||
        payload.reminderMinutes < 1 ||
        payload.reminderMinutes > 1440
      ) {
        throw new Error('Invalid notification settings');
      }
      store.set('notification', payload);
      void scheduleContestReminders();
    },
  );

  ipcMain.handle(IPC_CHANNELS.NOTIFICATION_GET, () => {
    return store.get('notification');
  });

  // System tray
  createTray(win);
  scheduleContestReminders();

  setTimeout(() => {
    if (!win.isDestroyed() && store.get('ui.autoCheckUpdates') !== false) {
      checkForUpdatesOnStartup(win);
    }
  }, 5000);
});

app.on('window-all-closed', () => {
  void companionServer?.close().catch(() => {});
  companionServer = null;
  companionStatus = { running: false, port: null };
  destroyTray();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
  void companionServer?.close().catch(() => {});
  companionServer = null;
  companionStatus = { running: false, port: null };
  destroyTray();
  closeQueryDatabase();
});
