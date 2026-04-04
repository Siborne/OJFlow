declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  const component: DefineComponent<{}, {}, unknown>;
  export default component;
}

interface ElectronApi {
  getRecentContests(day: number): Promise<unknown[]>;
  getRating(platform: string, name: string): Promise<unknown>;
  getSolvedNum(platform: string, name: string): Promise<unknown>;
  openUrl(url: string): Promise<void>;
  installUpdate(url: string): Promise<boolean>;
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
