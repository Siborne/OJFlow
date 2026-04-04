"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const ipc_channels_1 = require("../shared/ipc-channels");
// Only expose whitelisted APIs, never expose ipcRenderer directly
const api = {
    getRecentContests: (day) => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.GET_CONTESTS, day),
    getRating: (platform, name) => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.GET_RATING, { platform, name }),
    getSolvedNum: (platform, name) => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.GET_SOLVED_NUM, { platform, name }),
    openUrl: (url) => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.OPEN_URL, url),
    installUpdate: (url) => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.UPDATER_INSTALL, { url }),
};
const storeApi = {
    get: (key) => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.STORE_GET, key),
    set: (key, value) => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.STORE_SET, key, value),
    getAll: () => electron_1.ipcRenderer.invoke(ipc_channels_1.IPC_CHANNELS.STORE_GET_ALL),
};
electron_1.contextBridge.exposeInMainWorld('api', api);
electron_1.contextBridge.exposeInMainWorld('store', storeApi);
