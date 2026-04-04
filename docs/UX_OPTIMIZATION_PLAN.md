# OJFlow 核心用户体验优化实施方案

> 版本：v1.3 ~ v1.5 | 基于 PRD Phase 2 | 前置依赖：INFRA_PLAN.md 中的基础设施建设完成

---

## 目录

1. [数据抓取可靠性增强](#1-数据抓取可靠性增强)
2. [离线缓存策略](#2-离线缓存策略)
3. [性能优化方案](#3-性能优化方案)
4. [实施顺序与验证](#4-实施顺序与验证)

---

## 1. 数据抓取可靠性增强

### 1.1 现状分析

#### 当前抓取架构问题

**`electron/services/contest.js`** (296 行)：

1. **`Promise.all` 的致命缺陷**（第 280-292 行）：
   ```javascript
   async getAllContests(day) {
     const results = await Promise.all(promises);
     return results.flat();
   }
   ```
   当前使用 `Promise.all`，但各平台方法内部已有 try-catch 返回空数组，所以不会真正 reject。然而 **问题在于**：如果某个平台超时 30 秒，整个请求都会被阻塞 30 秒。

2. **无请求超时控制**：各平台使用 axios 默认配置，无统一超时设置。如果某个 OJ 响应极慢（如洛谷被限流），用户整个比赛列表都会等待。

3. **cheerio 选择器脆弱性**：
   - `getNowcoderContests()`（第 125 行）依赖 `.platform-item-main` CSS 类名
   - `getAtCoderContests()`（第 168 行）依赖 `#contest-table-upcoming tbody tr` 结构
   - `getVJudgeSolvedNum()`（第 58 行）依赖 `.table.table-reflow.problem-solve tbody tr`
   - 任何 OJ 前端改版都会导致解析失败且无错误提示

4. **无数据校验**：抓取到的数据直接传给渲染进程，不校验 `startTime` 是否为合理时间戳、`name` 是否为空等。

5. **错误信息不透明**：各平台失败只在 console.error 中打印，用户界面看不到哪个平台失败了。

**`electron/services/rating.js`** (160 行)：
- `getAtCoderRating()`（第 33-36 行）直接依赖 `.dl-table.mt-2` 的表格行数 `rows.length >= 3`
- `getLuoguRating()`（第 106 行）依赖多步请求（搜索 → 获取 uid → 查询 Rating），任何一步失败都会异常

**`electron/services/solvedNum.js`** (195 行)：
- `getVJudgeSolvedNum()` 有两层 fallback 策略（搜索 "Overall" 文本 → 尝试表格固定索引），但仍然脆弱
- `getLuoguSolvedNum()` 用正则 `passedProblemCount["']?:(\d+)` 从页面源码提取数据，HTML 结构变化即失效

### 1.2 目标架构：Platform Adapter 模式

将当前散落的平台抓取代码重构为统一的适配器接口：

```
electron/services/
├── adapters/
│   ├── types.ts                 # 适配器接口定义
│   ├── base-adapter.ts          # 基础适配器（提供通用能力）
│   ├── codeforces.adapter.ts    # Codeforces 适配器
│   ├── atcoder.adapter.ts       # AtCoder 适配器
│   ├── leetcode.adapter.ts      # LeetCode 适配器
│   ├── luogu.adapter.ts         # 洛谷适配器
│   ├── lanqiao.adapter.ts       # 蓝桥云课适配器
│   ├── nowcoder.adapter.ts      # 牛客适配器
│   ├── vjudge.adapter.ts        # VJudge 适配器
│   ├── hdu.adapter.ts           # HDU 适配器
│   ├── poj.adapter.ts           # POJ 适配器
│   └── qoj.adapter.ts           # QOJ 适配器
├── contest-aggregator.ts        # 比赛聚合器
├── rating-aggregator.ts         # Rating 聚合器
└── solved-aggregator.ts         # 做题统计聚合器
```

### 1.3 适配器接口定义

```typescript
// electron/services/adapters/types.ts
import type { RawContest, Rating, SolvedNum } from '../../../shared/types';

/** 平台抓取结果，包含成功/失败状态 */
export interface FetchResult<T> {
  success: boolean;
  data: T;
  platform: string;
  /** 毫秒级耗时 */
  elapsed: number;
  /** 失败时的错误信息 */
  error?: string;
  /** 失败类型：可用于 UI 展示不同图标 */
  errorType?: 'timeout' | 'network' | 'parse' | 'api' | 'unknown';
}

/** 平台适配器接口 */
export interface PlatformAdapter {
  /** 平台唯一标识 */
  readonly id: string;
  /** 平台显示名称 */
  readonly displayName: string;

  /** 抓取近期比赛 */
  fetchContests?(days: number): Promise<RawContest[]>;
  /** 查询用户 Rating */
  fetchRating?(handle: string): Promise<Rating>;
  /** 查询做题数 */
  fetchSolvedCount?(handle: string): Promise<SolvedNum>;
  /** 健康检查：验证平台 API 是否可达 */
  healthCheck?(): Promise<boolean>;
}

/** 聚合结果 */
export interface AggregateResult<T> {
  data: T[];
  /** 各平台状态报告 */
  platformStatus: FetchResult<T[]>[];
  /** 总耗时 */
  totalElapsed: number;
}
```

### 1.4 基础适配器实现

```typescript
// electron/services/adapters/base-adapter.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import type { PlatformAdapter, FetchResult } from './types';

/** 所有适配器的基类，提供通用能力 */
export abstract class BaseAdapter implements PlatformAdapter {
  abstract readonly id: string;
  abstract readonly displayName: string;

  protected http: AxiosInstance;

  constructor(options?: { timeoutMs?: number }) {
    this.http = axios.create({
      timeout: options?.timeoutMs ?? 10_000,
      headers: {
        'User-Agent': 'OJFlow/1.1 (Desktop App)',
      },
    });
  }

  /** 安全解析 HTML，返回 cheerio 实例 */
  protected parseHtml(html: string): cheerio.CheerioAPI {
    return cheerio.load(html);
  }

  /** 包装方法调用，统一错误处理和计时 */
  protected async safeFetch<T>(
    fn: () => Promise<T>,
    fallback: T,
  ): Promise<FetchResult<T>> {
    const start = Date.now();
    try {
      const data = await fn();
      return {
        success: true,
        data,
        platform: this.displayName,
        elapsed: Date.now() - start,
      };
    } catch (error) {
      const elapsed = Date.now() - start;
      const { message, errorType } = this.classifyError(error);
      console.warn(`[${this.id}] fetch failed:`, message);
      return {
        success: false,
        data: fallback,
        platform: this.displayName,
        elapsed,
        error: message,
        errorType,
      };
    }
  }

  /** 错误分类 */
  private classifyError(error: unknown): {
    message: string;
    errorType: 'timeout' | 'network' | 'parse' | 'api' | 'unknown';
  } {
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return { message: `请求超时 (${this.id})`, errorType: 'timeout' };
      }
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET' || error.code === 'EAI_AGAIN') {
        return { message: `网络错误: ${error.code}`, errorType: 'network' };
      }
      if (error.response) {
        return { message: `HTTP ${error.response.status}`, errorType: 'api' };
      }
      return { message: error.message, errorType: 'network' };
    }
    if (error instanceof SyntaxError) {
      return { message: '数据解析失败', errorType: 'parse' };
    }
    if (error instanceof Error) {
      return { message: error.message, errorType: 'unknown' };
    }
    return { message: '未知错误', errorType: 'unknown' };
  }

  /** 默认健康检查实现 */
  async healthCheck(): Promise<boolean> {
    return true;
  }
}
```

### 1.5 具体适配器示例

以 Codeforces 为例，展示从旧代码到新适配器的迁移：

```typescript
// electron/services/adapters/codeforces.adapter.ts
import { BaseAdapter } from './base-adapter';
import type { RawContest, Rating, SolvedNum, FetchResult } from './types';

export class CodeforcesAdapter extends BaseAdapter {
  readonly id = 'codeforces';
  readonly displayName = 'Codeforces';

  private readonly contestApiUrl = 'https://codeforces.com/api/contest.list?gym=false';
  private readonly userInfoUrl = 'https://codeforces.com/api/user.info';
  private readonly ojhuntUrl = 'https://ojhunt.com/api/crawlers/codeforces';

  async fetchContests(days: number): Promise<RawContest[]> {
    const response = await this.http.get(this.contestApiUrl);

    if (response.data?.status !== 'OK') {
      throw new Error('Codeforces API returned non-OK status');
    }

    const contestList = response.data.result;
    if (!Array.isArray(contestList)) {
      throw new Error('Invalid contest list format');
    }

    const now = Math.floor(Date.now() / 1000);
    const midnightToday = now - (now % 86400); // UTC midnight 近似
    const queryEnd = midnightToday + days * 86400;

    return contestList
      .filter(item => {
        const start = item.startTimeSeconds;
        const end = start + item.durationSeconds;
        // 排除已结束的和超出查询范围的
        return end >= midnightToday && start <= queryEnd && item.durationSeconds < 86400;
      })
      .map(item => ({
        name: item.name,
        startTime: item.startTimeSeconds,
        duration: item.durationSeconds,
        platform: this.displayName,
        link: 'https://codeforces.com/contests',
      }))
      .sort((a, b) => b.startTime - a.startTime);
  }

  async fetchRating(handle: string): Promise<Rating> {
    // 输入校验
    if (!handle || typeof handle !== 'string') {
      throw new Error('Invalid handle');
    }

    const url = `${this.userInfoUrl}?handles=${encodeURIComponent(handle)}&checkHistoricHandles=false`;
    const response = await this.http.get(url);

    if (response.data?.status !== 'OK' || !response.data.result?.[0]) {
      throw new Error('User not found or API error');
    }

    const result = response.data.result[0];
    return {
      name: handle,
      curRating: typeof result.rating === 'number' ? result.rating : 0,
      maxRating: typeof result.maxRating === 'number' ? result.maxRating : 0,
    };
  }

  async fetchSolvedCount(handle: string): Promise<SolvedNum> {
    const url = `${this.ojhuntUrl}/${encodeURIComponent(handle)}`;
    const response = await this.http.get(url);

    if (!response.data?.data?.solved && response.data?.data?.solved !== 0) {
      throw new Error('Invalid API response');
    }

    return {
      name: handle,
      solvedNum: response.data.data.solved,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.http.get(this.contestApiUrl, { timeout: 5000 });
      return response.data?.status === 'OK';
    } catch {
      return false;
    }
  }
}
```

以 AtCoder 为例（cheerio 爬虫增加容错）：

```typescript
// electron/services/adapters/atcoder.adapter.ts
import { BaseAdapter } from './base-adapter';
import type { RawContest, Rating } from './types';

export class AtCoderAdapter extends BaseAdapter {
  readonly id = 'atcoder';
  readonly displayName = 'AtCoder';

  private readonly contestUrl = 'https://atcoder.jp/contests/';
  private readonly userUrl = 'https://atcoder.jp/users/';
  private readonly kenkooooUrl = 'https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank';

  async fetchContests(days: number): Promise<RawContest[]> {
    const response = await this.http.get(this.contestUrl);
    const $ = this.parseHtml(response.data);
    const contests: RawContest[] = [];

    const rows = $('#contest-table-upcoming tbody tr');
    if (rows.length === 0) {
      // 选择器可能已过时，尝试备用选择器
      console.warn('[atcoder] Primary selector found 0 rows, trying fallback');
      const fallbackRows = $('table tbody tr').filter((_i, el) => {
        return $(el).find('td').length >= 3;
      });

      if (fallbackRows.length === 0) {
        throw new Error('Cannot find contest table - AtCoder page structure may have changed');
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const queryEnd = now + days * 86400;

    rows.each((_i, el) => {
      try {
        const cols = $(el).find('td');
        if (cols.length < 3) return;

        const timeText = $(cols[0]).find('a').text().trim();
        const titleLink = $(cols[1]).find('a');
        const title = titleLink.text().trim();
        const href = titleLink.attr('href');
        const durationText = $(cols[2]).text().trim();

        if (!timeText || !title) return;

        const startTime = Math.floor(new Date(timeText).getTime() / 1000);

        // 校验时间戳合理性
        if (!Number.isFinite(startTime) || startTime < 1000000000) return;

        const durationParts = durationText.split(':').map(Number);
        const duration = (durationParts[0] || 0) * 3600 + (durationParts[1] || 0) * 60;

        if (startTime + duration < now || startTime > queryEnd) return;
        if (duration >= 86400) return;

        // 提取比赛名称：处理日文括号
        const name = title.includes('\uff08')
          ? title.split('\uff08')[1]?.split('\uff09')[0] || title
          : title;

        contests.push({
          name,
          startTime,
          duration,
          platform: this.displayName,
          link: href ? `https://atcoder.jp${href}` : this.contestUrl,
        });
      } catch (parseError) {
        // 单行解析失败不影响其他行
        console.warn('[atcoder] Failed to parse contest row:', parseError);
      }
    });

    return contests;
  }

  async fetchRating(handle: string): Promise<Rating> {
    const url = `${this.userUrl}${encodeURIComponent(handle)}`;
    const response = await this.http.get(url);
    const $ = this.parseHtml(response.data);

    // 主选择器
    let rows = $('.dl-table.mt-2').first().find('tr');

    // 备用选择器：如果主选择器失效
    if (rows.length < 3) {
      rows = $('table.dl-table tr');
    }

    if (rows.length < 3) {
      throw new Error('Cannot parse AtCoder rating page - structure may have changed');
    }

    const curRating = parseInt($(rows[1]).find('span').first().text(), 10);
    const maxRating = parseInt($(rows[2]).find('span').first().text(), 10);

    return {
      name: handle,
      curRating: Number.isFinite(curRating) ? curRating : 0,
      maxRating: Number.isFinite(maxRating) ? maxRating : 0,
    };
  }

  async fetchSolvedCount(handle: string): Promise<{ name: string; solvedNum: number }> {
    const url = `${this.kenkooooUrl}?user=${encodeURIComponent(handle)}`;
    const response = await this.http.get(url);

    const count = response.data?.count;
    return {
      name: handle,
      solvedNum: typeof count === 'number' ? count : 0,
    };
  }
}
```

### 1.6 聚合器实现

```typescript
// electron/services/contest-aggregator.ts
import type { RawContest, FetchResult, AggregateResult } from './adapters/types';
import type { PlatformAdapter } from './adapters/types';

