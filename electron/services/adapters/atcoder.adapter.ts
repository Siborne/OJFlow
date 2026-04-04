import { BaseAdapter } from './base-adapter';
import type { RawContest, Rating, SolvedNum } from '../../../shared/types';

export class AtCoderAdapter extends BaseAdapter {
  readonly id = 'atcoder';
  readonly displayName = 'AtCoder';

  private readonly contestUrl = 'https://atcoder.jp/contests/';
  private readonly userUrl = 'https://atcoder.jp/users/';
  private readonly kenkooooUrl =
    'https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank';

  async fetchContests(days: number): Promise<RawContest[]> {
    const response = await this.http.get(this.contestUrl);
    const $ = this.parseHtml(response.data);
    const contests: RawContest[] = [];

    let rows = $('#contest-table-upcoming tbody tr');
    if (rows.length === 0) {
      // Fallback selector if primary fails
      console.warn('[atcoder] Primary selector found 0 rows, trying fallback');
      rows = $('table tbody tr').filter((_i, el) => $(el).find('td').length >= 3);
      if (rows.length === 0) {
        throw new Error('Cannot find contest table - AtCoder page structure may have changed');
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const todayStart = now - (now % 86400) - new Date().getTimezoneOffset() * 60;
    const queryEnd = todayStart + days * 86400;

    rows.each((_i, el) => {
      try {
        const cols = $(el).find('td');
        if (cols.length < 3) return;

        const timeText = $(cols[0]).find('a').text().trim();
        const titleLink = $(cols[1]).find('a');
        const title = titleLink.text().trim();
        const href = titleLink.attr('href');
        const durationText = $(cols[2]).text().trim();

        if (!timeText || !title) return;

        const startTime = Math.floor(new Date(timeText).getTime() / 1000);
        if (!Number.isFinite(startTime) || startTime < 1_000_000_000) return;

        const parts = durationText.split(':').map(Number);
        const duration = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60;

        if (startTime + duration < todayStart || startTime > queryEnd) return;
        if (duration >= 86400) return;

        const name = title.includes('\uff08')
          ? title.split('\uff08')[1]?.split('\uff09')[0] || title
          : title;

        contests.push({
          name,
          startTime,
          duration,
          platform: this.displayName,
          link: href ? `https://atcoder.jp${href}` : this.contestUrl,
        });
      } catch (parseError) {
        console.warn('[atcoder] Failed to parse contest row:', parseError);
      }
    });

    return contests;
  }

  async fetchRating(handle: string): Promise<Rating> {
    const url = `${this.userUrl}${encodeURIComponent(handle)}`;
    const response = await this.http.get(url);
    const $ = this.parseHtml(response.data);

    let rows = $('.dl-table.mt-2').first().find('tr');
    if (rows.length < 3) {
      rows = $('table.dl-table tr');
    }

    if (rows.length < 3) {
      throw new Error('Cannot parse AtCoder rating page');
    }

    const curRating = parseInt($(rows[1]).find('span').first().text(), 10);
    const maxRating = parseInt($(rows[2]).find('span').first().text(), 10);

    return {
      name: handle,
      curRating: Number.isFinite(curRating) ? curRating : 0,
      maxRating: Number.isFinite(maxRating) ? maxRating : 0,
    };
  }

  async fetchSolvedCount(handle: string): Promise<SolvedNum> {
    const url = `${this.kenkooooUrl}?user=${encodeURIComponent(handle)}`;
    const response = await this.http.get(url);
    const count = response.data?.count;
    return {
      name: handle,
      solvedNum: typeof count === 'number' ? count : 0,
    };
  }
}
