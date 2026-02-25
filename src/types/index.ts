export interface Platform {
  id: string;
  name: string;
  api_endpoint: string;
  logo_url: string;
  is_active: boolean;
}

export interface Contest {
  id: string;
  name: string;
  platform_id: string;
  start_time: string; // ISO string
  duration: number; // seconds
  status: 'upcoming' | 'running' | 'finished';
  url: string;
}

export interface Problem {
  id: string;
  platform_id: string;
  problem_id: string;
  title: string;
  difficulty: string;
  tags: string[];
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'zh';
  sync_interval: number; // minutes
  auto_sync: boolean;
}

export interface UserAccount {
  id: string;
  platform_id: string;
  username: string; // Used for input
  handle: string; // Used for display/API
  last_synced?: string;
  solved_count?: number;
  error?: string;
  loading?: boolean;
}

export interface UserStatistics {
  total_solved: number;
  platform_stats: Record<string, number>;
  difficulty_stats: Record<string, number>;
  recent_activity: number[]; // e.g., last 30 days count
  tag_stats: Record<string, number>;
}