// 导入所有适配器
import { CodeforcesAdapter } from './adapters/codeforces.adapter';
import { AtCoderAdapter } from './adapters/atcoder.adapter';
import { LeetCodeAdapter } from './adapters/leetcode.adapter';
import { LuoguAdapter } from './adapters/luogu.adapter';
import { LanqiaoAdapter } from './adapters/lanqiao.adapter';
import { NowcoderAdapter } from './adapters/nowcoder.adapter';

const adapters: PlatformAdapter[] = [
  new CodeforcesAdapter(),
  new AtCoderAdapter(),
  new LeetCodeAdapter(),
  new LuoguAdapter(),
  new LanqiaoAdapter(),
  new NowcoderAdapter(),
];

/**
 * 并发抓取所有平台比赛，单个平台超时不影响其他平台。
 *
 * 使用 Promise.allSettled 替代 Promise.all，确保：
 *  - 单平台失败返回空数据 + 错误状态
 *  - 全局有 15 秒总超时保底
 */
export async function fetchAllContests(
  days: number,
  perPlatformTimeoutMs = 12_000,
): Promise<AggregateResult<RawContest>> {
  const start = Date.now();

  const promises = adapters
    .filter(a => a.fetchContests)
    .map(async (adapter): Promise<FetchResult<RawContest[]>> => {
      const adapterStart = Date.now();
      try {
        // 单平台超时保护
        const data = await Promise.race([
          adapter.fetchContests!(days),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Platform timeout')), perPlatformTimeoutMs)
          ),
        ]);

        return {
          success: true,
          data: data ?? [],
          platform: adapter.displayName,
          elapsed: Date.now() - adapterStart,
        };
      } catch (error) {
        return {
          success: false,
          data: [],
          platform: adapter.displayName,
          elapsed: Date.now() - adapterStart,
          error: error instanceof Error ? error.message : '未知错误',
          errorType: 'unknown',
        };
      }
    });

  const results = await Promise.allSettled(promises);

  const platformStatus: FetchResult<RawContest[]>[] = results.map(r =>
    r.status === 'fulfilled' ? r.value : {
      success: false,
      data: [],
      platform: 'unknown',
      elapsed: 0,
      error: r.reason?.message ?? '未知错误',
      errorType: 'unknown' as const,
    }
  );

  const allContests = platformStatus.flatMap(r => r.data);

  return {
    data: allContests,
    platformStatus,
    totalElapsed: Date.now() - start,
  };
}
```

### 1.7 平台状态透传给渲染进程

当前 IPC 返回的是 `RawContest[]`，改为返回包含平台状态的结构：

```typescript
// shared/types.ts 追加
export interface ContestFetchResponse {
  contests: RawContest[];
  platformStatus: Array<{
    platform: string;
    success: boolean;
    error?: string;
    elapsed: number;
  }>;
  totalElapsed: number;
  /** 是否来自缓存 */
  fromCache: boolean;
}
```

主进程 IPC handler 更新：

```typescript
ipcMain.handle(IPC_CHANNELS.GET_CONTESTS, async (_event, day: number) => {
  const result = await fetchAllContests(validatedDay);
  return {
    contests: result.data,
    platformStatus: result.platformStatus.map(s => ({
      platform: s.platform,
      success: s.success,
      error: s.error,
      elapsed: s.elapsed,
    })),
    totalElapsed: result.totalElapsed,
    fromCache: false,
  };
});
```

渲染进程可利用 `platformStatus` 在 UI 上显示各平台抓取状态（绿灯/红灯/超时图标）。

### 1.8 数据校验层

在适配器返回数据后、传给渲染进程前，增加统一的数据校验：

```typescript
// electron/services/validators.ts
import type { RawContest, Rating, SolvedNum } from '../../shared/types';

