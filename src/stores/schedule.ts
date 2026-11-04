import { create } from 'zustand';
import type { Contest, ScheduleItem } from '../../shared/types';
import { isScheduleExpired } from '../utils/schedule';

const SCHEDULE_KEY = 'ojflow_schedule';

interface NewScheduleItem {
  title: string;
  startsAt: string;
  durationMinutes: number;
  kind: ScheduleItem['kind'];
  note?: string;
  platform?: string;
  url?: string;
}

interface ScheduleState {
  items: ScheduleItem[];
  initialized: boolean;
  init: () => Promise<void>;
  addItem: (item: NewScheduleItem) => ScheduleItem;
  toggleCompleted: (id: string) => void;
  removeItem: (id: string) => void;
  removeExpired: (now?: number) => number;
  syncFavoriteContest: (contest: Contest, shouldExist: boolean) => void;
}

function isScheduleItem(value: unknown): value is ScheduleItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.startsAt === 'string' &&
    typeof item.durationMinutes === 'number' &&
    (item.kind === 'contest' ||
      item.kind === 'practice' ||
      item.kind === 'review' ||
      item.kind === 'custom') &&
    typeof item.completed === 'boolean' &&
    typeof item.createdAt === 'number' &&
    (item.platform === undefined || typeof item.platform === 'string') &&
    (item.url === undefined || typeof item.url === 'string')
  );
}

function readLocalSchedule(): ScheduleItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SCHEDULE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isScheduleItem) : [];
  } catch {
    return [];
  }
}

function sortItems(items: ScheduleItem[]): ScheduleItem[] {
  return items.slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function persist(items: ScheduleItem[]): void {
  try {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(items));
  } catch {
    // Keep the in-memory schedule when localStorage is unavailable.
  }
  if (typeof window !== 'undefined') {
    window.store?.set('schedule', items).catch(() => {});
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function contestKey(contest: Contest): string {
  return [
    contest.platform.trim().toLowerCase(),
    contest.startTimeSeconds,
    contest.link?.trim().toLowerCase() || contest.name.trim().toLowerCase(),
  ].join('|');
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  items: readLocalSchedule(),
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    try {
      const stored = await window.store?.get('schedule');
      if (Array.isArray(stored)) {
        set({ items: sortItems(stored.filter(isScheduleItem)) });
      }
    } catch {
      // Keep local data on failure.
    }
    set({ initialized: true });
  },

  addItem: item => {
    const nextItem: ScheduleItem = {
      id: createId(),
      title: item.title.trim(),
      startsAt: item.startsAt,
      durationMinutes: Math.max(1, Math.floor(item.durationMinutes)),
      kind: item.kind,
      note: item.note?.trim() || undefined,
      completed: false,
      createdAt: Date.now(),
      autoCreated: false,
      platform: item.platform?.trim() || undefined,
      url: item.url?.trim() || undefined,
    };
    const items = sortItems([...get().items, nextItem]);
    set({ items });
    persist(items);
    return nextItem;
  },

  toggleCompleted: id => {
    const items = get().items.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item,
    );
    set({ items });
    persist(items);
  },

  removeItem: id => {
    const items = get().items.filter(item => item.id !== id);
    set({ items });
    persist(items);
  },

  removeExpired: (now = Date.now()) => {
    const current = get().items;
    const items = current.filter(item => !isScheduleExpired(item, now));
    const removed = current.length - items.length;
    if (removed > 0) {
      set({ items });
      persist(items);
    }
    return removed;
  },

  syncFavoriteContest: (contest, shouldExist) => {
    const key = contestKey(contest);
    const current = get().items;
    const linked = current.find(item => item.contestKey === key);

    if (!shouldExist) {
      if (!linked) return;
      const items = current.filter(item => item.contestKey !== key);
      set({ items });
      persist(items);
      return;
    }

    if (linked) return;
    const startsAt = new Date(contest.startTimeSeconds * 1000).toISOString();
    const item: ScheduleItem = {
      id: createId(),
      title: contest.name,
      startsAt,
      durationMinutes: Math.max(1, Math.round(contest.durationSeconds / 60)),
      kind: 'contest',
      note: contest.platform,
      completed: false,
      createdAt: Date.now(),
      contestKey: key,
      autoCreated: true,
      platform: contest.platform,
      url: contest.link,
    };
    const items = sortItems([...current, item]);
    set({ items });
    persist(items);
  },
}));
