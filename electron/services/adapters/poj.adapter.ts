import { BaseAdapter } from './base-adapter';
import type { SolvedNum } from '../../../shared/types';

export class PojAdapter extends BaseAdapter {
  readonly id = 'poj';
  readonly displayName = 'POJ';

  async fetchSolvedCount(handle: string): Promise<SolvedNum> {
    const url = `https://ojhunt.com/api/crawlers/poj/${encodeURIComponent(handle)}`;
    const response = await this.http.get(url);

    if (response.data?.data?.solved != null) {
      return { name: handle, solvedNum: response.data.data.solved };
    }

    throw new Error('POJ API response invalid');
  }
}
