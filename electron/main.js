// Polyfill for File in Node < 20 (Electron < 29)
if (typeof File === 'undefined') {
  const { Blob } = require('buffer');
  global.File = class File extends Blob {
    constructor(fileBits, fileName, options) {
      super(fileBits, options);
      this.name = fileName;
      this.lastModified = options?.lastModified || Date.now();
    }
  };
}

const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const recentContestService = require('./services/contest');
const ratingService = require('./services/rating');
const solvedNumService = require('./services/solvedNum');
const appConfig = require('./app.config.json');

function loadDotEnv(dotenvPath) {
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
  }
}

loadDotEnv(path.join(__dirname, '..', '.env'));

function normalizeVersion(raw) {
  const v = String(raw ?? '').trim();
  if (!v) return 'v0.0.0';
  return v.startsWith('v') ? v : `v${v}`;
}

function parseSemver(v) {
  const normalized = normalizeVersion(v).slice(1);
  const parts = normalized.split('.').slice(0, 3).map(n => Number(n));
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function compareVersions(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? 1 : -1;
  }
  return 0;
}

function detectManifest(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (typeof payload.version === 'string') return payload;
  if (typeof payload.tag_name === 'string') {
    const assets = Array.isArray(payload.assets) ? payload.assets : [];
    const packageUrl = assets.find(a => typeof a?.browser_download_url === 'string')?.browser_download_url;
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

async function downloadAndLaunch(url) {
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) {
    await shell.openPath(url);
    app.quit();
    return;
  }

  const { pipeline } = require('stream/promises');
  const { Readable } = require('stream');

  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`下载失败: ${res.status}`);

  const ext = path.extname(new URL(url).pathname) || '.bin';
  const dest = path.join(app.getPath('temp'), `OJFlow-update-${Date.now()}${ext}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
  await shell.openPath(dest);
  app.quit();
}

async function checkForUpdatesOnStartup(win) {
  const manifestUrl = process.env.VITE_UPDATE_MANIFEST_URL;
  if (!manifestUrl) return;

  const currentVersion = normalizeVersion(process.env.VITE_APP_VERSION ?? app.getVersion());

  try {
    const res = await fetch(manifestUrl, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) return;
    const payload = await res.json();
    const manifest = detectManifest(payload);
    if (!manifest) return;

    const latestVersion = normalizeVersion(manifest.version);
    if (compareVersions(latestVersion, currentVersion) <= 0) return;

    const detail = [
      `当前版本: ${currentVersion}`,
      `最新版本: ${latestVersion}`,
      manifest.notes ? `\n更新内容:\n${manifest.notes}` : '',
    ].join('\n');

    const result = await dialog.showMessageBox(win, {
      type: 'info',
      title: '发现新版本',
      message: '发现新版本，是否立即更新？',
      detail,
      buttons: ['立即更新', '稍后提醒'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });

    if (result.response !== 0) return;

    const packageUrl = pickPackageUrl(manifest) ?? manifest.homepageUrl;
    await downloadAndLaunch(packageUrl);
  } catch (e) {
  }
}

// 判断是否为开发模式
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, '../src/assets/icon.png'),
    webPreferences: {
      nodeIntegration: true, // 允许在渲染进程使用 Node.js (开发方便，生产需注意安全)
      contextIsolation: false, 
    },
    // 隐藏菜单栏 (可选，让应用更像原生应用)
    autoHideMenuBar: true, 
  });

  if (isDev) {
    // 开发模式：加载 Vite 的本地服务器
    win.loadURL('http://localhost:5173');
    // 自动打开开发者工具
    win.webContents.openDevTools();
  } else {
    // 生产模式：加载打包后的 HTML 文件
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
  ipcMain.handle('get-recent-contests', async (event, day) => {
    try {
      const fallback = appConfig?.crawl?.defaultDays ?? 7;
      const min = appConfig?.crawl?.minDays ?? 1;
      const max = appConfig?.crawl?.maxDays ?? 30;
      const n = Number(day);
      const d = Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback;
      const contests = await recentContestService.getAllContests(d);
      return contests;
    } catch (error) {
      console.error('Error fetching contests:', error);
      return [];
    }
  });

  ipcMain.handle('get-rating', async (event, { platform, name }) => {
    try {
      const rating = await ratingService.getRating(platform, name);
      return rating;
    } catch (error) {
      console.error(`Error fetching rating for ${platform}:`, error);
      throw error;
    }
  });

  ipcMain.handle('get-solved-num', async (event, { platform, name }) => {
    try {
      const result = await solvedNumService.getSolvedNum(platform, name);
      return result;
    } catch (error) {
      console.error(`Error fetching solved num for ${platform}:`, error);
      throw error;
    }
  });

  ipcMain.handle('open-url', async (event, url) => {
    await shell.openExternal(url);
  });

  ipcMain.handle('updater-install', async (event, { url }) => {
    await downloadAndLaunch(url);
    return true;
  });

  setTimeout(() => {
    if (!win.isDestroyed()) {
      checkForUpdatesOnStartup(win);
    }
  }, 5000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
