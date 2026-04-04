/** Raw contest data from Electron main process (unformatted) */
export interface RawContest {
  name: string;
  startTime: number; // Unix timestamp (seconds)
  duration: number; // seconds
  platform: string;
  link?: string;
}

/** Formatted contest data used by renderer process */
export interface Contest {
  name: string;
  startTime: string;
  endTime: string;
  duration: string;
  platform: string;
  link?: string;
  startDateTimeDay?: Date;
  startHourMinute: string;
  endHourMinute: string;
  startTimeSeconds: number;
  durationSeconds: number;
  formattedStartTime: string;
  formattedEndTime: string;
  formattedDuration: string;
}

export interface Rating {
  name: string;
  curRating: number;
  maxRating: number;
  ranking?: number;
  time?: string;
}

export interface SolvedNum {
  name: string;
  solvedNum: number;
}

/** Supported OJ platform identifiers */
export type ContestPlatform =
  | 'Codeforces'
  | 'AtCoder'
  | '\u6d1b\u8c37'
  | '\u84dd\u6865\u4e91\u8bfe'
  | '\u529b\u6263'
  | '\u725b\u5ba2';

export type RatingPlatform =
  | 'Codeforces'
  | 'AtCoder'
  | '\u529b\u6263'
  | '\u6d1b\u8c37'
  | '\u725b\u5ba2';

export type SolvedPlatform =
  | 'Codeforces'
  | '\u529b\u6263'
  | 'VJudge'
  | '\u6d1b\u8c37'
  | 'AtCoder'
  | 'HDU'
  | 'POJ'
  | '\u725b\u5ba2'
  | 'QOJ';
