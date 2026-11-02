import { describe, expect, test } from 'bun:test';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import {
  validateContest,
  validateRating,
  validateSolvedNum,
} from '../../electron/services/validators';
import {
  isAllowedStoreKey,
  isSafeExternalUrl,
  isSafeUpdateUrl,
} from '../../electron/services/url-security';
import { dedup, inflightCount, isInflight } from '../../electron/services/request-dedup';
import { isInTimeWindow } from '../../electron/services/contest-aggregator';

describe('shared IPC contract', () => {
  test('channel names are stable and unique', () => {
    const values = Object.values(IPC_CHANNELS);
    expect(values.length).toBeGreaterThan(10);
    expect(new Set(values).size).toBe(values.length);
    expect(IPC_CHANNELS.GET_CONTESTS).toBe('get-recent-contests');
    expect(IPC_CHANNELS.SEARCH_PROBLEMS).toBe('search-problems');
    expect(IPC_CHANNELS.CLEAR_CACHE).toBe('clear-cache');
  });
});

describe('input validators', () => {
  test('validates contests and rejects malformed values', () => {
    const contest = {
      name: 'Round 1',
      startTime: 1_800_000_000,
      duration: 7200,
      platform: 'Codeforces',
    };
    expect(validateContest(contest)).toBe(true);
    expect(validateContest({ ...contest, name: '' })).toBe(false);
    expect(validateContest({ ...contest, startTime: 1 })).toBe(false);
    expect(validateContest({ ...contest, duration: -1 })).toBe(false);
    expect(validateContest(null)).toBe(false);
  });

  test('validates rating objects', () => {
    expect(validateRating({ name: 'u', curRating: 1500, maxRating: 1900 })).toBe(true);
    expect(validateRating({ name: 'u', curRating: Number.NaN, maxRating: 1 })).toBe(false);
    expect(validateRating({ name: 'u', curRating: 1 })).toBe(false);
  });

  test('validates solved count objects', () => {
    expect(validateSolvedNum({ name: 'u', solvedNum: 0 })).toBe(true);
    expect(validateSolvedNum({ name: 'u', solvedNum: 1 })).toBe(true);
    expect(validateSolvedNum({ name: 'u', solvedNum: -1 })).toBe(false);
    expect(validateSolvedNum({ name: 'u', solvedNum: '1' })).toBe(false);
  });
});

describe('URL and store key security', () => {
  test('allows only web protocols for external URLs', () => {
    expect(isSafeExternalUrl('https://codeforces.com')).toBe(true);
    expect(isSafeExternalUrl('http://example.com/a')).toBe(true);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('file:///C:/Windows/system32/calc.exe')).toBe(false);
    expect(isSafeExternalUrl('')).toBe(false);
    expect(isSafeExternalUrl(`https://example.com/${'a'.repeat(2100)}`)).toBe(false);
  });

  test('requires HTTPS for update packages except local development', () => {
    expect(isSafeUpdateUrl('https://github.com/release/app.exe')).toBe(true);
    expect(isSafeUpdateUrl('http://localhost:3000/app.exe')).toBe(true);
    expect(isSafeUpdateUrl('http://127.0.0.1/app.exe')).toBe(true);
    expect(isSafeUpdateUrl('http://example.com/app.exe')).toBe(false);
    expect(isSafeUpdateUrl('C:\\update\\app.exe')).toBe(false);
  });

  test('restricts persistent store keys to known roots', () => {
    expect(isAllowedStoreKey('ui')).toBe(true);
    expect(isAllowedStoreKey('ui.features')).toBe(true);
    expect(isAllowedStoreKey('ui.closeBehavior')).toBe(true);
    expect(isAllowedStoreKey('schedule')).toBe(true);
    expect(isAllowedStoreKey('contest.selectedPlatforms')).toBe(true);
    expect(isAllowedStoreKey('cache.ratings.Codeforces:user')).toBe(true);
    expect(isAllowedStoreKey('__proto__.polluted')).toBe(false);
    expect(isAllowedStoreKey('unknown.key')).toBe(false);
    expect(isAllowedStoreKey(null)).toBe(false);
  });
});

describe('request deduplication', () => {
  test('shares one in-flight promise and cleans up', async () => {
    let calls = 0;
    let resolveFactory: ((value: string) => void) | undefined;
    const factory = () => {
      calls++;
      return new Promise<string>(resolve => {
        resolveFactory = resolve;
      });
    };

    const first = dedup('same', factory);
    const second = dedup('same', factory);
    expect(first).toBe(second);
    expect(calls).toBe(1);
    expect(isInflight('same')).toBe(true);
    expect(inflightCount()).toBe(1);

    resolveFactory?.('ok');
    await expect(first).resolves.toBe('ok');
    await Promise.resolve();
    expect(isInflight('same')).toBe(false);
    expect(inflightCount()).toBe(0);
  });

  test('cleans up after rejection', async () => {
    const promise = dedup('reject', async () => {
      throw new Error('boom');
    });
    await expect(promise).rejects.toThrow('boom');
    await Promise.resolve();
    expect(isInflight('reject')).toBe(false);
  });

  test('different keys are independent', async () => {
    const [a, b] = await Promise.all([dedup('a', async () => 1), dedup('b', async () => 2)]);
    expect([a, b]).toEqual([1, 2]);
  });
});

describe('contest time window', () => {
  test('keeps future contests inside the requested window', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isInTimeWindow(now + 3600, 3600, 7 * 86400)).toBe(true);
  });

  test('rejects finished, too-far and overlong contests', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(isInTimeWindow(now - 3 * 86400, 3600, 7 * 86400)).toBe(false);
    expect(isInTimeWindow(now + 20 * 86400, 3600, 7 * 86400)).toBe(false);
    expect(isInTimeWindow(now + 60, 86400, 7 * 86400)).toBe(false);
  });
});
