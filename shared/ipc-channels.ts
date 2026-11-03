import type {
  CodeforcesReport,
  ContestFetchResponse,
  ProblemSearchRequest,
  ProblemSearchResult,
  PracticeProblem,
  PracticeProblemUpdate,
  Rating,
  SolvedNum,
  CompanionStatus,
} from './types';

export const IPC_CHANNELS = {
  GET_CONTESTS: 'get-recent-contests',
  GET_RATING: 'get-rating',
  GET_SOLVED_NUM: 'get-solved-num',
  OPEN_URL: 'open-url',
  UPDATER_INSTALL: 'updater-install',
  SEARCH_PROBLEMS: 'search-problems',
  GET_CF_REPORT: 'get-cf-report',
  LIST_PRACTICE_PROBLEMS: 'list-practice-problems',
  UPDATE_PRACTICE_PROBLEM: 'update-practice-problem',
  DELETE_PRACTICE_PROBLEM: 'delete-practice-problem',
  GET_COMPANION_STATUS: 'get-companion-status',
  COPY_TEXT: 'copy-text',
  CLEAR_CACHE: 'clear-cache',
  WINDOW_MINIMIZE: 'window-minimize',
  WINDOW_TOGGLE_MAXIMIZE: 'window-toggle-maximize',
  WINDOW_CLOSE: 'window-close',
  WINDOW_GET_STATE: 'window-get-state',
  WINDOW_STATE_CHANGED: 'window-state-changed',
  AUTO_LAUNCH_GET: 'auto-launch-get',
  AUTO_LAUNCH_SET: 'auto-launch-set',

  // Store management
  STORE_GET: 'store-get',
  STORE_SET: 'store-set',
  STORE_GET_ALL: 'store-get-all',

  // Streaming / push channels
  CONTESTS_PARTIAL: 'contests-partial',
  REFRESH_CONTESTS: 'refresh-contests',
  PRACTICE_IMPORTED: 'practice-imported',

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
  [IPC_CHANNELS.SEARCH_PROBLEMS]: {
    args: [payload: ProblemSearchRequest];
    return: ProblemSearchResult;
  };
  [IPC_CHANNELS.GET_CF_REPORT]: {
    args: [handle: string];
    return: CodeforcesReport;
  };
  [IPC_CHANNELS.LIST_PRACTICE_PROBLEMS]: {
    args: [];
    return: PracticeProblem[];
  };
  [IPC_CHANNELS.UPDATE_PRACTICE_PROBLEM]: {
    args: [id: string, updates: PracticeProblemUpdate];
    return: PracticeProblem | null;
  };
  [IPC_CHANNELS.DELETE_PRACTICE_PROBLEM]: {
    args: [id: string];
    return: boolean;
  };
  [IPC_CHANNELS.GET_COMPANION_STATUS]: {
    args: [];
    return: CompanionStatus;
  };
  [IPC_CHANNELS.COPY_TEXT]: {
    args: [text: string];
    return: void;
  };
  [IPC_CHANNELS.CLEAR_CACHE]: {
    args: [];
    return: void;
  };
  [IPC_CHANNELS.WINDOW_MINIMIZE]: {
    args: [];
    return: void;
  };
  [IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE]: {
    args: [];
    return: void;
  };
  [IPC_CHANNELS.WINDOW_CLOSE]: {
    args: [];
    return: void;
  };
  [IPC_CHANNELS.WINDOW_GET_STATE]: {
    args: [];
    return: { maximized: boolean };
  };
  [IPC_CHANNELS.AUTO_LAUNCH_GET]: {
    args: [];
    return: boolean;
  };
  [IPC_CHANNELS.AUTO_LAUNCH_SET]: {
    args: [enabled: boolean];
    return: void;
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