export function validateContest(c: unknown): c is RawContest {
  if (!c || typeof c !== 'object') return false;
  const obj = c as Record<string, unknown>;
  return (
    typeof obj.name === 'string' && obj.name.length > 0 &&
    typeof obj.startTime === 'number' && Number.isFinite(obj.startTime) &&
    obj.startTime > 1000000000 &&     // 2001年之后
    typeof obj.duration === 'number' && obj.duration > 0 &&
    typeof obj.platform === 'string'
  );
}

export function validateRating(r: unknown): r is Rating {
  if (!r || typeof r !== 'object') return false;
  const obj = r as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.curRating === 'number' && Number.isFinite(obj.curRating) &&
    typeof obj.maxRating === 'number' && Number.isFinite(obj.maxRating)
  );
}

export function validateSolvedNum(s: unknown): s is SolvedNum {
  if (!s || typeof s !== 'object') return false;
  const obj = s as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    typeof obj.solvedNum === 'number' && Number.isFinite(obj.solvedNum) &&
    obj.solvedNum >= 0
  );
}
```

在聚合器中使用：

```typescript
const allContests = platformStatus
  .flatMap(r => r.data)
  .filter(validateContest);  // 过滤掉畸形数据
```

### 1.9 影响范围汇总

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `electron/services/adapters/` | 新增目录 | 10+ 个适配器文件 |
| `electron/services/contest-aggregator.ts` | 新增 | 替代原 `contest.js` |
| `electron/services/rating-aggregator.ts` | 新增 | 替代原 `rating.js` |
| `electron/services/solved-aggregator.ts` | 新增 | 替代原 `solvedNum.js` |
| `electron/services/validators.ts` | 新增 | 数据校验 |
| `electron/main.ts` | 修改 | IPC handler 使用新聚合器 |
| `shared/types.ts` | 修改 | 新增 ContestFetchResponse |
| `src/services/contest.ts` | 修改 | 适配新返回结构 |
| `src/stores/contest.ts` | 修改 | 处理 platformStatus |

---

## 2. 离线缓存策略

### 2.1 设计原则

- **优先使用网络数据**：联网时始终请求最新数据
- **网络失败自动降级**：请求失败时自动使用上次成功的缓存数据
- **缓存时效性**：缓存数据附带时间戳，UI 可显示"数据来自 X 分钟前"
- **缓存存储在主进程**：基于 INFRA_PLAN.md 中建立的 electron-store

### 2.2 缓存架构

```
请求流程：

