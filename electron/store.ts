import Store from 'electron-store';
import type { UserConfig } from '../shared/store-schema';

const defaults: UserConfig = {
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

export const store = new Store<UserConfig>({
  name: 'ojflow-config',
  defaults,
});
