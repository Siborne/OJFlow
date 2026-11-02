import { describe, expect, test } from 'bun:test';
import { AxiosError } from 'axios';
import { BaseAdapter } from '../../electron/services/adapters/base-adapter';
import { CodeforcesAdapter } from '../../electron/services/adapters/codeforces.adapter';
import { AtCoderAdapter } from '../../electron/services/adapters/atcoder.adapter';
import { LeetCodeAdapter } from '../../electron/services/adapters/leetcode.adapter';
import { LuoguAdapter } from '../../electron/services/adapters/luogu.adapter';
import { LanqiaoAdapter } from '../../electron/services/adapters/lanqiao.adapter';
import { NowcoderAdapter } from '../../electron/services/adapters/nowcoder.adapter';
import { VJudgeAdapter } from '../../electron/services/adapters/vjudge.adapter';
import { HduAdapter } from '../../electron/services/adapters/hdu.adapter';
import { PojAdapter } from '../../electron/services/adapters/poj.adapter';
import { QojAdapter } from '../../electron/services/adapters/qoj.adapter';
import {
  getAllAdapters,
  getContestAdapters,
  getRatingAdapters,
  getSolvedAdapters,
} from '../../electron/services/adapters';

interface FakeResponse {
  status: number;
  data: unknown;
}

interface FakeHttp {
  get(url: string, config?: unknown): Promise<FakeResponse>;
  post(url: string, data?: unknown, config?: unknown): Promise<FakeResponse>;
}

function injectHttp(adapter: BaseAdapter, http: Partial<FakeHttp>): void {
  const target = adapter as unknown as { http: FakeHttp };
  target.http = {
    get: http.get ?? (async () => ({ status: 200, data: {} })),
    post: http.post ?? (async () => ({ status: 200, data: {} })),
  };
}

const future = Math.floor(Date.now() / 1000) + 3600;
const later = future + 86400;

class ExposedAdapter extends BaseAdapter {
  readonly id = 'test';
  readonly displayName = 'Test';

  run<T>(operation: () => Promise<T>, fallback: T) {
    return this.safeFetch(operation, fallback);
  }
}

describe('BaseAdapter', () => {
  test('reports success and elapsed time', async () => {
    const result = await new ExposedAdapter().run(async () => 42, 0);
    expect(result.success).toBe(true);
    expect(result.data).toBe(42);
    expect(result.platform).toBe('Test');
    expect(result.elapsed).toBeGreaterThanOrEqual(0);
  });

  test('classifies generic and network errors', async () => {
    const unknownResult = await new ExposedAdapter().run(async () => {
      throw new Error('bad data');
    }, 'fallback');
    expect(unknownResult.success).toBe(false);
    expect(unknownResult.errorType).toBe('unknown');
    expect(unknownResult.data).toBe('fallback');

    const networkResult = await new ExposedAdapter().run(async () => {
      throw new AxiosError('offline', 'ENOTFOUND');
    }, 0);
    expect(networkResult.success).toBe(false);
    expect(networkResult.errorType).toBe('network');

    const timeoutResult = await new ExposedAdapter().run(async () => {
      throw new AxiosError('timeout', 'ECONNABORTED');
    }, 0);
    expect(timeoutResult.errorType).toBe('timeout');

    const parseResult = await new ExposedAdapter().run(async () => {
      throw new SyntaxError('json');
    }, 0);
    expect(parseResult.errorType).toBe('parse');
  });

  test('default health check succeeds', async () => {
    await expect(new ExposedAdapter().healthCheck()).resolves.toBe(true);
  });
});

describe('adapter registry', () => {
  test('registers all ten platforms and capability filters', () => {
    expect(getAllAdapters()).toHaveLength(10);
    expect(
      getContestAdapters()
        .map(adapter => adapter.id)
        .sort(),
    ).toEqual(['atcoder', 'codeforces', 'lanqiao', 'leetcode', 'luogu', 'nowcoder']);
    expect(getRatingAdapters()).toHaveLength(5);
    expect(getSolvedAdapters()).toHaveLength(10);
  });
});