Vue 组件 → Pinia Store → IPC Service → 主进程 IPC Handler
                                             │
                                    ┌────────┴────────┐
                                    │ 联网？          │
                                    │ Yes    │   No   │
                                    ▼        │        ▼
                              抓取新数据     │  读取缓存
                                    │        │        │
                                    ▼        │        ▼
                              写入缓存       │  返回缓存数据
                                    │        │  + fromCache: true
                                    ▼        │
                              返回新数据     │
                              + fromCache:   │
                                false        │
                                             │
                                   抓取失败？ │
                                   ──────────┘
                                        │
                                        ▼
                                   有缓存？
                                   Yes → 返回缓存 + fromCache: true
                                   No  → 返回空 + 错误信息
```

### 2.3 缓存服务实现

```typescript
// electron/services/cache-service.ts
import { store } from '../store';

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;   // Unix timestamp (ms)
  platform?: string;
}

const CACHE_KEYS = {
  CONTESTS: 'cache.contests',
  RATINGS: 'cache.ratings',
  SOLVED: 'cache.solvedNums',
} as const;

/** 比赛缓存有效期：2 小时 */
const CONTEST_CACHE_TTL = 2 * 60 * 60 * 1000;
/** Rating 缓存有效期：6 小时 */
const RATING_CACHE_TTL = 6 * 60 * 60 * 1000;
/** 做题统计缓存有效期：12 小时 */
const SOLVED_CACHE_TTL = 12 * 60 * 60 * 1000;

