import type {
  CodeforcesReport,
  ContestFetchResponse,
  ContestsPartialPayload,
  ProblemSearchRequest,
  ProblemSearchResult,
  PracticeProblem,
  PracticeProblemUpdate,
  RawContest,
  CompanionStatus,
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
    listPracticeProblems(): Promise<PracticeProblem[]>;
    createPracticeProblem(payload: unknown): Promise<PracticeProblem | null>;
    updatePracticeProblem(
      id: string,
      updates: PracticeProblemUpdate,
    ): Promise<PracticeProblem | null>;
    deletePracticeProblem(id: string): Promise<boolean>;
    getCompanionStatus(): Promise<CompanionStatus>;
    onPracticeImported(callback: (problem: PracticeProblem) => void): () => void;
    onNavigateTo(callback: (path: string) => void): () => void;
    copyText(text: string): Promise<void>;
    clearCache(): Promise<void>;
    minimizeWindow(): Promise<void>;
    toggleMaximizeWindow(): Promise<void>;
    closeWindow(): Promise<void>;
    getWindowState(): Promise<{ maximized: boolean }>;
    onWindowStateChanged(callback: (state: { maximized: boolean }) => void): () => void;
    getAutoLaunch(): Promise<boolean>;
    setAutoLaunch(enabled: boolean): Promise<void>;
    setGlobalTemplateShortcut(accelerator: string): Promise<{ success: boolean; error?: string }>;
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
