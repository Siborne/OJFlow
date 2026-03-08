export interface Contest {
  name: string;
  startTime: string; // Formatted time
  endTime: string;
  duration: string; // Formatted duration
  platform: string;
  link?: string;
  startDateTimeDay?: Date;
  startHourMinute: string;
  endHourMinute: string;
  startTimeSeconds: number;
  durationSeconds: number;
  formattedStartTime: string;
  formattedEndTime: string;
  fomattedDuration: string;
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