export class CacheService {
  /** 保存比赛数据缓存 */
  static saveContests(data: any[]): void {
    const entry: CacheEntry<any[]> = {
      data,
      fetchedAt: Date.now(),
    };
    store.set(CACHE_KEYS.CONTESTS, entry);
  }

  /** 读取比赛缓存 */
  static getContests(): CacheEntry<any[]> | null {
    const entry = store.get(CACHE_KEYS.CONTESTS) as CacheEntry<any[]> | undefined;
    if (!entry || !entry.data) return null;
    // 过期检查（可选，即使过期也作为降级数据返回）
    return entry;
  }

  /** 比赛缓存是否在有效期内 */
  static isContestCacheFresh(): boolean {
    const entry = this.getContests();
    if (!entry) return false;
    return Date.now() - entry.fetchedAt < CONTEST_CACHE_TTL;
  }

  /** 保存 Rating 缓存 */
  static saveRating(platform: string, handle: string, data: any): void {
    const key = `${CACHE_KEYS.RATINGS}.${platform}_${handle}`;
    store.set(key, { data, fetchedAt: Date.now() } as CacheEntry<any>);
  }

  /** 读取 Rating 缓存 */
  static getRating(platform: string, handle: string): CacheEntry<any> | null {
    const key = `${CACHE_KEYS.RATINGS}.${platform}_${handle}`;
    const entry = store.get(key) as CacheEntry<any> | undefined;
    return entry ?? null;
  }

