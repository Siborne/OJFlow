import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';

// Only expose whitelisted APIs, never expose ipcRenderer directly
const api = {
  getRecentContests: (day: number): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CONTESTS, day),

  getRating: (platform: string, name: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_RATING, { platform, name }),

  getSolvedNum: (platform: string, name: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SOLVED_NUM, { platform, name }),

  openUrl: (url: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_URL, url),

  installUpdate: (url: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATER_INSTALL, { url }),

  /** Subscribe to streaming partial contest results */
  onContestsPartial: (
    callback: (data: { platform: string; contests: unknown[] }) => void,
  ): (() => void) => {
    const handler = (_event: unknown, data: { platform: string; contests: unknown[] }) =>
      callback(data);
    ipcRenderer.on(IPC_CHANNELS.CONTESTS_PARTIAL, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.CONTESTS_PARTIAL, handler);
    };
  },

  /** Set notification preferences */
  setNotification: (payload: {
    enabled: boolean;
    reminderMinutes: number;
  }): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_SET, payload),

  /** Get notification preferences */
  getNotification: (): Promise<{ enabled: boolean; reminderMinutes: number }> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_GET),
};

const storeApi = {
  get: (key: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.STORE_GET, key),

  set: (key: string, value: unknown): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.STORE_SET, key, value),

  getAll: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke(IPC_CHANNELS.STORE_GET_ALL),
};

export type ElectronApi = typeof api;
export type StoreApi = typeof storeApi;

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('store', storeApi);
