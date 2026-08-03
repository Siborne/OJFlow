interface ElectronApi {
  getRecentContests(day: number): Promise<unknown[]>;
  getRating(platform: string, name: string): Promise<unknown>;
  getSolvedNum(platform: string, name: string): Promise<unknown>;
  openUrl(url: string): Promise<void>;
  installUpdate(url: string): Promise<boolean>;
  onContestsPartial(
    callback: (data: { platform: string; contests: unknown[] }) => void,
  ): () => void;
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