  /** 保存做题数缓存 */
  static saveSolved(platform: string, handle: string, data: any): void {
    const key = `${CACHE_KEYS.SOLVED}.${platform}_${handle}`;
    store.set(key, { data, fetchedAt: Date.now() } as CacheEntry<any>);
  }

  /** 读取做题数缓存 */
  static getSolved(platform: string, handle: string): CacheEntry<any> | null {
    const key = `${CACHE_KEYS.SOLVED}.${platform}_${handle}`;
    const entry = store.get(key) as CacheEntry<any> | undefined;
    return entry ?? null;
  }

  /** 清除所有缓存 */
  static clearAll(): void {
    store.delete('cache');
  }
}
```

### 2.4 IPC Handler 集成缓存

```typescript
// 修改主进程 IPC handler：比赛列表
ipcMain.handle(IPC_CHANNELS.GET_CONTESTS, async (_event, day: number) => {
  try {
    const result = await fetchAllContests(validatedDay);

    // 抓取成功：写入缓存
    if (result.data.length > 0) {
      CacheService.saveContests(result.data);
    }

    return {
      contests: result.data,
      platformStatus: result.platformStatus,
      totalElapsed: result.totalElapsed,
      fromCache: false,
      cachedAt: null,
    };
  } catch (error) {
    // 抓取全部失败：尝试返回缓存
    const cached = CacheService.getContests();
    if (cached) {
      console.warn('[contests] All platforms failed, returning cached data');
      return {
        contests: cached.data,
        platformStatus: [],
        totalElapsed: 0,
        fromCache: true,
        cachedAt: cached.fetchedAt,
      };
    }

    // 无缓存可用
    return {
      contests: [],
      platformStatus: [],
      totalElapsed: 0,
      fromCache: false,
      cachedAt: null,
      error: '获取失败且无可用缓存',
    };
  }
});
```

### 2.5 渲染进程缓存状态展示

在 Pinia Store 中增加缓存状态：

```typescript
// src/stores/contest.ts 追加
interface ContestState {
  // ...已有字段
  fromCache: boolean;
  cachedAt: number | null;
  platformStatus: Array<{
    platform: string;
    success: boolean;
    error?: string;
    elapsed: number;
  }>;
}
```

在 Contest.vue 的摘要卡片中可展示：
- 如果 `fromCache === true`：显示 "数据来自 X 分钟前的缓存"
- 如果某平台失败：在平台 logo 旁显示警告图标 + tooltip
- 显示 "刷新" 按钮允许用户手动重试

---

## 3. 性能优化方案

### 3.1 当前性能瓶颈分析

| 瓶颈 | 现象 | 原因 |
|------|------|------|
| 首屏加载慢 | 打开应用后 1-3 秒才看到比赛列表 | 6 个平台串行/并行抓取，最慢的平台决定总耗时 |
| Contest.vue 卡顿 | 39.5KB 单文件，操作时偶尔卡顿 | 组件过大，所有逻辑在一个组件中 |
| 图表渲染 | StatsPanel 打开/关闭有延迟 | ECharts 全量引入 |
| 无虚拟滚动 | 30 天比赛列表滚动不流畅（大量 DOM） | 所有比赛 DOM 节点一次性渲染 |

### 3.2 优化方案

#### 3.2.1 首屏渲染优化：渐进式加载

**策略**：不等所有平台返回才渲染，而是每个平台返回即刻更新。

实现方式 — 主进程用 `webContents.send` 实现流式推送：

```typescript
// electron/main.ts
ipcMain.handle(IPC_CHANNELS.GET_CONTESTS, async (event, day: number) => {
  const win = BrowserWindow.fromWebContents(event.sender);

  // 立即返回缓存（如果有），让用户先看到内容
  const cached = CacheService.getContests();
  if (cached) {
    win?.webContents.send('contests-partial', {
      contests: cached.data,
      fromCache: true,
      cachedAt: cached.fetchedAt,
    });
  }

  // 然后并发抓取最新数据
  const result = await fetchAllContests(validatedDay);

  if (result.data.length > 0) {
    CacheService.saveContests(result.data);
  }

  return {
    contests: result.data,
    platformStatus: result.platformStatus,
    totalElapsed: result.totalElapsed,
    fromCache: false,
  };
});
```

#### 3.2.2 Contest.vue 组件拆分

将 39.5KB 的 Contest.vue 拆分为以下子组件：

```
src/components/contest/
├── ContestSummaryCards.vue      # 顶部 3 张摘要卡片
├── ContestDayGroup.vue          # 单日比赛分组
├── ContestCard.vue              # 单个比赛卡片
├── ContestFilterToolbar.vue     # 筛选工具栏
├── ContestPlatformStatus.vue    # 平台抓取状态指示器
└── ContestCountdown.vue         # 比赛倒计时组件
```

每个子组件通过 `defineProps` 接收数据，使用 `defineEmits` 发出事件，实现关注点分离。

#### 3.2.3 ECharts 按需引入

当前 StatsPanel.vue 全量引入 ECharts（约 1MB）。改为按需引入：

```typescript
// src/utils/echarts-setup.ts
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart, BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components';

