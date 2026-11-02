import type {
  CodeforcesReport,
  ContestFetchResponse,
  ContestsPartialPayload,
  ProblemSearchRequest,
  ProblemSearchResult,
  RawContest,
} from '../../shared/types';

declare global {
  interface ElectronApi {
    getRecentContests(day: number): Promise<ContestFetchResponse | RawContest[]>;
    getRating(platform: string, name: string): Promise<unknown>;
    getSolvedNum(platform: string, name: string): Promise<unknown>;
    openUrl(url: string): Promise<void>;
    installUpdate(url: string): Promise<boolean>;
    onContestsPartial(callback: (data: ContestsPartialPayload) => void): () => void;
    onRefreshContestsRequested(callback: () => void): () => void;
    searchProblems(payload: ProblemSearchRequest): Promise<ProblemSearchResult>;
    getCodeforcesReport(handle: string): Promise<CodeforcesReport>;
    clearCache(): Promise<void>;
    minimizeWindow(): Promise<void>;
    toggleMaximizeWindow(): Promise<void>;
    closeWindow(): Promise<void>;
    getWindowState(): Promise<{ maximized: boolean }>;
    onWindowStateChanged(callback: (state: { maximized: boolean }) => void): () => void;
    getAutoLaunch(): Promise<boolean>;
    setAutoLaunch(enabled: boolean): Promise<void>;
    setNotification(config: { enabled: boolean; reminderMinutes: number }): Promise<void>;
    getNotification(): Promise<{ enabled: boolean; reminderMinutes: number }>;
  }

  interface StoreApi {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    getAll(): Promise<Record<string, unknown>>;
  }

  interface Window {
    api: ElectronApi;
    store: StoreApi;
  }
}

export {};
