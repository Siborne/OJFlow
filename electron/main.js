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

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const recentContestService = require('./services/contest');
const ratingService = require('./services/rating');
const solvedNumService = require('./services/solvedNum');

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
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // IPC Handlers
  ipcMain.handle('get-recent-contests', async (event, day) => {
    try {
      const contests = await recentContestService.getAllContests(day);
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
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
