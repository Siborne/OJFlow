import { Tray, Menu, nativeImage, BrowserWindow, Notification, app } from 'electron';
import * as path from 'path';
import { store } from '../store';
import { fetchAllContests } from '../services/contest-aggregator';
import type { RawContest } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/ipc-channels';

let tray: Tray | null = null;
let reminderTimers: ReturnType<typeof setTimeout>[] = [];

export interface ReminderScheduleItem {
  contest: RawContest;
  delay: number;
}

export function buildReminderSchedule(
  contests: RawContest[],
  nowMs: number,
  reminderMinutes: number,
): ReminderScheduleItem[] {
  const reminderMs = Math.max(1, reminderMinutes) * 60 * 1000;
  return contests
    .map(contest => {
      const notifyAt = contest.startTime * 1000 - reminderMs;
      return { contest, delay: notifyAt - nowMs };
    })
    .filter(item => item.delay > 0 && item.delay < 24 * 60 * 60 * 1000);
}

export function getTrayIconPath(): string {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const iconName = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  if (isDev) {
    return path.join(__dirname, '../../src/assets', iconName);
  }
  return path.join(process.resourcesPath, 'src/assets', iconName);
}

export function createTray(win: BrowserWindow): Tray {
  if (tray) return tray;

  const iconPath = getTrayIconPath();
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(process.platform === 'win32' ? icon : icon.resize({ width: 22, height: 22 }));
  tray.setToolTip('OJFlow - 比赛助手');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开 OJFlow',
      click: () => {
        win.show();
        win.focus();
      },
    },
    { type: 'separator' },
    {
      label: '刷新比赛',
      click: () => {
        win.webContents.send(IPC_CHANNELS.REFRESH_CONTESTS);
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    win.show();
    win.focus();
  });

  return tray;
}

export function destroyTray(): void {
  clearAllReminders();
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

function clearAllReminders(): void {
  for (const timer of reminderTimers) {
    clearTimeout(timer);
  }
  reminderTimers = [];
}

/**
 * Schedule contest reminder notifications.
 * Fetches contests and schedules OS notifications for each upcoming contest.
 */
export async function scheduleContestReminders(fetchContests = fetchAllContests): Promise<void> {
  clearAllReminders();

  const notifConfig = store.get('notification') as
    | { enabled: boolean; reminderMinutes: number }
    | undefined;

  if (!notifConfig?.enabled) return;

  const now = Date.now();

  try {
    const response = await fetchContests(7);
    const schedule = buildReminderSchedule(
      response.contests,
      now,
      notifConfig.reminderMinutes ?? 15,
    );
    for (const item of schedule) {
      const timer = setTimeout(() => {
        showContestNotification(item.contest);
      }, item.delay);
      reminderTimers.push(timer);
    }

    console.warn(`[tray] Scheduled ${reminderTimers.length} contest reminders`);
  } catch (e) {
    console.warn('[tray] Failed to schedule reminders:', e);
  }
}

export function showContestNotification(contest: RawContest): void {
  if (!Notification.isSupported()) return;

  const startDate = new Date(contest.startTime * 1000);
  const timeStr = `${startDate.getHours().toString().padStart(2, '0')}:${startDate
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  const notification = new Notification({
    title: `比赛即将开始`,
    body: `${contest.name}\n${contest.platform} - ${timeStr}`,
    icon: getTrayIconPath(),
  });

  notification.show();
}