describe('CodeforcesAdapter', () => {
  test('parses contests, rating and solved count', async () => {
    const adapter = new CodeforcesAdapter();
    injectHttp(adapter, {
      get: async url => {
        if (url.includes('contest.list')) {
          return {
            status: 200,
            data: {
              status: 'OK',
              result: [
                { id: 100, name: 'Upcoming', startTimeSeconds: future, durationSeconds: 7200 },
                {
                  id: 99,
                  name: 'Past',
                  startTimeSeconds: future - 10 * 86400,
                  durationSeconds: 3600,
                },
                { id: 101, name: 'Too Far', startTimeSeconds: later * 20, durationSeconds: 7200 },
              ],
            },
          };
        }
        if (url.includes('user.info')) {
          return {
            status: 200,
            data: { status: 'OK', result: [{ rating: 1800, maxRating: 2000 }] },
          };
        }
        return { status: 200, data: { data: { solved: 321 } } };
      },
    });

    const contests = await adapter.fetchContests(2);
    expect(contests).toHaveLength(1);
    expect(contests[0].link).toBe('https://codeforces.com/contest/100');
    await expect(adapter.fetchRating('u')).resolves.toEqual({
      name: 'u',
      curRating: 1800,
      maxRating: 2000,
    });
    await expect(adapter.fetchSolvedCount('u')).resolves.toEqual({ name: 'u', solvedNum: 321 });
    await expect(adapter.healthCheck()).resolves.toBe(true);
  });

  test('rejects invalid API payloads', async () => {
    const adapter = new CodeforcesAdapter();
    injectHttp(adapter, {
      get: async () => ({ status: 200, data: { status: 'FAILED', result: {} } }),
    });
    await expect(adapter.fetchContests(1)).rejects.toThrow();
    await expect(adapter.fetchRating('u')).rejects.toThrow();
    await expect(adapter.fetchSolvedCount('u')).rejects.toThrow();
  });
});

describe('AtCoderAdapter', () => {
  test('parses contests, rating and solved count', async () => {
    const adapter = new AtCoderAdapter();
    const contestTime = new Date(future * 1000).toISOString().slice(0, 19).replace('T', ' ');
    injectHttp(adapter, {
      get: async url => {
        if (url.endsWith('/contests/')) {
          return {
            status: 200,
            data: `<table id="contest-table-upcoming"><tbody><tr>
              <td><a>${contestTime}+0000</a></td>
              <td><a href="/contests/abc123">AtCoder Beginner Contest 123（ABC123）</a></td>
              <td>02:00</td>
            </tr></tbody></table>`,
          };
        }
        if (url.includes('/users/')) {
          return {
            status: 200,
            data: `<table class="dl-table mt-2"><tr><th>x</th></tr>
              <tr><td>Rating</td><td><span>1555</span></td></tr>
              <tr><td>Highest</td><td><span>1700</span></td></tr>
            </table>`,
          };
        }
        return { status: 200, data: { count: 432 } };
      },
    });
    const contests = await adapter.fetchContests(2);
    expect(contests[0].name).toBe('ABC123');
    expect(contests[0].duration).toBe(7200);
    await expect(adapter.fetchRating('u')).resolves.toEqual({
      name: 'u',
      curRating: 1555,
      maxRating: 1700,
    });
    await expect(adapter.fetchSolvedCount('u')).resolves.toEqual({ name: 'u', solvedNum: 432 });
  });

  test('throws when the contest table is unavailable', async () => {
    const adapter = new AtCoderAdapter();
    injectHttp(adapter, { get: async () => ({ status: 200, data: '<div>empty</div>' }) });
    await expect(adapter.fetchContests(1)).rejects.toThrow('Cannot find contest table');
  });
});

describe('LeetCodeAdapter', () => {
  test('parses contests, rating history and solved count', async () => {
    const adapter = new LeetCodeAdapter();
    injectHttp(adapter, {
      post: async (_url, body) => {
        const query = String((body as { query?: string })?.query ?? '');
        if (query.includes('contestUpcomingContests')) {
          return {
            status: 200,
            data: {
              data: {
                contestUpcomingContests: [
                  { title: 'Weekly', startTime: future, duration: 5400, titleSlug: 'weekly' },
                ],
              },
            },
          };
        }
        if (query.includes('userContestRankingHistory')) {
          return {
            status: 200,
            data: {
              data: {
                userContestRankingHistory: [
                  { attended: true, rating: 1500.4 },
                  { attended: false, rating: 1800 },
                  { attended: true, rating: 1640.6 },
                ],
              },
            },
          };
        }
        return {
          status: 200,
          data: {
            data: {
              userProfileUserQuestionProgressV2: {
                numAcceptedQuestions: [{ count: 100 }, { count: 25 }],
              },
            },
          },
        };
      },
    });
    const contests = await adapter.fetchContests(2);
    expect(contests[0].link).toBe('https://leetcode.cn/contest/weekly');
    await expect(adapter.fetchRating('u')).resolves.toEqual({
      name: 'u',
      curRating: 1641,
      maxRating: 1641,
    });
    await expect(adapter.fetchSolvedCount('u')).resolves.toEqual({ name: 'u', solvedNum: 125 });
  });

  test('returns zero for users without attended contests', async () => {
    const adapter = new LeetCodeAdapter();
    injectHttp(adapter, {
      post: async () => ({
        status: 200,
        data: { data: { userContestRankingHistory: [{ attended: false, rating: 0 }] } },
      }),
    });
    await expect(adapter.fetchRating('u')).resolves.toEqual({
      name: 'u',
      curRating: 0,
      maxRating: 0,
    });
  });
});

