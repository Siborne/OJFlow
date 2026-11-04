import type { Contest, DashboardScheduleScope, ScheduleItem } from '../../shared/types';
import { PLATFORM_LOGOS } from './platform-assets';

export type SchedulePageFilter = 'today' | 'upcoming' | 'completed' | 'expired' | 'all';

export function scheduleStart(item: ScheduleItem): number {
  return new Date(item.startsAt).getTime();
}

export function scheduleEnd(item: ScheduleItem): number {
  return scheduleStart(item) + Math.max(1, item.durationMinutes) * 60_000;
}

export function isScheduleExpired(item: ScheduleItem, now = Date.now()): boolean {
  return !item.completed && scheduleEnd(item) < now;
}

function localDayStart(value: number): number {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function isScheduleToday(item: ScheduleItem, now = Date.now()): boolean {
  const start = scheduleStart(item);
  const dayStart = localDayStart(now);
  const nextDay = new Date(dayStart);
  nextDay.setDate(nextDay.getDate() + 1);
  return start < nextDay.getTime() && scheduleEnd(item) >= dayStart;
}

export function sortSchedules(items: ScheduleItem[]): ScheduleItem[] {
  return items.slice().sort((a, b) => scheduleStart(a) - scheduleStart(b));
}

export function getDashboardSchedules(
  items: ScheduleItem[],
  scope: DashboardScheduleScope,
  now = Date.now(),
): ScheduleItem[] {
  return sortSchedules(items).filter(item => {
    if (isScheduleExpired(item, now)) return false;
    if (scope === 'today') return isScheduleToday(item, now);
    return scheduleEnd(item) >= now || scheduleStart(item) >= localDayStart(now);
  });
}

export function getSchedulePageItems(
  items: ScheduleItem[],
  filter: SchedulePageFilter,
  now = Date.now(),
): ScheduleItem[] {
  const matching = items.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'today') return isScheduleToday(item, now);
    if (filter === 'upcoming') return !item.completed && scheduleEnd(item) >= now;
    if (filter === 'completed') return item.completed;
    return isScheduleExpired(item, now);
  });
  return sortSchedules(matching);
}

export function resolveSchedulePlatform(
  item: ScheduleItem,
  contests: Contest[],
): string | undefined {
  if (item.platform) return item.platform;
  if (item.note && PLATFORM_LOGOS[item.note]) return item.note;
  return contests.find(contest => contest.name === item.title)?.platform;
}

export function resolveScheduleUrl(item: ScheduleItem, contests: Contest[]): string | undefined {
  if (item.url) return item.url;
  return contests.find(contest => contest.name === item.title)?.link;
}
