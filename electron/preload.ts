import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import type {
  CodeforcesReport,
  ContestsPartialPayload,
  ProblemSearchRequest,
  ProblemSearchResult,
  PracticeProblem,
  PracticeProblemUpdate,
  CompanionStatus,
} from '../shared/types';

// Only expose whitelisted APIs, never expose ipcRenderer directly
const api = {
  getRecentContests: (day: number): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CONTESTS, day),

  getRating: (platform: string, name: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_RATING, { platform, name }),

  getSolvedNum: (platform: string, name: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SOLVED_NUM, { platform, name }),

  openUrl: (url: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.OPEN_URL, url),

  installUpdate: (url: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATER_INSTALL, { url }),

  /** Subscribe to streaming partial contest results */
  onContestsPartial: (callback: (data: ContestsPartialPayload) => void): (() => void) => {
    const handler = (_event: unknown, data: ContestsPartialPayload) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.CONTESTS_PARTIAL, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.CONTESTS_PARTIAL, handler);
    };
  },

  onRefreshContestsRequested: (callback: () => void): (() => void) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.REFRESH_CONTESTS, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.REFRESH_CONTESTS, handler);
    };
  },

  searchProblems: (payload: ProblemSearchRequest): Promise<ProblemSearchResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_PROBLEMS, payload),

  getCodeforcesReport: (handle: string): Promise<CodeforcesReport> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CF_REPORT, handle),

  listPracticeProblems: (): Promise<PracticeProblem[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.LIST_PRACTICE_PROBLEMS),

  updatePracticeProblem: (
    id: string,
    updates: PracticeProblemUpdate,
  ): Promise<PracticeProblem | null> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PRACTICE_PROBLEM, id, updates),

  deletePracticeProblem: (id: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_PRACTICE_PROBLEM, id),

  getCompanionStatus: (): Promise<CompanionStatus> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_COMPANION_STATUS),

  onPracticeImported: (callback: (problem: PracticeProblem) => void): (() => void) => {
    const handler = (_event: unknown, problem: PracticeProblem) => callback(problem);
    ipcRenderer.on(IPC_CHANNELS.PRACTICE_IMPORTED, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.PRACTICE_IMPORTED, handler);
    };
  },

  copyText: (text: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.COPY_TEXT, text),

  clearCache: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.CLEAR_CACHE),

  minimizeWindow: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),

  toggleMaximizeWindow: (): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE),

  closeWindow: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),

  getWindowState: (): Promise<{ maximized: boolean }> =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_GET_STATE),

  onWindowStateChanged: (callback: (state: { maximized: boolean }) => void): (() => void) => {
    const handler = (_event: unknown, state: { maximized: boolean }) => callback(state);
    ipcRenderer.on(IPC_CHANNELS.WINDOW_STATE_CHANGED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.WINDOW_STATE_CHANGED, handler);
  },

  getAutoLaunch: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.AUTO_LAUNCH_GET),

  setAutoLaunch: (enabled: boolean): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTO_LAUNCH_SET, enabled),

  /** Set notification preferences */
  setNotification: (payload: { enabled: boolean; reminderMinutes: number }): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_SET, payload),

  /** Get notification preferences */
  getNotification: (): Promise<{ enabled: boolean; reminderMinutes: number }> =>
    ipcRenderer.invoke(IPC_CHANNELS.NOTIFICATION_GET),
};

const storeApi = {
  get: (key: string): Promise<unknown> => ipcRenderer.invoke(IPC_CHANNELS.STORE_GET, key),

  set: (key: string, value: unknown): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.STORE_SET, key, value),

  getAll: (): Promise<Record<string, unknown>> => ipcRenderer.invoke(IPC_CHANNELS.STORE_GET_ALL),
};

export type ElectronApi = typeof api;
export type StoreApi = typeof storeApi;

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('store', storeApi);
