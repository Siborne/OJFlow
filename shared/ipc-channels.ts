import type { RawContest, Rating, SolvedNum, ContestFetchResponse } from './types';

export const IPC_CHANNELS = {
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
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

/** IPC handler argument and return type mapping */
export interface IpcHandlerMap {
  [IPC_CHANNELS.GET_CONTESTS]: {
    args: [day: number];
    return: ContestFetchResponse;
  };
  [IPC_CHANNELS.GET_RATING]: {
    args: [payload: { platform: string; name: string }];
    return: Rating;
  };
  [IPC_CHANNELS.GET_SOLVED_NUM]: {
    args: [payload: { platform: string; name: string }];
    return: SolvedNum;
  };
  [IPC_CHANNELS.OPEN_URL]: {
    args: [url: string];
    return: void;
  };
  [IPC_CHANNELS.UPDATER_INSTALL]: {
    args: [payload: { url: string }];
    return: boolean;
  };
  [IPC_CHANNELS.STORE_GET]: {
    args: [key: string];
    return: unknown;
  };
  [IPC_CHANNELS.STORE_SET]: {
    args: [key: string, value: unknown];
    return: void;
  };
  [IPC_CHANNELS.STORE_GET_ALL]: {
    args: [];
    return: Record<string, unknown>;
  };
  [IPC_CHANNELS.NOTIFICATION_SET]: {
    args: [payload: { enabled: boolean; reminderMinutes: number }];
    return: void;
  };
  [IPC_CHANNELS.NOTIFICATION_GET]: {
    args: [];
    return: { enabled: boolean; reminderMinutes: number };
  };
}
