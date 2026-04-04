// Polyfill for File in Node < 20 (Electron < 29)
if (typeof File === 'undefined') {
  const { Blob } = require('buffer');
  (global as any).File = class File extends Blob {
    name: string;
    lastModified: number;
    constructor(
      fileBits: BlobPart[],
      fileName: string,
      options?: FilePropertyBag & { lastModified?: number },
    ) {
      super(fileBits, options);
      this.name = fileName;
      this.lastModified = options?.lastModified || Date.now();
    }
  };
}

import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
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
} from './services/cache-service';
import { store } from './store';
import { IPC_CHANNELS } from '../shared/ipc-channels';

interface AppConfig {
  crawl: { defaultDays: number; minDays: number; maxDays: number };
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const appConfig: AppConfig = require('./app.config.json');

function loadDotEnv(dotenvPath: string): void {
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

function normalizeVersion(raw: string | undefined): string {
  const v = String(raw ?? '').trim();
  if (!v) return 'v0.0.0';
  return v.startsWith('v') ? v : `v${v}`;
}

function parseSemver(v: string): [number, number, number] {
  const normalized = normalizeVersion(v).slice(1);
  const parts = normalized
    .split('.')
    .slice(0, 3)
    .map(n => Number(n));
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function compareVersions(a: string, b: string): number {
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

function detectManifest(payload: any): UpdateManifest | null {
  if (!payload || typeof payload !== 'object') return null;
  if (typeof payload.version === 'string') return payload;
  if (typeof payload.tag_name === 'string') {
    const assets = Array.isArray(payload.assets) ? payload.assets : [];
    const packageUrl = assets.find(
      (a: any) => typeof a?.browser_download_url === 'string',
    )?.browser_download_url;
    return {
      version: payload.tag_name,
      notes: typeof payload.body === 'string' ? payload.body : undefined,
      homepageUrl: typeof payload.html_url === 'string' ? payload.html_url : undefined,
      packageUrl,
    };
  }
  return null;
}

function pickPackageUrl(manifest: UpdateManifest): string | undefined {
  const byPlatform = manifest.packages?.[process.platform]?.url;
  return byPlatform ?? manifest.packageUrl;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller =
    typeof AbortController !== 'undefined' ? new AbortController() : undefined;
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

function classifyFetchError(e: any): ClassifiedError {
  const message =
    e instanceof Error ? e.message : typeof e === 'string' ? e : '\u672a\u77e5\u9519\u8bef';
  if (e instanceof TimeoutError) return { type: 'timeout', message };
  if (e && typeof e === 'object' && e.name === 'AbortError')
    return { type: 'timeout', message: '\u8bf7\u6c42\u8d85\u65f6' };
  if (/Failed to fetch/i.test(message))
    return { type: 'network', message: 'Failed to fetch' };
  const code = e?.cause?.code || e?.code;
  if (
    typeof code === 'string' &&
    /ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT/i.test(code)
  ) {
    return { type: 'network', message: String(code) };
  }
  return { type: 'unknown', message };
}

interface FetchJsonResult {
  ok: boolean;
  payload?: any;
  status?: number;
  error?: ClassifiedError;
}

async function fetchJsonWithRetry(
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
    } catch (e: any) {
      lastError = classifyFetchError(e);
      console.warn('[updater] fetch failed', {
        attempt,
        url,
        errorType: lastError.type,
        errorMessage: lastError.message,
        causeCode: e?.cause?.code || e?.code,
      });
      const canRetry =
        (lastError.type === 'timeout' || lastError.type === 'network') &&
        attempt < opts.retryCount;
      if (canRetry) {
        await sleep(opts.backoffBaseMs * attempt);
        continue;
      }
      break;
    }
  }
  return { ok: false, status: lastStatus, error: lastError };
}

async function downloadAndLaunch(url: string): Promise<void> {
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) {
    await shell.openPath(url);
    app.quit();
    return;
  }

  const { pipeline } = require('stream/promises');
  const { Readable } = require('stream');

  const timeoutMs = Number(process.env.VITE_UPDATE_TIMEOUT_MS) || 8_000;
  const retryCount = Math.max(
    1,
    Math.min(3, Number(process.env.VITE_UPDATE_RETRY_COUNT) || 3),
  );
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
    } catch (e: any) {
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
  await pipeline(Readable.fromWeb(last.body), fs.createWriteStream(dest));
  await shell.openPath(dest);
  app.quit();
}

async function checkForUpdatesOnStartup(win: BrowserWindow): Promise<void> {
  const manifestUrl = process.env.VITE_UPDATE_MANIFEST_URL;
  if (!manifestUrl) return;

  const currentVersion = normalizeVersion(
    process.env.VITE_APP_VERSION ?? app.getVersion(),
  );
  const timeoutMs = Number(process.env.VITE_UPDATE_TIMEOUT_MS) || 8_000;
  const retryCount = Math.max(
    1,
    Math.min(3, Number(process.env.VITE_UPDATE_RETRY_COUNT) || 3),
  );
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
  } catch (e: any) {
    const classified = classifyFetchError(e);
    console.warn('[updater] startup check failed', {
      manifestUrl,
      errorType: classified.type,
      errorMessage: classified.message,
      causeCode: e?.cause?.code || e?.code,
    });
  }
}

// Determine if running in development mode
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function getIconPath(): string {
  // In development, use project root src/assets (go up from electron-dist/electron to project root)
  if (isDev) {
    return path.join(__dirname, '../../src/assets/icon.png');
  }
  // In production, icon is in extraResources (copied to resources folder)
  return path.join(process.resourcesPath, 'src/assets/icon.png');
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: getIconPath(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false, // electron-store needs access to Node APIs in preload
    },
    autoHideMenuBar: true,
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle external links
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}

app.whenReady().then(() => {
  const win = createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // IPC Handlers
  ipcMain.handle(IPC_CHANNELS.GET_CONTESTS, async (_event, day: number) => {
    try {
      // Cache-first: return cached data immediately, then fetch fresh in background
      const cached = getCachedContests();
      if (cached) {
        fetchAllContestsDedup(day, win)
          .then((fresh) => setCachedContests(fresh))
          .catch((e) => console.warn('[ipc] background contest refresh failed:', e));
        return cached;
      }

      const response = await fetchAllContestsDedup(day, win);
      setCachedContests(response);
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
            .then((fresh) => setCachedRating(platform, name, fresh))
            .catch(() => {});
          return cached;
        }

        const response = await fetchRatingDedup(platform, name);
        setCachedRating(platform, name, response);
        return response;
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
            .then((fresh) => setCachedSolved(platform, name, fresh))
            .catch(() => {});
          return cached;
        }

        const response = await fetchSolvedCountDedup(platform, name);
        setCachedSolved(platform, name, response);
        return response;
      } catch (error) {
        console.error(`Error fetching solved num for ${platform}:`, error);
        throw error;
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.OPEN_URL, async (_event, url: string) => {
    // Security: only allow http/https protocols
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      throw new Error('Invalid URL protocol');
    }
    await shell.openExternal(url);
  });

  ipcMain.handle(
    IPC_CHANNELS.UPDATER_INSTALL,
    async (_event, { url }: { url: string }) => {
      await downloadAndLaunch(url);
      return true;
    },
  );

  // Store IPC handlers
  ipcMain.handle(IPC_CHANNELS.STORE_GET, (_event, key: string) => {
    return store.get(key);
  });

  ipcMain.handle(IPC_CHANNELS.STORE_SET, (_event, key: string, value: unknown) => {
    store.set(key, value);
  });

  ipcMain.handle(IPC_CHANNELS.STORE_GET_ALL, () => {
    return store.store;
  });

  // Notification handlers
  ipcMain.handle(
    IPC_CHANNELS.NOTIFICATION_SET,
    (_event, payload: { enabled: boolean; reminderMinutes: number }) => {
      store.set('notification', payload);
    },
  );

  ipcMain.handle(IPC_CHANNELS.NOTIFICATION_GET, () => {
    return store.get('notification');
  });

  // System tray
  createTray(win);
  scheduleContestReminders();

  setTimeout(() => {
    if (!win.isDestroyed()) {
      checkForUpdatesOnStartup(win);
    }
  }, 5000);
});

app.on('window-all-closed', () => {
  destroyTray();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
