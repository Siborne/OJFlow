"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = void 0;
exports.IPC_CHANNELS = {
    GET_CONTESTS: 'get-recent-contests',
    GET_RATING: 'get-rating',
    GET_SOLVED_NUM: 'get-solved-num',
    OPEN_URL: 'open-url',
    UPDATER_INSTALL: 'updater-install',
    // Store management
    STORE_GET: 'store-get',
    STORE_SET: 'store-set',
    STORE_GET_ALL: 'store-get-all',
    // Streaming / push channels
    CONTESTS_PARTIAL: 'contests-partial',
    // Notification
    NOTIFICATION_SET: 'notification-set',
    NOTIFICATION_GET: 'notification-get',
};
