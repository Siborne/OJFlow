import { afterEach, describe, expect, mock, test } from 'bun:test';
import type { RawContest } from '../../shared/types';

let notificationConfig: { enabled: boolean; reminderMinutes: number } = {
  enabled: false,
  reminderMinutes: 15,
};
let menuTemplate: Array<{ label?: string; click?: () => void; type?: string }> = [];
let shownNotifications: Array<{ title: string; body: string }> = [];
let quitCalled = false;

class FakeElectronStore {
  constructor(_options?: unknown) {}
  get(key: string): unknown {
    return key === 'notification' ? notificationConfig : undefined;
  }
  set(): void {}
  delete(): void {}
}

mock.module('electron-store', () => ({ default: FakeElectronStore }));
mock.module('electron', () => ({
  app: {
    isPackaged: false,
    quit: () => {
      quitCalled = true;
    },
  },
  nativeImage: {
    createFromPath: () => ({
      resize: () => ({}),
    }),
  },
  Menu: {
    buildFromTemplate: (template: typeof menuTemplate) => {
      menuTemplate = template;
      return {};
    },
  },
  Tray: class {
    setToolTip() {}
    setContextMenu() {}
    on() {}
    destroy() {}
  },
  Notification: class {
    static isSupported() {
      return true;
    }
    constructor(private readonly options: { title: string; body: string }) {}
    show() {
      shownNotifications.push(this.options);
    }
  },
}));

const tray = await import('../../electron/services/tray');

const future: RawContest = {
  name: 'Round',
  startTime: Math.floor(Date.now() / 1000) + 3600,
  duration: 3600,
  platform: 'Codeforces',
};

afterEach(() => {
  notificationConfig = { enabled: false, reminderMinutes: 15 };
  menuTemplate = [];
  shownNotifications = [];
  quitCalled = false;
  tray.destroyTray();
});

describe('tray reminders', () => {
  test('builds only reminders within the next 24 hours', () => {
    const now = Date.now();
    const contests: RawContest[] = [
      { ...future, name: 'Soon', startTime: Math.floor((now + 30 * 60 * 1000) / 1000) },
      { ...future, name: 'Past', startTime: Math.floor((now - 3 * 3600 * 1000) / 1000) },
      { ...future, name: 'Far', startTime: Math.floor((now + 30 * 3600 * 1000) / 1000) },
    ];
    const schedule = tray.buildReminderSchedule(contests, now, 15);
    expect(schedule.map(item => item.contest.name)).toEqual(['Soon']);
    expect(schedule[0].delay).toBeGreaterThan(0);
  });

  test('skips fetching when notifications are disabled', async () => {
    let called = false;
    await tray.scheduleContestReminders(async () => {
      called = true;
      return {
        contests: [],
        platformStatus: [],
        totalElapsed: 0,
        fromCache: false,
        cachedAt: null,
      };
    });
    expect(called).toBe(false);
  });

  test('schedules future reminders when enabled', async () => {
    notificationConfig = { enabled: true, reminderMinutes: 15 };
    const timers: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = ((callback: TimerHandler, delay?: number) => {
      timers.push(Number(delay));
      void callback;
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout;
    try {
      await tray.scheduleContestReminders(async () => ({
        contests: [future],
        platformStatus: [],
        totalElapsed: 0,
        fromCache: false,
        cachedAt: null,
      }));
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
    expect(timers).toHaveLength(1);
    expect(timers[0]).toBeGreaterThan(0);
  });

  test('shows a formatted system notification', () => {
    tray.showContestNotification(future);
    expect(shownNotifications).toHaveLength(1);
    expect(shownNotifications[0].title).toBe('比赛即将开始');
    expect(shownNotifications[0].body).toContain('Codeforces');
  });

  test('creates tray menu actions and destroys the tray', () => {
    const sent: string[] = [];
    const win = {
      show: () => {},
      focus: () => {},
      webContents: {
        send: (channel: string) => sent.push(channel),
      },
    };
    tray.createTray(win as never);
    expect(menuTemplate.map(item => item.label).filter(Boolean)).toEqual([
      '打开 OJFlow',
      '刷新比赛',
      '退出',
    ]);
    menuTemplate.find(item => item.label === '刷新比赛')?.click?.();
    menuTemplate.find(item => item.label === '退出')?.click?.();
    expect(sent).toEqual(['refresh-contests']);
    expect(quitCalled).toBe(true);
    expect(() => tray.destroyTray()).not.toThrow();
  });
});
