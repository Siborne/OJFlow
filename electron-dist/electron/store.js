"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.store = void 0;
const electron_store_1 = __importDefault(require("electron-store"));
const defaults = {
    ui: {
        themeScheme: 'ocean',
        colorMode: 'auto',
        locale: 'zh-CN',
    },
    contest: {
        maxCrawlDays: 7,
        hideDate: false,
        selectedPlatforms: {
            Codeforces: true,
            AtCoder: true,
            '\u6d1b\u8c37': true,
            '\u84dd\u6865\u4e91\u8bfe': true,
            '\u529b\u6263': true,
            '\u725b\u5ba2': true,
        },
    },
    favorites: [],
    usernames: {},
    cache: {},
    notification: {
        enabled: false,
        reminderMinutes: 15,
    },
};
exports.store = new electron_store_1.default({
    name: 'ojflow-config',
    defaults,
});
