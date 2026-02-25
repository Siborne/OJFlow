export const INIT_SQL = [
  `CREATE TABLE IF NOT EXISTS platforms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    api_endpoint TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE TABLE IF NOT EXISTS contests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    start_time DATETIME NOT NULL,
    duration INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming',
    url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (platform_id) REFERENCES platforms(id)
  );`,

  `CREATE INDEX IF NOT EXISTS idx_contests_start_time ON contests(start_time);`,
  `CREATE INDEX IF NOT EXISTS idx_contests_platform ON contests(platform_id);`,
  `CREATE INDEX IF NOT EXISTS idx_contests_status ON contests(status);`,

  `CREATE TABLE IF NOT EXISTS problem_solves (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    problem_id TEXT NOT NULL,
    problem_title TEXT,
    difficulty TEXT,
    solved_at DATETIME,
    attempts INTEGER DEFAULT 1,
    is_solved BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (platform_id) REFERENCES platforms(id)
  );`,

  `CREATE INDEX IF NOT EXISTS idx_solves_user_platform ON problem_solves(user_id, platform_id);`,
  `CREATE INDEX IF NOT EXISTS idx_solves_solved_at ON problem_solves(solved_at);`,
  `CREATE INDEX IF NOT EXISTS idx_solves_difficulty ON problem_solves(difficulty);`,

  `CREATE TABLE IF NOT EXISTS sync_logs (
    id TEXT PRIMARY KEY,
    sync_type TEXT NOT NULL,
    last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
    status INTEGER DEFAULT 0,
    error_info TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,

  `CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON sync_logs(sync_type);`,
  `CREATE INDEX IF NOT EXISTS idx_sync_logs_last_sync ON sync_logs(last_sync);`,

  `INSERT OR IGNORE INTO platforms (id, name, api_endpoint, logo_url) VALUES
    ('codeforces', 'Codeforces', 'https://codeforces.com/api/', '/logos/codeforces.png'),
    ('atcoder', 'AtCoder', 'https://atcoder.jp/', '/logos/atcoder.png'),
    ('leetcode', 'LeetCode', 'https://leetcode.com/', '/logos/leetcode.png'),
    ('luogu', '洛谷', 'https://www.luogu.com.cn/', '/logos/luogu.png');`
];
