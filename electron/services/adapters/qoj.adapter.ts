import { BaseAdapter } from './base-adapter';
import type { SolvedNum } from '../../../shared/types';

export class QojAdapter extends BaseAdapter {
  readonly id = 'qoj';
  readonly displayName = 'QOJ';

  async fetchSolvedCount(handle: string): Promise<SolvedNum> {
    const url = `https://qoj.ac/user/profile/${encodeURIComponent(handle)}`;
    const response = await this.http.get(url);
    const html: string = response.data;

    const match = html.match(/Accepted problems\uff1a(\d+) problems/);
    if (match) {
      return { name: handle, solvedNum: parseInt(match[1], 10) };
    }

    return { name: handle, solvedNum: 0 };
  }
}
