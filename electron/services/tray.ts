import { Tray, Menu, nativeImage, BrowserWindow, Notification, app } from 'electron';
import * as path from 'path';
import { store } from '../store';
import { fetchAllContests } from '../services/contest-aggregator';
import type { RawContest } from '../../shared/types';

let tray: Tray | null = null;
let reminderTimers: ReturnType<typeof setTimeout>[] = [];

function getIconPath(): string {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    return path.join(__dirname, '../../src/assets/icon.png');
  }
  return path.join(process.resourcesPath, 'src/assets/icon.png');
}

export function createTray(win: BrowserWindow): Tray {
  if (tray) return tray;

  const iconPath = getIconPath();
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
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
        win.webContents.send('tray-refresh');
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
export async function scheduleContestReminders(): Promise<void> {
  clearAllReminders();

  const notifConfig = store.get('notification') as
    | { enabled: boolean; reminderMinutes: number }
    | undefined;

  if (!notifConfig?.enabled) return;

  const reminderMs = (notifConfig.reminderMinutes ?? 15) * 60 * 1000;
  const now = Date.now();

  try {
    const response = await fetchAllContests(7);
    const contests = response.contests;

    for (const contest of contests) {
      const startMs = contest.startTime * 1000;
      const notifyAt = startMs - reminderMs;
      const delay = notifyAt - now;

      // Only schedule future notifications within 24h
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        const timer = setTimeout(() => {
          showContestNotification(contest);
        }, delay);
        reminderTimers.push(timer);
      }
    }

    console.log(`[tray] Scheduled ${reminderTimers.length} contest reminders`);
  } catch (e) {
    console.warn('[tray] Failed to schedule reminders:', e);
  }
}

function showContestNotification(contest: RawContest): void {
  if (!Notification.isSupported()) return;

  const startDate = new Date(contest.startTime * 1000);
  const timeStr = `${startDate.getHours().toString().padStart(2, '0')}:${startDate
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  const notification = new Notification({
    title: `比赛即将开始`,
    body: `${contest.name}\n${contest.platform} - ${timeStr}`,
    icon: getIconPath(),
  });

  notification.show();
}
