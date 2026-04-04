import { BaseAdapter } from './base-adapter';
import type { SolvedNum } from '../../../shared/types';

export class HduAdapter extends BaseAdapter {
  readonly id = 'hdu';
  readonly displayName = 'HDU';

  async fetchSolvedCount(handle: string): Promise<SolvedNum> {
    const url = `https://ojhunt.com/api/crawlers/hdu/${encodeURIComponent(handle)}`;
    const response = await this.http.get(url);

    if (response.data?.data?.solved != null) {
      return { name: handle, solvedNum: response.data.data.solved };
    }

    throw new Error('HDU API response invalid');
  }
}
