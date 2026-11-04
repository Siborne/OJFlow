import { describe, expect, test } from 'bun:test';
import type { ScheduleItem } from '../../shared/types';
import {
  getDashboardSchedules,
  getSchedulePageItems,
  isScheduleExpired,
  isScheduleToday,
} from '../../src/utils/schedule';

function item(id: string, startsAt: string, options: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id,
    title: id,
    startsAt,
    durationMinutes: 60,
    kind: 'practice',
    completed: false,
    createdAt: 1,
    ...options,
  };
}

describe('schedule utilities', () => {
  const now = new Date('2026-11-04T12:00:00').getTime();
  const items = [
    item('yesterday', '2026-11-03T10:00'),
    item('today', '2026-11-04T13:00'),
    item('tomorrow', '2026-11-05T09:00'),
    item('done', '2026-11-03T08:00', { completed: true }),
  ];

  test('detects today and expired schedules', () => {
    expect(isScheduleToday(items[1], now)).toBe(true);
    expect(isScheduleToday(items[2], now)).toBe(false);
    expect(isScheduleExpired(items[0], now)).toBe(true);
    expect(isScheduleExpired(items[3], now)).toBe(false);
  });

  test('filters workbench schedules by today or upcoming scope', () => {
    expect(getDashboardSchedules(items, 'today', now).map(value => value.id)).toEqual(['today']);
    expect(getDashboardSchedules(items, 'upcoming', now).map(value => value.id)).toEqual([
      'today',
      'tomorrow',
    ]);
  });

  test('filters the full schedule page', () => {
    expect(getSchedulePageItems(items, 'expired', now).map(value => value.id)).toEqual([
      'yesterday',
    ]);
    expect(getSchedulePageItems(items, 'completed', now).map(value => value.id)).toEqual(['done']);
    expect(getSchedulePageItems(items, 'all', now)).toHaveLength(4);
  });
});
