import { Contest } from '../types';
import { format, addSeconds } from 'date-fns';

export class ContestUtils {
  static createContest(
    name: string,
    startTimeSeconds: number,
    durationSeconds: number,
    platform: string,
    link?: string
  ): Contest {
    const startTime = new Date(startTimeSeconds * 1000);
    const duration = durationSeconds;
    const endTime = addSeconds(startTime, duration);

    const startTimeStr = format(startTime, 'yyyy-MM-dd HH:mm');
    const endTimeStr = format(endTime, 'yyyy-MM-dd HH:mm');

    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const durationTimeStr = `${hours} 小时 ${minutes} 分钟`;

    const startDateTimeDay = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate(), 23, 59, 59);
    const startHourMinute = format(startTime, 'HH:mm');
    const endHourMinute = format(endTime, 'HH:mm');

    return {
      name,
      startTime: startTimeStr,
      endTime: endTimeStr,
      duration: durationTimeStr,
      platform,
      link,
      startDateTimeDay,
      startHourMinute,
      endHourMinute,
      startTimeSeconds,
      durationSeconds,
      formattedStartTime: startTimeStr,
      formattedEndTime: endTimeStr,
      formattedDuration: durationTimeStr,
    };
  }

  static getDayName(index: number): string {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + index);
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    // This is a simple approximation. For precise "Today", "Tomorrow", we should compare dates.
    
    // Better logic:
    const now = new Date();
    const date = new Date(now.getTime() + index * 24 * 60 * 60 * 1000);
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDay = weekDays[date.getDay()];

    if (index === 0) return `今天 (${month}-${day})`;
    if (index === 1) return `明天 (${month}-${day})`;
    if (index === 2) return `后天 (${month}-${day})`;
    return `${weekDay} (${month}-${day})`;
  }
}
