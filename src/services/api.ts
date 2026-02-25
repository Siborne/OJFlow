import { Contest, UserStatistics } from '@/types';
import { useStore } from '@/store';
import { request } from '@/utils/request';

const CODEFORCES_API = 'https://codeforces.com/api/contest.list';
const ATCODER_API = 'https://kenkoooo.com/atcoder/resources/contests.json';

interface CFResponse {
  status: string;
  result: {
    id: number;
    name: string;
    type: string;
    phase: string;
    frozen: boolean;
    durationSeconds: number;
    startTimeSeconds: number;
    relativeTimeSeconds: number;
  }[];
}

interface AtCoderContest {
  id: string;
  start_epoch_second: number;
  duration_second: number;
  title: string;
  rate_change: string;
}

export const fetchCodeforcesContests = async (): Promise<Contest[]> => {
  try {
    const response = await request(CODEFORCES_API);
    if (!response.ok) throw new Error(`Failed to fetch Codeforces: ${response.status}`);
    
    const data: CFResponse = await response.json();
    
    if (data.status !== 'OK') throw new Error('Codeforces API error: ' + JSON.stringify(data));

    return data.result
      .filter(c => c.phase === 'BEFORE' || c.phase === 'CODING')
      .map(c => {
        const timestamp = (c.startTimeSeconds || Date.now() / 1000) * 1000;
        
        return {
          id: `cf-${c.id}`,
          name: c.name,
          platform_id: 'codeforces',
          start_time: new Date(timestamp).toISOString(),
          duration: c.durationSeconds || 0,
          status: c.phase === 'CODING' ? 'running' : 'upcoming',
          url: `https://codeforces.com/contest/${c.id}`
        };
      });
  } catch (error) {
    console.error('Codeforces fetch error:', error);
    return [];
  }
};

export const fetchAtCoderContests = async (): Promise<Contest[]> => {
  try {
    const response = await request(ATCODER_API);
    if (!response.ok) throw new Error(`Failed to fetch AtCoder: ${response.status}`);

    const data: AtCoderContest[] = await response.json();
    const now = Date.now() / 1000;

    return data
      .filter(c => (c.start_epoch_second + c.duration_second) > now)
      .map(c => {
        const isRunning = c.start_epoch_second <= now && (c.start_epoch_second + c.duration_second) > now;
        const timestamp = (c.start_epoch_second || Date.now() / 1000) * 1000;

        return {
          id: `ac-${c.id}`,
          name: c.title,
          platform_id: 'atcoder',
          start_time: new Date(timestamp).toISOString(),
          duration: c.duration_second || 0,
          status: isRunning ? 'running' : 'upcoming',
          url: `https://atcoder.jp/contests/${c.id}`
        };
      });
  } catch (error) {
    console.error('AtCoder fetch error:', error);
    return [];
  }
};

export const fetchAllContests = async (): Promise<Contest[]> => {
  const [cf, ac] = await Promise.all([
    fetchCodeforcesContests(),
    fetchAtCoderContests(),
  ]);
  return [...cf, ...ac].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
};

export const fetchUserStatistics = async (): Promise<UserStatistics> => {
  // Aggregate real data from store
  // Note: This relies on the store being populated via StatCard interactions
  const accounts = useStore.getState().accounts;
  
  let totalSolved = 0;
  const platformStats: Record<string, number> = {};

  Object.values(accounts).forEach(acc => {
    if (acc.solved_count && acc.solved_count > 0) {
      totalSolved += acc.solved_count;
      platformStats[acc.platform_id] = acc.solved_count;
    }
  });

  // Since we don't have historical data or difficulty breakdown from simple APIs yet,
  // we return empty structures to avoid fake data.
  // The UI should handle empty states gracefully.
  return {
    total_solved: totalSolved,
    platform_stats: platformStats,
    difficulty_stats: {}, 
    recent_activity: [], 
    tag_stats: {} 
  };
};
