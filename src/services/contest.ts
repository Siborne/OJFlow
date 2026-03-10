import { Contest } from '../types';
import { ContestUtils } from '../utils/contest_utils';
import appConfig from '../../electron/app.config.json';

const DEFAULT_DAYS = appConfig?.crawl?.defaultDays ?? 7;

function getIpcRenderer(): { invoke: (...args: any[]) => Promise<any> } {
  const maybeWindow = typeof window !== 'undefined' ? window : undefined;
  const req = maybeWindow && typeof maybeWindow.require === 'function' ? maybeWindow.require : undefined;
  const electron = req ? req('electron') : undefined;
  const ipcRenderer = electron?.ipcRenderer;
  if (ipcRenderer && typeof ipcRenderer.invoke === 'function') {
    return ipcRenderer;
  }
  return {
    invoke: () => Promise.resolve([]),
  };
}

export class ContestService {
  static async getRecentContests(day: number = DEFAULT_DAYS): Promise<Contest[]> {
    try {
      const rawContests: any[] = await getIpcRenderer().invoke('get-recent-contests', day);
      
      return rawContests.map(c => ContestUtils.createContest(
        c.name,
        c.startTime,
        c.duration,
        c.platform,
        c.link
      ));
    } catch (error) {
      console.error('Failed to get contests:', error);
      return [];
    }
  }

  static async openUrl(url: string): Promise<void> {
    await getIpcRenderer().invoke('open-url', url);
  }
}
