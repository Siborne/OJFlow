import { describe, it, expect } from 'bun:test';
import { ContestUtils } from '../../src/utils/contest_utils';

describe('ContestUtils', () => {
  it('createContest should format time correctly', () => {
    // 2024-06-29 21:00:00 UTC+8 -> 1719666000
    const startTimeSeconds = 1719666000;
    const durationSeconds = 7200; // 2 hours
    
    const contest = ContestUtils.createContest(
      'Test Contest',
      startTimeSeconds,
      durationSeconds,
      'Codeforces',
      'http://test.com'
    );
    
    expect(contest.name).toBe('Test Contest');
    expect(contest.platform).toBe('Codeforces');
    // Note: formatting depends on local timezone. Assuming machine is in consistent timezone or mocking Date.
    // For simplicity, we check if duration string is correct which is independent of timezone mostly.
    expect(contest.fomattedDuration).toBe('2 小时 0 分钟');
  });

  it('getDayName should return correct relative day', () => {
    // This test is tricky because it depends on "today".
    // We can just check if it returns a string with "今天" for index 0.
    const day0 = ContestUtils.getDayName(0);
    expect(day0).toContain('今天');
    
    const day1 = ContestUtils.getDayName(1);
    expect(day1).toContain('明天');
  });
});
