"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// Polyfill for File in Node < 20 (Electron < 29)
if (typeof File === 'undefined') {
    const { Blob } = require('buffer');
    global.File = class File extends Blob {
        name;
        lastModified;
        constructor(fileBits, fileName, options) {
            super(fileBits, options);
            this.name = fileName;
            this.lastModified = options?.lastModified || Date.now();
        }
    };
}
const electron_1 = require("electron");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const contest_aggregator_1 = require("./services/contest-aggregator");
const rating_aggregator_1 = require("./services/rating-aggregator");
const solved_aggregator_1 = require("./services/solved-aggregator");
const tray_1 = require("./services/tray");
const cache_service_1 = require("./services/cache-service");
const store_1 = require("./store");
const ipc_channels_1 = require("../shared/ipc-channels");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const appConfig = require('./app.config.json');
function loadDotEnv(dotenvPath) {
    try {
        if (!fs.existsSync(dotenvPath))
            return;
        const raw = fs.readFileSync(dotenvPath, 'utf8');
        for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                continue;
            const eq = trimmed.indexOf('=');
            if (eq <= 0)
                continue;
            const key = trimmed.slice(0, eq).trim();
            const value = trimmed.slice(eq + 1).trim();
            if (!key)
                continue;
            if (process.env[key] === undefined)
                process.env[key] = value;
        }
    }
    catch {
        // Ignore .env load errors
    }
}
loadDotEnv(path.join(__dirname, '..', '.env'));
function normalizeVersion(raw) {
    const v = String(raw ?? '').trim();
    if (!v)
        return 'v0.0.0';
    return v.startsWith('v') ? v : `v${v}`;
}
function parseSemver(v) {
    const normalized = normalizeVersion(v).slice(1);
    const parts = normalized
        .split('.')
        .slice(0, 3)
        .map(n => Number(n));
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}
function compareVersions(a, b) {
    const pa = parseSemver(a);
    const pb = parseSemver(b);
    for (let i = 0; i < 3; i++) {
        if (pa[i] !== pb[i])
            return pa[i] > pb[i] ? 1 : -1;
    }
    return 0;
}
function detectManifest(payload) {
    if (!payload || typeof payload !== 'object')
        return null;
    if (typeof payload.version === 'string')
        return payload;
    if (typeof payload.tag_name === 'string') {
        const assets = Array.isArray(payload.assets) ? payload.assets : [];
        const packageUrl = assets.find((a) => typeof a?.browser_download_url === 'string')?.browser_download_url;
        return {
            version: payload.tag_name,
            notes: typeof payload.body === 'string' ? payload.body : undefined,
            homepageUrl: typeof payload.html_url === 'string' ? payload.html_url : undefined,
            packageUrl,
        };
    }
    return null;
}
function pickPackageUrl(manifest) {
    const byPlatform = manifest.packages?.[process.platform]?.url;
    return byPlatform ?? manifest.packageUrl;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
class TimeoutError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TimeoutError';
    }
}
async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const fetchPromise = fetch(url, { ...options, signal: controller?.signal });
    const timeoutPromise = new Promise((_, reject) => {
        const t = setTimeout(() => {
            try {
                controller?.abort();
            }
            catch {
                // Ignore abort errors
            }
            reject(new TimeoutError(`\u8bf7\u6c42\u8d85\u65f6: ${timeoutMs}ms`));
        }, timeoutMs);
        fetchPromise.finally?.(() => clearTimeout(t));
    });
    return Promise.race([fetchPromise, timeoutPromise]);
}
function classifyFetchError(e) {
    const message = e instanceof Error ? e.message : typeof e === 'string' ? e : '\u672a\u77e5\u9519\u8bef';
    if (e instanceof TimeoutError)
        return { type: 'timeout', message };
    if (e && typeof e === 'object' && e.name === 'AbortError')
        return { type: 'timeout', message: '\u8bf7\u6c42\u8d85\u65f6' };
    if (/Failed to fetch/i.test(message))
        return { type: 'network', message: 'Failed to fetch' };
    const code = e?.cause?.code || e?.code;
    if (typeof code === 'string' &&
        /ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT/i.test(code)) {
        return { type: 'network', message: String(code) };
    }
    return { type: 'unknown', message };
}
async function fetchJsonWithRetry(url, opts) {
    let lastError;
    let lastStatus;
    for (let attempt = 1; attempt <= opts.retryCount; attempt++) {
        try {
            const res = await fetchWithTimeout(url, {
                headers: { Accept: 'application/json' },
                cache: 'no-store',
                redirect: 'follow',
            }, opts.timeoutMs);
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
        }
        catch (e) {
            lastError = classifyFetchError(e);
            console.warn('[updater] fetch failed', {
                attempt,
                url,
                errorType: lastError.type,
                errorMessage: lastError.message,
                causeCode: e?.cause?.code || e?.code,
            });
            const canRetry = (lastError.type === 'timeout' || lastError.type === 'network') &&
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
async function downloadAndLaunch(url) {
    if (!url)
        return;
    if (!/^https?:\/\//i.test(url)) {
        await electron_1.shell.openPath(url);
        electron_1.app.quit();
        return;
    }
    const { pipeline } = require('stream/promises');
    const { Readable } = require('stream');
    const timeoutMs = Number(process.env.VITE_UPDATE_TIMEOUT_MS) || 8000;
    const retryCount = Math.max(1, Math.min(3, Number(process.env.VITE_UPDATE_RETRY_COUNT) || 3));
    const backoffBaseMs = Number(process.env.VITE_UPDATE_RETRY_BACKOFF_MS) || 1000;
    let last;
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
        }
        catch (e) {
            const classified = classifyFetchError(e);
            console.warn('[updater] download failed', {
                attempt,
                url,
                errorType: classified.type,
                errorMessage: classified.message,
            });
            if ((classified.type === 'timeout' || classified.type === 'network') &&
                attempt < retryCount) {
                await sleep(backoffBaseMs * attempt);
                continue;
            }
            throw e;
        }
    }
    if (!last?.body)
        throw new Error('\u4e0b\u8f7d\u5931\u8d25');
    const ext = path.extname(new URL(url).pathname) || '.bin';
    const dest = path.join(electron_1.app.getPath('temp'), `OJFlow-update-${Date.now()}${ext}`);
    await pipeline(Readable.fromWeb(last.body), fs.createWriteStream(dest));
    await electron_1.shell.openPath(dest);
    electron_1.app.quit();
}
async function checkForUpdatesOnStartup(win) {
    const manifestUrl = process.env.VITE_UPDATE_MANIFEST_URL;
    if (!manifestUrl)
        return;
    const currentVersion = normalizeVersion(process.env.VITE_APP_VERSION ?? electron_1.app.getVersion());
    const timeoutMs = Number(process.env.VITE_UPDATE_TIMEOUT_MS) || 8000;
    const retryCount = Math.max(1, Math.min(3, Number(process.env.VITE_UPDATE_RETRY_COUNT) || 3));
    const backoffBaseMs = Number(process.env.VITE_UPDATE_RETRY_BACKOFF_MS) || 1000;
    try {
        const fetchResult = await fetchJsonWithRetry(manifestUrl, {
            timeoutMs,
            retryCount,
            backoffBaseMs,
        });
        if (!fetchResult.ok)
            return;
        const payload = fetchResult.payload;
        const manifest = detectManifest(payload);
        if (!manifest)
            return;
        const latestVersion = normalizeVersion(manifest.version);
        if (compareVersions(latestVersion, currentVersion) <= 0)
            return;
        const detail = [
            `\u5f53\u524d\u7248\u672c: ${currentVersion}`,
            `\u6700\u65b0\u7248\u672c: ${latestVersion}`,
            manifest.notes ? `\n\u66f4\u65b0\u5185\u5bb9:\n${manifest.notes}` : '',
        ].join('\n');
        const dialogResult = await electron_1.dialog.showMessageBox(win, {
            type: 'info',
            title: '\u53d1\u73b0\u65b0\u7248\u672c',
            message: '\u53d1\u73b0\u65b0\u7248\u672c\uff0c\u662f\u5426\u7acb\u5373\u66f4\u65b0\uff1f',
            detail,
            buttons: ['\u7acb\u5373\u66f4\u65b0', '\u7a0d\u540e\u63d0\u9192'],
            defaultId: 0,
            cancelId: 1,
            noLink: true,
        });
        if (dialogResult.response !== 0)
            return;
        const packageUrl = pickPackageUrl(manifest) ?? manifest.homepageUrl;
        if (packageUrl) {
            await downloadAndLaunch(packageUrl);
        }
    }
    catch (e) {
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
const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
function getIconPath() {
    // In development, use project root src/assets (go up from electron-dist/electron to project root)
    if (isDev) {
        return path.join(__dirname, '../../src/assets/icon.png');
    }
    // In production, icon is in extraResources (copied to resources folder)
    return path.join(process.resourcesPath, 'src/assets/icon.png');
}
function createWindow() {
    const win = new electron_1.BrowserWindow({
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
    }
    else {
        win.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    // Handle external links
    win.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
    return win;
}
electron_1.app.whenReady().then(() => {
    const win = createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
    // IPC Handlers
    electron_1.ipcMain.handle(ipc_channels_1.IPC_CHANNELS.GET_CONTESTS, async (_event, day) => {
        try {
            // Cache-first: return cached data immediately, then fetch fresh in background
            const cached = (0, cache_service_1.getCachedContests)();
            if (cached) {
                (0, contest_aggregator_1.fetchAllContestsDedup)(day, win)
                    .then((fresh) => (0, cache_service_1.setCachedContests)(fresh))
                    .catch((e) => console.warn('[ipc] background contest refresh failed:', e));
                return cached;
            }
            const response = await (0, contest_aggregator_1.fetchAllContestsDedup)(day, win);
            (0, cache_service_1.setCachedContests)(response);
            return response;
        }
        catch (error) {
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
    electron_1.ipcMain.handle(ipc_channels_1.IPC_CHANNELS.GET_RATING, async (_event, { platform, name }) => {
        if (typeof platform !== 'string' || typeof name !== 'string') {
            throw new Error('Invalid parameters');
        }
        if (name.length > 100 || platform.length > 50) {
            throw new Error('Parameter too long');
        }
        try {
            // Cache-first
            const cached = (0, cache_service_1.getCachedRating)(platform, name);
            if (cached) {
                (0, rating_aggregator_1.fetchRatingDedup)(platform, name)
                    .then((fresh) => (0, cache_service_1.setCachedRating)(platform, name, fresh))
                    .catch(() => { });
                return cached;
            }
            const response = await (0, rating_aggregator_1.fetchRatingDedup)(platform, name);
            (0, cache_service_1.setCachedRating)(platform, name, response);
            return response;
        }
        catch (error) {
            console.error(`Error fetching rating for ${platform}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle(ipc_channels_1.IPC_CHANNELS.GET_SOLVED_NUM, async (_event, { platform, name }) => {
        if (typeof platform !== 'string' || typeof name !== 'string') {
            throw new Error('Invalid parameters');
        }
        if (name.length > 100 || platform.length > 50) {
            throw new Error('Parameter too long');
        }
        try {
            // Cache-first
            const cached = (0, cache_service_1.getCachedSolved)(platform, name);
            if (cached) {
                (0, solved_aggregator_1.fetchSolvedCountDedup)(platform, name)
                    .then((fresh) => (0, cache_service_1.setCachedSolved)(platform, name, fresh))
                    .catch(() => { });
                return cached;
            }
            const response = await (0, solved_aggregator_1.fetchSolvedCountDedup)(platform, name);
            (0, cache_service_1.setCachedSolved)(platform, name, response);
            return response;
        }
        catch (error) {
            console.error(`Error fetching solved num for ${platform}:`, error);
            throw error;
        }
    });
    electron_1.ipcMain.handle(ipc_channels_1.IPC_CHANNELS.OPEN_URL, async (_event, url) => {
        // Security: only allow http/https protocols
        if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
            throw new Error('Invalid URL protocol');
        }
        await electron_1.shell.openExternal(url);
    });
    electron_1.ipcMain.handle(ipc_channels_1.IPC_CHANNELS.UPDATER_INSTALL, async (_event, { url }) => {
        await downloadAndLaunch(url);
        return true;
    });
    // Store IPC handlers
    electron_1.ipcMain.handle(ipc_channels_1.IPC_CHANNELS.STORE_GET, (_event, key) => {
        return store_1.store.get(key);
    });
    electron_1.ipcMain.handle(ipc_channels_1.IPC_CHANNELS.STORE_SET, (_event, key, value) => {
        store_1.store.set(key, value);
    });
    electron_1.ipcMain.handle(ipc_channels_1.IPC_CHANNELS.STORE_GET_ALL, () => {
        return store_1.store.store;
    });
    // Notification handlers
    electron_1.ipcMain.handle(ipc_channels_1.IPC_CHANNELS.NOTIFICATION_SET, (_event, payload) => {
        store_1.store.set('notification', payload);
    });
    electron_1.ipcMain.handle(ipc_channels_1.IPC_CHANNELS.NOTIFICATION_GET, () => {
        return store_1.store.get('notification');
    });
    // System tray
    (0, tray_1.createTray)(win);
    (0, tray_1.scheduleContestReminders)();
    setTimeout(() => {
        if (!win.isDestroyed()) {
            checkForUpdatesOnStartup(win);
        }
    }, 5000);
});
electron_1.app.on('window-all-closed', () => {
    (0, tray_1.destroyTray)();
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
