"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleContestReminders = exports.destroyTray = exports.createTray = void 0;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const store_1 = require("../store");
const contest_aggregator_1 = require("../services/contest-aggregator");
let tray = null;
let reminderTimers = [];
function getIconPath() {
    const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
    if (isDev) {
        return path.join(__dirname, '../../src/assets/icon.png');
    }
    return path.join(process.resourcesPath, 'src/assets/icon.png');
}
function createTray(win) {
    if (tray)
        return tray;
    const iconPath = getIconPath();
    const icon = electron_1.nativeImage.createFromPath(iconPath);
    tray = new electron_1.Tray(icon.resize({ width: 16, height: 16 }));
    tray.setToolTip('OJFlow - 比赛助手');
    const contextMenu = electron_1.Menu.buildFromTemplate([
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
                electron_1.app.quit();
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
exports.createTray = createTray;
function destroyTray() {
    clearAllReminders();
    if (tray) {
        tray.destroy();
        tray = null;
    }
}
exports.destroyTray = destroyTray;
function clearAllReminders() {
    for (const timer of reminderTimers) {
        clearTimeout(timer);
    }
    reminderTimers = [];
}
/**
 * Schedule contest reminder notifications.
 * Fetches contests and schedules OS notifications for each upcoming contest.
 */
async function scheduleContestReminders() {
    clearAllReminders();
    const notifConfig = store_1.store.get('notification');
    if (!notifConfig?.enabled)
        return;
    const reminderMs = (notifConfig.reminderMinutes ?? 15) * 60 * 1000;
    const now = Date.now();
    try {
        const response = await (0, contest_aggregator_1.fetchAllContests)(7);
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
    }
    catch (e) {
        console.warn('[tray] Failed to schedule reminders:', e);
    }
}
exports.scheduleContestReminders = scheduleContestReminders;
function showContestNotification(contest) {
    if (!electron_1.Notification.isSupported())
        return;
    const startDate = new Date(contest.startTime * 1000);
    const timeStr = `${startDate.getHours().toString().padStart(2, '0')}:${startDate
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    const notification = new electron_1.Notification({
        title: `比赛即将开始`,
        body: `${contest.name}\n${contest.platform} - ${timeStr}`,
        icon: getIconPath(),
    });
    notification.show();
}
