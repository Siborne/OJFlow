import { SolvedNum } from '../types';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : {
  invoke: () => Promise.resolve({})
};

export class SolvedNumService {
  static async getSolvedNum(platform: string, name: string): Promise<SolvedNum> {
    return await ipcRenderer.invoke('get-solved-num', { platform, name });
  }
}