use([
  CanvasRenderer,
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);

export { init } from 'echarts/core';
```

在 StatsPanel.vue 中使用：
```typescript
import { init } from '../utils/echarts-setup';
// 替代原来的 import * as echarts from 'echarts';
```

预计 bundle size 减少约 600KB。

#### 3.2.4 路由懒加载

当前 `src/router/index.ts` 同步导入所有视图组件。改为动态导入：

```typescript
// src/router/index.ts（优化后）
const routes = [
  {
    path: '/',
    component: () => import('../views/NavigationPage.vue'),
    children: [
      { path: '', redirect: '/contest' },
      { path: 'contest', component: () => import('../views/Contest.vue') },
      { path: 'star', component: () => import('../views/Favorite.vue') },
      { path: 'service', component: () => import('../views/Feature.vue') },
      { path: 'setting', component: () => import('../views/Settings.vue') },
      { path: 'rating', component: () => import('../views/RatingPage.vue') },
      { path: 'solved_num', component: () => import('../views/SolvedNumPage.vue') },
    ],
  },
];
```

Vite 会自动将每个路由组件分割为独立 chunk，首屏只加载 Contest 页面的代码。

#### 3.2.5 Axios 实例统一管理与请求去重

避免短时间内重复请求同一平台：

```typescript
// electron/services/request-dedup.ts
const pendingRequests = new Map<string, Promise<any>>();

export function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = pendingRequests.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fn().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}
```

使用：
```typescript
// 在 IPC handler 中
ipcMain.handle(IPC_CHANNELS.GET_CONTESTS, async (_event, day) => {
  return dedup(`contests-${day}`, () => fetchAllContests(day));
});
```

### 3.3 性能优化预期效果

| 优化项 | 优化前 | 优化后 | 改善幅度 |
|--------|--------|--------|----------|
| 首屏可见时间 | 1-3 秒（等全部平台） | <100ms（缓存先行） | >90% |
| 打包体积 (ECharts) | ~1MB | ~400KB | ~60% |
| Contest.vue 文件大小 | 39.5KB | 主文件 <5KB + 子组件 | 组件化 |
| 重复请求 | 快速切换页签触发重复 | 去重，同一请求只发一次 | 消除冗余 |

---

## 4. 实施顺序与验证

### 4.1 实施顺序

```
阶段 1: 数据抓取重构（v1.3）
  ├── 1a. 创建 adapters/ 目录和基础类
  ├── 1b. 逐个迁移平台适配器（优先 API 类，后迁移 cheerio 类）
  │       迁移顺序（按脆弱性从低到高）：
  │       Codeforces (API) → LeetCode (GraphQL) → 蓝桥 (API)
  │       → 洛谷 (半API) → AtCoder (cheerio) → 牛客 (cheerio)
  ├── 1c. 实现聚合器 + 数据校验
  ├── 1d. 更新 IPC handler 使用新聚合器
  └── 1e. 验证所有平台抓取正常

