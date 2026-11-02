import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { installDom } from './helpers';
import { ContestService } from '../../src/services/contest';
import { RatingService } from '../../src/services/rating';
import { SolvedNumService } from '../../src/services/solved';
import { ProblemService } from '../../src/services/problem';
import { ReportService } from '../../src/services/report';
import type {
  CodeforcesReport,
  ContestFetchResponse,
  ProblemSearchResult,
} from '../../shared/types';

let dom: ReturnType<typeof installDom>;

function setApi(api: Partial<ElectronApi>): void {
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: api as ElectronApi,
  });
}

beforeAll(() => {
  dom = installDom();
});

afterAll(() => {
  dom.window.close();
});

beforeEach(() => {
  setApi({});
});

describe('ContestService', () => {
  test('maps normalized contest response', async () => {
    const response: ContestFetchResponse = {
      contests: [
        {
          name: 'Round',
          startTime: 1_800_000_000,
          duration: 3600,
          platform: 'Codeforces',
          link: 'https://codeforces.com/contest/1',
        },
      ],
      platformStatus: [{ platform: 'Codeforces', success: true, elapsed: 5 }],
      totalElapsed: 9,
      fromCache: true,
      cachedAt: 123,
    };
    setApi({ getRecentContests: async () => response });
    const result = await ContestService.getRecentContests(3);
    expect(result.contests[0].name).toBe('Round');
    expect(result.contests[0].duration).toBe('1 小时 0 分钟');
    expect(result.platformStatus).toEqual(response.platformStatus);
    expect(result.fromCache).toBe(true);
    expect(result.cachedAt).toBe(123);
  });

  test('supports legacy raw contest arrays', async () => {
    setApi({
      getRecentContests: async () => [
        { name: 'Legacy', startTime: 1_800_000_000, duration: 60, platform: 'AtCoder' },
      ],
    });
    const result = await ContestService.getRecentContests();
    expect(result.contests[0].name).toBe('Legacy');
    expect(result.platformStatus).toEqual([]);
  });

  test('delegates URL, update and cache actions', async () => {
    const calls: string[] = [];
    setApi({
      openUrl: async url => {
        calls.push(`open:${url}`);
      },
      installUpdate: async url => {
        calls.push(`install:${url}`);
        return true;
      },
      clearCache: async () => {
        calls.push('clear');
      },
    });
    await ContestService.openUrl('https://example.com');
    await ContestService.installUpdate('https://example.com/app.exe');
    await ContestService.clearCache();
    expect(calls).toEqual([
      'open:https://example.com',
      'install:https://example.com/app.exe',
      'clear',
    ]);
  });
});

describe('simple frontend services', () => {
  test('RatingService forwards typed data', async () => {
    setApi({ getRating: async () => ({ name: 'u', curRating: 1, maxRating: 2 }) });
    await expect(RatingService.getRating('Codeforces', 'u')).resolves.toEqual({
      name: 'u',
      curRating: 1,
      maxRating: 2,
    });
  });

  test('SolvedNumService forwards typed data', async () => {
    setApi({ getSolvedNum: async () => ({ name: 'u', solvedNum: 9 }) });
    await expect(SolvedNumService.getSolvedNum('QOJ', 'u')).resolves.toEqual({
      name: 'u',
      solvedNum: 9,
    });
  });

  test('ProblemService forwards search requests', async () => {
    const response: ProblemSearchResult = {
      problems: [],
      total: 0,
      page: 1,
      pageSize: 40,
      sources: [{ platform: 'Codeforces', success: true, count: 0 }],
    };
    setApi({ searchProblems: async request => (request.query === 'dp' ? response : response) });
    await expect(ProblemService.search({ query: 'dp' })).resolves.toEqual(response);
  });

  test('ReportService forwards report requests', async () => {
    const report: CodeforcesReport = {
      handle: 'u',
      totalSolved: 1,
      ratingStats: [],
      tagStats: [],
    };
    setApi({ getCodeforcesReport: async handle => ({ ...report, handle }) });
    await expect(ReportService.getCodeforcesReport('tourist')).resolves.toEqual({
      ...report,
      handle: 'tourist',
    });
  });
});
