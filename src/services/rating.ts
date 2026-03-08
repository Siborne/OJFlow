import { Rating } from '../types';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : {
  invoke: () => Promise.resolve({})
};

export class RatingService {
  static async getRating(platform: string, name: string): Promise<Rating> {
    return await ipcRenderer.invoke('get-rating', { platform, name });
  }
}