阶段 2: 离线缓存（v1.3）
  ├── 2a. 实现 CacheService
  ├── 2b. IPC handler 集成缓存读写
  └── 2c. 渲染进程展示缓存状态

阶段 3: 性能优化（v1.4 ~ v1.5）
  ├── 3a. ECharts 按需引入
  ├── 3b. 路由懒加载
  ├── 3c. Contest.vue 组件拆分
  ├── 3d. 请求去重
  └── 3e. 首屏渐进加载
```

### 4.2 验证清单

**数据抓取**：
- [ ] 断开某个平台（如 mock 超时），其余平台数据正常返回
- [ ] 全部平台超时，返回有意义的错误信息
- [ ] 各平台耗时独立计算，单平台不阻塞全局
- [ ] 畸形数据被 validator 过滤
- [ ] 各平台健康检查 API 可用

**离线缓存**：
- [ ] 联网状态正常抓取并写入缓存
- [ ] 断网后启动应用，显示上次缓存数据
- [ ] 缓存数据标记为 `fromCache: true`
- [ ] UI 显示"数据来自 X 分钟前"

**性能**：
- [ ] `bun run build` 后检查 dist/ 产物大小
- [ ] 首屏打开到显示内容 < 500ms（有缓存时）
- [ ] 快速连续点击"刷新"只触发一次请求

### 4.3 测试策略

新增单元测试覆盖：

```typescript
// tests/unit/adapters/codeforces.test.ts
import { describe, test, expect, mock } from 'bun:test';
import { CodeforcesAdapter } from '../../../electron/services/adapters/codeforces.adapter';

describe('CodeforcesAdapter', () => {
  test('fetchContests parses API response correctly', async () => {
    // mock axios response
    // verify returned RawContest[] structure
  });

  test('fetchContests returns empty array on API error', async () => {
    // mock 502 response
    // verify graceful degradation
  });

  test('fetchRating validates handle input', async () => {
    const adapter = new CodeforcesAdapter();
    await expect(adapter.fetchRating('')).rejects.toThrow();
  });
});

// tests/unit/cache-service.test.ts
describe('CacheService', () => {
  test('saves and retrieves contest cache', () => { /* ... */ });
  test('returns null for missing cache', () => { /* ... */ });
  test('cache freshness check works correctly', () => { /* ... */ });
});

// tests/unit/validators.test.ts
describe('Validators', () => {
  test('validateContest rejects invalid timestamps', () => { /* ... */ });
  test('validateContest rejects empty names', () => { /* ... */ });
  test('validateRating accepts valid data', () => { /* ... */ });
});
```