describe('LuoguAdapter', () => {
  test('parses contests, rating history and solved count', async () => {
    const adapter = new LuoguAdapter();
    injectHttp(adapter, {
      get: async url => {
        if (url.includes('/contest/list')) {
          return {
            status: 200,
            data: {
              currentData: {
                contests: {
                  result: [
                    {
                      rated: true,
                      name: 'Rated',
                      startTime: future,
                      endTime: future + 7200,
                      id: 7,
                    },
                    {
                      rated: false,
                      name: 'Unrated',
                      startTime: future,
                      endTime: future + 7200,
                      id: 8,
                    },
                  ],
                },
              },
            },
          };
        }
        if (url.includes('/api/user/search')) {
          return { status: 200, data: { users: [{ uid: 123 }] } };
        }
        if (url.includes('/api/rating/elo')) {
          return {
            status: 200,
            data: { records: { result: [{ rating: 1200 }, { rating: 1700 }, { rating: 1400 }] } },
          };
        }
        return {
          status: 200,
          data: `<script type="application/json">{"data":{"user":{"passedProblemCount":456}}}</script>`,
        };
      },
    });
    const contests = await adapter.fetchContests(2);
    expect(contests).toHaveLength(1);
    expect(contests[0].name).toBe('Rated');
    await expect(adapter.fetchRating('u')).resolves.toEqual({
      name: 'u',
      curRating: 1200,
      maxRating: 1700,
    });
    await expect(adapter.fetchSolvedCount('u')).resolves.toEqual({ name: 'u', solvedNum: 456 });
  });
});

describe('LanqiaoAdapter', () => {
  test('parses contests and paginated solved count', async () => {
    const adapter = new LanqiaoAdapter();
    injectHttp(adapter, {
      get: async url => {
        if (url.includes('/api/v2/contests/')) {
          return {
            status: 200,
            data: [
              {
                name: 'Lanqiao Cup',
                open_at: new Date(future * 1000).toISOString(),
                end_at: new Date((future + 7200) * 1000).toISOString(),
                html_url: '/contests/1',
              },
            ],
          };
        }
        if (url.includes('/users/')) return { status: 200, data: '<html></html>' };
        return {
          status: 200,
          data: { data: [{ user_id: 'u', problem_count: 88 }] },
        };
      },
    });
    const contests = await adapter.fetchContests(2);
    expect(contests[0].link).toBe('https://www.lanqiao.cn/contests/1');
    await expect(adapter.fetchSolvedCount('u')).resolves.toEqual({ name: 'u', solvedNum: 88 });
  });
});

describe('NowcoderAdapter', () => {
  test('parses contest HTML, rating and solved count', async () => {
    const adapter = new NowcoderAdapter();
    const start = new Date(future * 1000).toISOString().slice(0, 16).replace('T', ' ');
    const end = new Date((future + 7200) * 1000).toISOString().slice(0, 16).replace('T', ' ');
    injectHttp(adapter, {
      get: async url => {
        if (url.includes('vip-index')) {
          return {
            status: 200,
            data: `<div class="platform-item-main"><a href="/acm/contest/1">Weekly</a>
              <span class="match-time-icon">${start} - ${end}</span></div>`,
          };
        }
        if (url.includes('rating-history')) {
          return {
            status: 200,
            data: { data: [{ rating: 1300 }, { rating: 1650 }, { rating: 1500 }] },
          };
        }
        return { status: 200, data: { data: { solved: 77 } } };
      },
    });
    const contests = await adapter.fetchContests(2);
    expect(contests[0].name).toBe('Weekly');
    await expect(adapter.fetchRating('u')).resolves.toEqual({
      name: 'u',
      curRating: 1500,
      maxRating: 1650,
    });
    await expect(adapter.fetchSolvedCount('u')).resolves.toEqual({ name: 'u', solvedNum: 77 });
  });
});

describe('simple solved adapters', () => {
  test('VJudge parses Overall row', async () => {
    const adapter = new VJudgeAdapter();
    injectHttp(adapter, {
      get: async () => ({
        status: 200,
        data: '<table><tr><td>Overall</td><td><a>240</a></td></tr></table>',
      }),
    });
    await expect(adapter.fetchSolvedCount('u')).resolves.toEqual({ name: 'u', solvedNum: 240 });
  });

  test('HDU and POJ use the ojhunt payload', async () => {
    const hdu = new HduAdapter();
    const poj = new PojAdapter();
    injectHttp(hdu, { get: async () => ({ status: 200, data: { data: { solved: 11 } } }) });
    injectHttp(poj, { get: async () => ({ status: 200, data: { data: { solved: 12 } } }) });
    await expect(hdu.fetchSolvedCount('u')).resolves.toEqual({ name: 'u', solvedNum: 11 });
    await expect(poj.fetchSolvedCount('u')).resolves.toEqual({ name: 'u', solvedNum: 12 });
  });

  test('QOJ parses the profile count', async () => {
    const adapter = new QojAdapter();
    injectHttp(adapter, {
      get: async () => ({ status: 200, data: '<div>Accepted problems：345 problems</div>' }),
    });
    await expect(adapter.fetchSolvedCount('u')).resolves.toEqual({ name: 'u', solvedNum: 345 });
  });
});
