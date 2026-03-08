import { Contest } from '../types';
import { ContestUtils } from '../utils/contest_utils';

// Electron IPC wrapper
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : {
  invoke: () => Promise.resolve([])
};

export class ContestService {
  static async getRecentContests(day: number = 7): Promise<Contest[]> {
    try {
      const rawContests: any[] = await ipcRenderer.invoke('get-recent-contests', day);
      
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
    await ipcRenderer.invoke('open-url', url);
  }
}
