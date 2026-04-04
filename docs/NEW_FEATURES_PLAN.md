# OJFlow 扩展新功能开发实施方案

> 版本：v2.0 | 基于 PRD Phase 3 | 前置依赖：基础设施建设 + 核心体验优化完成

---

## 目录

1. [本地题解库](#1-本地题解库)
2. [虚拟竞赛模式](#2-虚拟竞赛模式)
3. [每日训练推荐](#3-每日训练推荐)
4. [数据导出与备份](#4-数据导出与备份)
5. [功能交叉依赖关系](#5-功能交叉依赖关系)
6. [实施路线图](#6-实施路线图)

---

## 1. 本地题解库

### 1.1 功能定义

为竞赛选手提供本地化的题解管理系统，支持：
- Markdown 编写和预览题解
- 关联题目（通过题号、链接或平台标识）
- 按算法标签和难度分类
- 全文搜索
- 导出为 PDF / HTML

### 1.2 数据模型设计

```typescript
// shared/types/solution.ts

/** 题解条目 */
export interface Solution {
  /** 唯一标识 (UUID v4) */
  id: string;
  /** 题解标题 */
  title: string;
  /** Markdown 内容 */
  content: string;
  /** 关联的题目信息 */
  problem: ProblemRef;
  /** 算法标签 */
  tags: string[];
  /** 难度评级 (1-5) */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** 题解语言 (如 C++, Python, Java) */
  language?: string;
  /** 代码片段 (可选，从 content 中提取或独立存储) */
  codeSnippet?: string;
  /** 创建时间 */
  createdAt: number;
  /** 最后修改时间 */
  updatedAt: number;
}

/** 题目引用 */
export interface ProblemRef {
  /** 平台名 */
  platform: string;
  /** 题目编号 (如 1A, abc301_a) */
  problemId: string;
  /** 题目名称 */
  name?: string;
  /** 题目链接 */
  url?: string;
}

/** 预定义算法标签 */
export const ALGORITHM_TAGS = [
  '暴力', '模拟', '贪心', '二分',
  'DP', '图论', '数据结构', '数学',
  '字符串', '搜索', '树', '几何',
  '博弈论', '网络流', '分治', '其他',
] as const;

/** 题解搜索条件 */
export interface SolutionFilter {
  keyword?: string;        // 全文搜索关键词
  tags?: string[];         // 按标签筛选
  difficulty?: number[];   // 按难度筛选
  platform?: string;       // 按平台筛选
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/** 搜索结果 */
export interface SolutionSearchResult {
  items: Solution[];
  total: number;
  page: number;
  pageSize: number;
}
```

### 1.3 存储方案

使用文件系统 + JSON 索引的混合方案（适合 Electron 桌面应用）：

```
userData/
  solutions/
    index.json              # 索引文件（不含 content，用于列表/搜索）
    {id}.md                 # 每个题解一个 Markdown 文件
    attachments/            # 附件目录（图片等）
      {id}/
        img1.png
```

**为什么不用 SQLite**：
- 增加原生模块依赖（electron-rebuild 复杂度），对小规模数据集（百到千级）文件系统足够
- Markdown 文件可以直接被外部编辑器打开
- 便于 Git 管理和手动备份

**索引文件结构**：

```typescript
// index.json 结构
interface SolutionIndex {
  version: 1;
  items: Array<{
    id: string;
    title: string;
    problem: ProblemRef;
    tags: string[];
    difficulty: number;
    language?: string;
    createdAt: number;
    updatedAt: number;
  }>;
}
```

### 1.4 主进程 Service 实现

```typescript
// electron/services/solution-service.ts
import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import type { Solution, SolutionFilter, SolutionSearchResult, SolutionIndex } from '../../shared/types/solution';

const SOLUTIONS_DIR = path.join(app.getPath('userData'), 'solutions');
const INDEX_PATH = path.join(SOLUTIONS_DIR, 'index.json');

class SolutionService {
  private index: SolutionIndex = { version: 1, items: [] };
  private initialized = false;

  /** 初始化：确保目录存在，加载索引 */
  async init(): Promise<void> {
    if (this.initialized) return;
    await fs.mkdir(SOLUTIONS_DIR, { recursive: true });
    await fs.mkdir(path.join(SOLUTIONS_DIR, 'attachments'), { recursive: true });

    try {
      const raw = await fs.readFile(INDEX_PATH, 'utf-8');
      this.index = JSON.parse(raw);
    } catch {
      this.index = { version: 1, items: [] };
      await this.saveIndex();
    }

    this.initialized = true;
  }

  /** 保存索引到磁盘 */
  private async saveIndex(): Promise<void> {
    await fs.writeFile(INDEX_PATH, JSON.stringify(this.index, null, 2), 'utf-8');
  }

  /** 创建题解 */
  async create(data: Omit<Solution, 'id' | 'createdAt' | 'updatedAt'>): Promise<Solution> {
    await this.init();

    const id = uuid();
    const now = Date.now();
    const solution: Solution = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    // 写入 Markdown 文件
    const mdPath = path.join(SOLUTIONS_DIR, `${id}.md`);
    await fs.writeFile(mdPath, solution.content, 'utf-8');

    // 更新索引（不含 content）
    this.index.items.push({
      id,
      title: solution.title,
      problem: solution.problem,
      tags: solution.tags,
      difficulty: solution.difficulty,
      language: solution.language,
      createdAt: now,
      updatedAt: now,
    });
    await this.saveIndex();

    return solution;
  }

  /** 读取题解（含 content） */
  async getById(id: string): Promise<Solution | null> {
    await this.init();

    const meta = this.index.items.find(item => item.id === id);
    if (!meta) return null;

    try {
      const content = await fs.readFile(path.join(SOLUTIONS_DIR, `${id}.md`), 'utf-8');
      return { ...meta, content };
    } catch {
      return null;
    }
  }

  /** 更新题解 */
  async update(id: string, data: Partial<Omit<Solution, 'id' | 'createdAt'>>): Promise<Solution | null> {
    await this.init();

    const idx = this.index.items.findIndex(item => item.id === id);
    if (idx === -1) return null;

    const now = Date.now();

    // 更新 content 文件
    if (data.content !== undefined) {
      await fs.writeFile(path.join(SOLUTIONS_DIR, `${id}.md`), data.content, 'utf-8');
    }

    // 更新索引
    const meta = this.index.items[idx];
    if (data.title !== undefined) meta.title = data.title;
    if (data.tags !== undefined) meta.tags = data.tags;
    if (data.difficulty !== undefined) meta.difficulty = data.difficulty;
    if (data.problem !== undefined) meta.problem = data.problem;
    if (data.language !== undefined) meta.language = data.language;
    meta.updatedAt = now;

    await this.saveIndex();

    // 返回完整对象
    const content = data.content ?? await fs.readFile(path.join(SOLUTIONS_DIR, `${id}.md`), 'utf-8');
    return { ...meta, content };
  }

  /** 删除题解 */
  async delete(id: string): Promise<boolean> {
    await this.init();

    const idx = this.index.items.findIndex(item => item.id === id);
    if (idx === -1) return false;

    // 删除文件
    try {
      await fs.unlink(path.join(SOLUTIONS_DIR, `${id}.md`));
    } catch { /* 文件可能已不存在 */ }

    // 删除附件目录
    try {
      await fs.rm(path.join(SOLUTIONS_DIR, 'attachments', id), { recursive: true });
    } catch { /* 可能无附件 */ }

    // 更新索引
    this.index.items.splice(idx, 1);
    await this.saveIndex();

    return true;
  }

  /** 搜索题解 */
  async search(filter: SolutionFilter): Promise<SolutionSearchResult> {
    await this.init();

    let items = [...this.index.items];

    // 关键词搜索（标题 + 标签 + 题目名/编号）
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase();
      items = items.filter(item =>
        item.title.toLowerCase().includes(kw) ||
        item.tags.some(t => t.toLowerCase().includes(kw)) ||
        item.problem.name?.toLowerCase().includes(kw) ||
        item.problem.problemId.toLowerCase().includes(kw)
      );
    }

    // 标签筛选
    if (filter.tags && filter.tags.length > 0) {
      items = items.filter(item =>
        filter.tags!.some(tag => item.tags.includes(tag))
      );
    }

    // 难度筛选
    if (filter.difficulty && filter.difficulty.length > 0) {
      items = items.filter(item =>
        filter.difficulty!.includes(item.difficulty)
      );
    }

    // 平台筛选
    if (filter.platform) {
      items = items.filter(item => item.problem.platform === filter.platform);
    }

    // 排序
    const sortBy = filter.sortBy ?? 'updatedAt';
    const sortOrder = filter.sortOrder ?? 'desc';
    items.sort((a, b) => {
      const va = a[sortBy] ?? '';
      const vb = b[sortBy] ?? '';
      const cmp = typeof va === 'number' ? va - (vb as number) : String(va).localeCompare(String(vb));
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    // 分页
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return {
      items: paged as Solution[], // 注意：这里没有 content 字段
      total: items.length,
      page,
      pageSize,
    };
  }

  /** 全文搜索（包含 Markdown 内容） */
  async fullTextSearch(keyword: string): Promise<SolutionSearchResult> {
    await this.init();

    const kw = keyword.toLowerCase();
    const matches: Array<typeof this.index.items[0]> = [];

    for (const item of this.index.items) {
      // 先检查元数据
      if (
        item.title.toLowerCase().includes(kw) ||
        item.tags.some(t => t.toLowerCase().includes(kw))
      ) {
        matches.push(item);
        continue;
      }

      // 再检查文件内容
      try {
        const content = await fs.readFile(path.join(SOLUTIONS_DIR, `${item.id}.md`), 'utf-8');
        if (content.toLowerCase().includes(kw)) {
          matches.push(item);
        }
      } catch { /* 跳过无法读取的文件 */ }
    }

    return {
      items: matches as Solution[],
      total: matches.length,
      page: 1,
      pageSize: matches.length,
    };
  }
}

export const solutionService = new SolutionService();
```

### 1.5 IPC 通道注册

```typescript
// shared/ipc-channels.ts 追加
export const IPC_CHANNELS = {
  // ... 已有通道

  // 题解管理
  SOLUTION_CREATE: 'solution-create',
  SOLUTION_GET: 'solution-get',
  SOLUTION_UPDATE: 'solution-update',
  SOLUTION_DELETE: 'solution-delete',
  SOLUTION_SEARCH: 'solution-search',
  SOLUTION_FULLTEXT_SEARCH: 'solution-fulltext-search',
} as const;
```

### 1.6 Markdown 编辑器选型

| 编辑器 | 包大小 | 特点 | 推荐度 |
|--------|--------|------|--------|
| **vditor** | ~2MB | 功能最全，支持所见即所得/即时渲染/分屏预览，内置代码高亮、公式、流程图 | 首选 |
| milkdown | ~500KB | 基于 ProseMirror，插件化，轻量 | 备选 |
| md-editor-v3 | ~1MB | Vue 3 原生组件，开箱即用 | 备选 |

**推荐 vditor**：竞赛题解需要代码高亮（多语言）和数学公式（LaTeX）支持，vditor 原生支持这两项。

### 1.7 渲染进程页面设计

#### 路由规划

```typescript
// 新增路由
{ path: 'solutions', component: () => import('../views/SolutionListPage.vue') },
{ path: 'solutions/:id', component: () => import('../views/SolutionEditorPage.vue') },
{ path: 'solutions/new', component: () => import('../views/SolutionEditorPage.vue') },
```

#### 页面结构

**SolutionListPage.vue** — 题解列表页：
```
┌──────────────────────────────────────────────┐
│  🔍 搜索栏     [标签筛选▾] [难度▾] [+ 新题解]│
├──────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │ 题解卡片 │ │ 题解卡片 │ │ 题解卡片 │        │
│  │ CF 1A   │ │ ABC 301 │ │ LC 两数  │        │
│  │ DP 贪心  │ │ 图论    │ │ 哈希表   │        │
│  │ ★★★☆☆  │ │ ★★★★☆  │ │ ★☆☆☆☆  │        │
│  └─────────┘ └─────────┘ └─────────┘        │
│  ┌─────────┐ ┌─────────┐                    │
│  │ ...     │ │ ...     │                    │
│  └─────────┘ └─────────┘                    │
├──────────────────────────────────────────────┤
│  ◄ 1 2 3 ... ►                  共 42 篇题解 │
└──────────────────────────────────────────────┘
```

**SolutionEditorPage.vue** — 题解编辑页：
```
┌──────────────────────────────────────────────┐
│  ← 返回    题解标题输入              [保存]   │
├──────────────────────────────────────────────┤
│  平台: [CF▾]  题号: [1A    ]  链接: [      ] │
│  标签: [DP] [贪心] [+]     难度: ★★★☆☆      │
├──────────────────────────────────────────────┤
│                                              │
│  ┌─ Markdown 编辑器 (vditor) ─────────────┐ │
│  │                                         │ │
│  │  ## 思路                                │ │
│  │                                         │ │
│  │  这道题使用 DP 求解...                   │ │
│  │                                         │ │
│  │  ```cpp                                 │ │
│  │  int dp[N];                             │ │
│  │  ```                                    │ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### 1.8 Pinia Store

```typescript
// src/stores/solution.ts
import { defineStore } from 'pinia';
import type { Solution, SolutionFilter, SolutionSearchResult } from '../types/solution';

export const useSolutionStore = defineStore('solution', {
  state: () => ({
    searchResult: null as SolutionSearchResult | null,
    currentSolution: null as Solution | null,
    loading: false,
    filter: {
      keyword: '',
      tags: [],
      difficulty: [],
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      page: 1,
      pageSize: 20,
    } as SolutionFilter,
  }),
  actions: {
    async search() {
      this.loading = true;
      try {
        this.searchResult = await window.api.solutionSearch(this.filter);
      } finally {
        this.loading = false;
      }
    },
    async create(data: Omit<Solution, 'id' | 'createdAt' | 'updatedAt'>) {
      const solution = await window.api.solutionCreate(data);
      await this.search(); // 刷新列表
      return solution;
    },
    async load(id: string) {
      this.currentSolution = await window.api.solutionGet(id);
    },
    async save(id: string, data: Partial<Solution>) {
      this.currentSolution = await window.api.solutionUpdate(id, data);
    },
    async remove(id: string) {
      await window.api.solutionDelete(id);
      await this.search();
    },
  },
});
```

### 1.9 依赖安装

```bash
bun add vditor uuid
bun add -d @types/uuid
```

---

## 2. 虚拟竞赛模式

### 2.1 功能定义

模拟真实竞赛环境，让选手在时间压力下练习历史比赛：
- 从 Codeforces / AtCoder 选取历史比赛
- 完整倒计时计时器
- 题目列表展示（通过 webview 或外部浏览器打开）
- 手动记录每道题的完成状态和用时
- 赛后生成统计报告

### 2.2 数据模型

```typescript
// shared/types/virtual-contest.ts

/** 虚拟竞赛状态 */
export type VContestStatus = 'not-started' | 'running' | 'paused' | 'finished';

/** 虚拟竞赛定义 */
export interface VirtualContest {
  id: string;
  /** 原始比赛名称 */
  originalContestName: string;
  /** 来源平台 */
  platform: string;
  /** 比赛时长 (秒) */
  duration: number;
  /** 题目列表 */
  problems: VContestProblem[];
  /** 实际开始时间 (timestamp) */
  startedAt?: number;
  /** 实际结束时间 (timestamp) */
  finishedAt?: number;
  /** 暂停累计时长 (秒) */
  pausedDuration: number;
  /** 状态 */
  status: VContestStatus;
  /** 创建时间 */
  createdAt: number;
}

/** 虚拟竞赛中的题目 */
export interface VContestProblem {
  /** 题目索引 (A, B, C, ...) */
  index: string;
  /** 题目名称 */
  name: string;
  /** 题目链接 */
  url: string;
  /** 是否已完成 (AC) */
  solved: boolean;
  /** 解题用时 (秒，从比赛开始计) */
  solveTime?: number;
  /** 尝试次数 */
  attempts: number;
}

/** 赛后统计 */
export interface VContestReport {
  contestId: string;
  contestName: string;
  platform: string;
  duration: number;
  actualDuration: number;  // 实际用时 (含/不含暂停)
  problemsSolved: number;
  totalProblems: number;
  /** 各题完成时间线 */
  timeline: Array<{
    problemIndex: string;
    solveTime: number;
    attempts: number;
  }>;
}
```

### 2.3 Codeforces 历史比赛拉取

```typescript
// electron/services/adapters/codeforces.adapter.ts 扩展

/** 获取 Codeforces 历史比赛列表 */
async fetchPastContests(limit = 50): Promise<Array<{
  id: number;
  name: string;
  duration: number;
  startTime: number;
  type: string;
}>> {
  const response = await this.http.get(
    'https://codeforces.com/api/contest.list?gym=false'
  );

  if (response.data?.status !== 'OK') {
    throw new Error('CF API error');
  }

  return response.data.result
    .filter((c: any) => c.phase === 'FINISHED' && c.type === 'CF')
    .slice(0, limit)
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      duration: c.durationSeconds,
      startTime: c.startTimeSeconds,
      type: c.type,
    }));
}

/** 获取某场比赛的题目列表 */
async fetchContestProblems(contestId: number): Promise<VContestProblem[]> {
  const response = await this.http.get(
    `https://codeforces.com/api/contest.standings?contestId=${contestId}&from=1&count=1`
  );

  if (response.data?.status !== 'OK') {
    throw new Error('CF API error');
  }

  return response.data.result.problems.map((p: any) => ({
    index: p.index,
    name: p.name,
    url: `https://codeforces.com/contest/${contestId}/problem/${p.index}`,
    solved: false,
    attempts: 0,
  }));
}
```

### 2.4 虚拟竞赛状态管理

```typescript
// src/stores/virtual-contest.ts
import { defineStore } from 'pinia';
import type { VirtualContest, VContestStatus, VContestReport } from '../types/virtual-contest';

export const useVirtualContestStore = defineStore('virtual-contest', {
  state: () => ({
    /** 当前进行中的虚拟竞赛 */
    activeContest: null as VirtualContest | null,
    /** 历史虚拟竞赛 */
    history: [] as VirtualContest[],
    /** 倒计时剩余秒数 */
    remainingSeconds: 0,
    /** 计时器 ID */
    _timerId: null as ReturnType<typeof setInterval> | null,
  }),
  getters: {
    isRunning: (state) => state.activeContest?.status === 'running',
    isPaused: (state) => state.activeContest?.status === 'paused',
    elapsedSeconds: (state) => {
      if (!state.activeContest?.startedAt) return 0;
      return state.activeContest.duration - state.remainingSeconds;
    },
    /** 格式化剩余时间 HH:MM:SS */
    formattedRemaining: (state) => {
      const s = state.remainingSeconds;
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    },
    solvedCount: (state) => {
      return state.activeContest?.problems.filter(p => p.solved).length ?? 0;
    },
  },
  actions: {
    /** 创建虚拟竞赛 */
    async createContest(params: {
      originalContestName: string;
      platform: string;
      duration: number;
      problems: VContestProblem[];
    }) {
      const contest: VirtualContest = {
        id: crypto.randomUUID(),
        ...params,
        pausedDuration: 0,
        status: 'not-started',
        createdAt: Date.now(),
      };
      this.activeContest = contest;
    },

    /** 开始比赛 */
    start() {
      if (!this.activeContest) return;
      this.activeContest.status = 'running';
      this.activeContest.startedAt = Date.now();
      this.remainingSeconds = this.activeContest.duration;
      this._startTimer();
    },

    /** 暂停 */
    pause() {
      if (!this.activeContest || this.activeContest.status !== 'running') return;
      this.activeContest.status = 'paused';
      this._stopTimer();
    },

    /** 恢复 */
    resume() {
      if (!this.activeContest || this.activeContest.status !== 'paused') return;
      this.activeContest.status = 'running';
      this._startTimer();
    },

    /** 结束比赛 */
    finish() {
      if (!this.activeContest) return;
      this.activeContest.status = 'finished';
      this.activeContest.finishedAt = Date.now();
      this._stopTimer();

      // 保存到历史记录
      this.history.unshift({ ...this.activeContest });
      // 持久化
      window.store.set('virtualContestHistory', this.history);
    },

    /** 标记题目完成 */
    solveProblem(index: string) {
      if (!this.activeContest || this.activeContest.status !== 'running') return;
      const problem = this.activeContest.problems.find(p => p.index === index);
      if (!problem || problem.solved) return;

      problem.solved = true;
      problem.solveTime = this.elapsedSeconds;
      problem.attempts += 1;
    },

    /** 增加尝试次数（WA） */
    addAttempt(index: string) {
      if (!this.activeContest || this.activeContest.status !== 'running') return;
      const problem = this.activeContest.problems.find(p => p.index === index);
      if (!problem || problem.solved) return;
      problem.attempts += 1;
    },

    /** 生成赛后报告 */
    generateReport(): VContestReport | null {
      const c = this.activeContest;
      if (!c || c.status !== 'finished') return null;

      return {
        contestId: c.id,
        contestName: c.originalContestName,
        platform: c.platform,
        duration: c.duration,
        actualDuration: c.finishedAt! - c.startedAt! - c.pausedDuration * 1000,
        problemsSolved: c.problems.filter(p => p.solved).length,
        totalProblems: c.problems.length,
        timeline: c.problems
          .filter(p => p.solved)
          .map(p => ({
            problemIndex: p.index,
            solveTime: p.solveTime!,
            attempts: p.attempts,
          }))
          .sort((a, b) => a.solveTime - b.solveTime),
      };
    },

    /** 内部：启动计时器 */
    _startTimer() {
      this._stopTimer();
      this._timerId = setInterval(() => {
        if (this.remainingSeconds <= 0) {
          this.finish();
          return;
        }
        this.remainingSeconds -= 1;
      }, 1000);
    },

    /** 内部：停止计时器 */
    _stopTimer() {
      if (this._timerId) {
        clearInterval(this._timerId);
        this._timerId = null;
      }
    },
  },
});
```

### 2.5 UI 设计

#### 路由

```typescript
{ path: 'virtual', component: () => import('../views/VirtualContestPage.vue') },
{ path: 'virtual/:id', component: () => import('../views/VirtualContestRunPage.vue') },
```

#### 比赛选择页 (VirtualContestPage.vue)

```
┌──────────────────────────────────────────────┐
│  虚拟竞赛                                     │
├──────────────────────────────────────────────┤
│  选择比赛来源：                                │
│  [Codeforces ▾]                              │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ Codeforces Round #900 (Div.3)  2h     │  │
│  │ Codeforces Round #899 (Div.1)  2.5h   │  │
│  │ Educational CF Round 155       2h     │  │
│  │ ...                                   │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  [开始虚拟竞赛]                               │
├──────────────────────────────────────────────┤
│  历史记录                                     │
│  ┌──────┐ ┌──────┐ ┌──────┐                 │
│  │ #900 │ │ #898 │ │ #895 │                 │
│  │ 4/7  │ │ 6/8  │ │ 3/6  │                 │
│  └──────┘ └──────┘ └──────┘                 │
└──────────────────────────────────────────────┘
```

#### 比赛进行页 (VirtualContestRunPage.vue)

```
┌──────────────────────────────────────────────┐
│  CF Round #900 (Div.3)     ⏱ 01:23:45       │
│  ████████████░░░░░░░░  62%   [暂停] [结束]   │
├──────────────────────────────────────────────┤
│                                              │
│  ┌─────┬──────────────────┬───────┬────────┐ │
│  │ Idx │ 题目名称          │ 状态  │ 用时    │ │
│  ├─────┼──────────────────┼───────┼────────┤ │
│  │  A  │ Watermelon       │ ✅ AC │ 0:03   │ │
│  │  B  │ Fibonacci        │ ✅ AC │ 0:12   │ │
│  │  C  │ Queen's Move     │ ❌ x2 │  -     │ │
│  │  D  │ Bridges          │ ⬜    │  -     │ │
│  │  E  │ Kth Largest      │ ⬜    │  -     │ │
│  └─────┴──────────────────┴───────┴────────┘ │
│                                              │
│  点击题目名称在浏览器中打开                     │
│  [标记 AC] [标记 WA]                          │
└──────────────────────────────────────────────┘
```

### 2.6 关键技术细节

**题目打开方式**：通过 `shell.openExternal()` 在默认浏览器中打开题目链接，而非使用 webview。原因：
- 避免 OJ 登录态问题
- 减少 Electron 安全配置复杂度
- 用户可以使用自己的浏览器插件和设置

**倒计时精确度**：`setInterval` 有漂移问题。改进方案：
```typescript
// 使用 startedAt + elapsed 计算剩余时间，而非每秒减 1
_startTimer() {
  this._timerId = setInterval(() => {
    const elapsed = (Date.now() - this.activeContest!.startedAt!) / 1000
      - this.activeContest!.pausedDuration;
    this.remainingSeconds = Math.max(0, this.activeContest!.duration - Math.floor(elapsed));
    if (this.remainingSeconds <= 0) {
      this.finish();
    }
  }, 200); // 200ms 刷新一次，保证秒数变化的及时性
}
```

---

## 3. 每日训练推荐

### 3.1 功能定义

根据用户的 Rating 水平，推荐适合练习的题目：
- 从 Codeforces Problemset API 获取题目列表
- 根据用户 Rating 推荐难度合适的题目
- 过滤掉用户已做过的题目（需要提交记录 API）
- 按算法标签分类推荐
- 每日刷新推荐列表

### 3.2 推荐算法设计

```typescript
// shared/types/recommendation.ts

export interface RecommendedProblem {
  /** Codeforces 题目 ID */
  contestId: number;
  index: string;
  name: string;
  rating: number;
  tags: string[];
  solvedCount: number;
  url: string;
}

export interface RecommendationConfig {
  /** 用户当前 Rating */
  userRating: number;
  /** 推荐难度范围：[rating - lower, rating + upper] */
  ratingLowerBound: number;  // 默认 200
  ratingUpperBound: number;  // 默认 300
  /** 推荐题目数量 */
  count: number;             // 默认 5
  /** 偏好的算法标签（可选） */
  preferredTags?: string[];
  /** 已做过的题目集合（避免重复推荐） */
  solvedProblemIds?: Set<string>;
}
```

### 3.3 数据获取

```typescript
// electron/services/recommendation-service.ts
import axios from 'axios';
import type { RecommendedProblem, RecommendationConfig } from '../../shared/types/recommendation';

class RecommendationService {
  private problemCache: any[] | null = null;
  private cacheTime = 0;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 小时

  /** 获取 CF 题库（带缓存） */
  private async fetchProblemset(): Promise<any[]> {
    if (this.problemCache && Date.now() - this.cacheTime < this.CACHE_TTL) {
      return this.problemCache;
    }

    const response = await axios.get('https://codeforces.com/api/problemset.problems');
    if (response.data?.status !== 'OK') {
      throw new Error('CF Problemset API error');
    }

    this.problemCache = response.data.result.problems;
    this.cacheTime = Date.now();
    return this.problemCache!;
  }

  /** 获取用户已做的题目 */
  private async fetchUserSolved(handle: string): Promise<Set<string>> {
    const response = await axios.get(
      `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`
    );

    if (response.data?.status !== 'OK') return new Set();

    const solved = new Set<string>();
    for (const submission of response.data.result) {
      if (submission.verdict === 'OK') {
        solved.add(`${submission.problem.contestId}-${submission.problem.index}`);
      }
    }
    return solved;
  }

  /** 生成推荐列表 */
  async recommend(config: RecommendationConfig, cfHandle?: string): Promise<RecommendedProblem[]> {
    const problems = await this.fetchProblemset();

    // 获取用户已做的题
    let solvedIds = config.solvedProblemIds ?? new Set<string>();
    if (cfHandle && solvedIds.size === 0) {
      try {
        solvedIds = await this.fetchUserSolved(cfHandle);
      } catch {
        // 获取提交记录失败不影响推荐
      }
    }

    const lowerRating = config.userRating - config.ratingLowerBound;
    const upperRating = config.userRating + config.ratingUpperBound;

    // 筛选候选题目
    let candidates = problems.filter(p => {
      if (!p.rating) return false;
      if (p.rating < lowerRating || p.rating > upperRating) return false;
      const id = `${p.contestId}-${p.index}`;
      if (solvedIds.has(id)) return false;
      return true;
    });

    // 如果指定了偏好标签，优先推荐含有这些标签的题
    if (config.preferredTags && config.preferredTags.length > 0) {
      const tagged = candidates.filter(p =>
        p.tags.some((t: string) => config.preferredTags!.includes(t))
      );
      // 如果标签匹配的题目够多，优先使用；否则混合
      if (tagged.length >= config.count) {
        candidates = tagged;
      }
    }

    // 随机打乱（Fisher-Yates）
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    // 取前 N 个
    return candidates.slice(0, config.count).map(p => ({
      contestId: p.contestId,
      index: p.index,
      name: p.name,
      rating: p.rating,
      tags: p.tags,
      solvedCount: p.solvedCount ?? 0,
      url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
    }));
  }
}

export const recommendationService = new RecommendationService();
```

### 3.4 UI 设计

在 Feature.vue 或新增独立页面中展示：

```
┌──────────────────────────────────────────────┐
│  每日推荐                    [🔄 换一批]      │
│  基于你的 Rating: 1500                        │
│  推荐范围: 1300 ~ 1800                        │
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐  │
│  │ A. CF 1700A  Optimal Path     ★1500   │  │
│  │    标签: DP, 贪心                      │  │
│  │    [打开题目] [标记已做]               │  │
│  ├────────────────────────────────────────┤  │
│  │ B. CF 1650D  Twist            ★1600   │  │
│  │    标签: 图论, BFS                     │  │
│  │    [打开题目] [标记已做]               │  │
│  ├────────────────────────────────────────┤  │
│  │ C. CF 1832C  Difference Array ★1400   │  │
│  │    标签: 数据结构, 排序                │  │
│  │    [打开题目] [标记已做]               │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  [调整推荐设置]                               │
│  难度偏移: [-200] ~ [+300]                   │
│  偏好标签: [DP] [图论] [字符串]               │
└──────────────────────────────────────────────┘
```

### 3.5 推荐配置持久化

推荐配置存储在 electron-store 中：

```typescript
// shared/store-schema.ts 追加
export interface UserConfig {
  // ...已有字段

  recommendation: {
    ratingLowerBound: number;   // 默认 200
    ratingUpperBound: number;   // 默认 300
    count: number;              // 默认 5
    preferredTags: string[];    // 默认 []
    lastRefreshed?: number;     // 上次刷新时间
    /** 缓存的推荐列表（避免重复请求） */
    cachedRecommendations?: RecommendedProblem[];
  };
}
```

---

## 4. 数据导出与备份

### 4.1 功能定义

提供一键式数据导出和恢复能力：
- 导出全部用户数据为单个 JSON 文件
- 从 JSON 备份文件恢复数据
- 导出/导入前确认提示
- 支持选择性导出（仅设置 / 仅收藏 / 仅题解 / 全部）

### 4.2 导出数据格式

```typescript
// shared/types/backup.ts

export interface OJFlowBackup {
  /** 格式版本号，用于未来兼容 */
  formatVersion: 1;
  /** 导出时的应用版本 */
  appVersion: string;
  /** 导出时间 */
  exportedAt: number;
  /** 导出项 */
  sections: {
    /** UI 设置 */
    settings?: {
      ui: { themeScheme: string; colorMode: string; locale: string };
      contest: { maxCrawlDays: number; hideDate: boolean };
    };
    /** 用户名配置 */
    usernames?: Record<string, string>;
    /** 收藏列表 */
    favorites?: Array<{
      name: string;
      platform: string;
      link?: string;
      addedAt?: number;
    }>;
    /** 题解库（含完整 content） */
    solutions?: Array<{
      title: string;
      content: string;
      problem: { platform: string; problemId: string; name?: string; url?: string };
      tags: string[];
      difficulty: number;
      language?: string;
      createdAt: number;
      updatedAt: number;
    }>;
    /** 虚拟竞赛历史 */
    virtualContestHistory?: any[];
    /** 推荐配置 */
    recommendation?: any;
  };
}
```

### 4.3 主进程实现

```typescript
// electron/services/backup-service.ts
import { app, dialog } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { store } from '../store';
import { solutionService } from './solution-service';
import type { OJFlowBackup } from '../../shared/types/backup';

class BackupService {
  /** 导出全部数据 */
  async exportAll(): Promise<string | null> {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: '导出 OJFlow 数据',
      defaultPath: `OJFlow-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (canceled || !filePath) return null;

    const config = store.store;
    const allSolutions = await this.getAllSolutions();

    const backup: OJFlowBackup = {
      formatVersion: 1,
      appVersion: app.getVersion(),
      exportedAt: Date.now(),
      sections: {
        settings: {
          ui: config.ui,
          contest: config.contest,
        },
        usernames: config.usernames,
        favorites: config.favorites,
        solutions: allSolutions,
        virtualContestHistory: config.virtualContestHistory ?? [],
        recommendation: config.recommendation ?? {},
      },
    };

    await fs.writeFile(filePath, JSON.stringify(backup, null, 2), 'utf-8');
    return filePath;
  }

  /** 导入数据 */
  async importFrom(): Promise<{ success: boolean; message: string }> {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: '导入 OJFlow 数据',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, message: '已取消' };
    }

    try {
      const raw = await fs.readFile(filePaths[0], 'utf-8');
      const backup: OJFlowBackup = JSON.parse(raw);

      // 格式校验
      if (backup.formatVersion !== 1) {
        return { success: false, message: `不支持的备份格式版本: ${backup.formatVersion}` };
      }

      // 逐项导入
      const { sections } = backup;

      if (sections.settings) {
        store.set('ui', sections.settings.ui);
        store.set('contest', sections.settings.contest);
      }

      if (sections.usernames) {
        store.set('usernames', sections.usernames);
      }

      if (sections.favorites) {
        store.set('favorites', sections.favorites);
      }

      if (sections.solutions) {
        for (const sol of sections.solutions) {
          await solutionService.create(sol);
        }
      }

      if (sections.virtualContestHistory) {
        store.set('virtualContestHistory', sections.virtualContestHistory);
      }

      if (sections.recommendation) {
        store.set('recommendation', sections.recommendation);
      }

      return {
        success: true,
        message: `成功导入: ${sections.favorites?.length ?? 0} 个收藏, ${sections.solutions?.length ?? 0} 篇题解`,
      };
    } catch (error) {
      return {
        success: false,
        message: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`,
      };
    }
  }

  /** 获取所有题解（含 content） */
  private async getAllSolutions(): Promise<OJFlowBackup['sections']['solutions']> {
    const result = await solutionService.search({ pageSize: 10000 });
    const solutions = [];
    for (const item of result.items) {
      const full = await solutionService.getById(item.id);
      if (full) {
        solutions.push({
          title: full.title,
          content: full.content,
          problem: full.problem,
          tags: full.tags,
          difficulty: full.difficulty,
          language: full.language,
          createdAt: full.createdAt,
          updatedAt: full.updatedAt,
        });
      }
    }
    return solutions;
  }
}

export const backupService = new BackupService();
```

### 4.4 IPC 通道

```typescript
// shared/ipc-channels.ts 追加
export const IPC_CHANNELS = {
  // ...已有通道

  BACKUP_EXPORT: 'backup-export',
  BACKUP_IMPORT: 'backup-import',
} as const;
```

### 4.5 Settings 页面集成

在 Settings.vue 中增加"数据管理"区块：

```
┌──────────────────────────────────────────────┐
│  数据管理                                     │
├──────────────────────────────────────────────┤
│                                              │
│  [📤 导出数据]     将所有设置、收藏和题解      │
│                   导出为 JSON 文件             │
│                                              │
│  [📥 导入数据]     从 JSON 备份文件恢复数据    │
│                   ⚠ 将覆盖当前设置             │
│                                              │
│  数据存储位置:                                 │
│  C:\Users\xxx\AppData\Roaming\ojflow\        │
│  [📂 打开目录]                                │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 5. 功能交叉依赖关系

```
                    ┌──────────────┐
                    │ electron-    │
                    │ store        │ (INFRA_PLAN 步骤 5)
                    │ (持久化层)   │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
     ┌──────────┐  ┌──────────┐   ┌──────────┐
     │ 题解库   │  │ 虚拟竞赛  │   │ 每日推荐 │
     │          │  │          │   │          │
     │ 文件系统 │  │ Store    │   │ CF API   │
     │ + 索引   │  │ + Timer  │   │ + Cache  │
     └─────┬────┘  └─────┬────┘   └─────┬────┘
           │              │              │
           │              │              │
           ▼              ▼              ▼
     ┌─────────────────────────────────────┐
     │           数据导出/备份              │
     │  (聚合所有模块的数据进行导出)        │
     └─────────────────────────────────────┘
```

**依赖关系**：
- 数据导出 依赖 题解库（需要读取所有题解内容）
- 数据导出 依赖 虚拟竞赛（需要导出历史记录）
- 数据导出 依赖 每日推荐（需要导出配置）
- 虚拟竞赛 依赖 Platform Adapter（获取历史比赛和题目列表）
- 每日推荐 依赖 Rating 数据（需要知道用户当前 Rating）
- 所有功能 依赖 electron-store（持久化）

### 开发顺序建议

```
第一批（可并行）：
  ├── 题解库（独立性最高，不依赖其他新功能）
  └── 每日推荐（依赖已有的 Rating 查询）

第二批：
  └── 虚拟竞赛（依赖 Platform Adapter 重构完成）

第三批：
  └── 数据导出/备份（依赖上述三个功能完成）
```

---

## 6. 实施路线图

### 总体视图

```
v1.1 基础设施建设 (INFRA_PLAN.md)
  │  安全加固、类型安全、ESLint、electron-store
  │
  ▼
v1.3 核心体验优化 (UX_OPTIMIZATION_PLAN.md)
  │  Platform Adapter、离线缓存、性能优化
  │
  ▼
v2.0-alpha 新功能开发 (本文档)
  ├── 题解库 + 每日推荐 (可并行)
  ├── 虚拟竞赛
  └── 数据导出/备份
  │
  ▼
v2.0-beta 集成测试 + 用户反馈
  │
  ▼
v2.0 正式发布
```

### 各功能开发步骤

#### 题解库 (预计影响文件: 10+)

```
1. 创建 shared/types/solution.ts 类型定义
2. 实现 electron/services/solution-service.ts
3. 注册 IPC 通道 + preload 暴露 API
4. 安装 vditor 依赖
5. 创建 src/stores/solution.ts
6. 实现 SolutionListPage.vue
7. 实现 SolutionEditorPage.vue
8. 更新路由 + 导航菜单
9. 编写单元测试
```

#### 虚拟竞赛 (预计影响文件: 8+)

```
1. 创建 shared/types/virtual-contest.ts 类型定义
2. 扩展 CodeforcesAdapter / AtCoderAdapter（历史比赛 + 题目列表 API）
3. 注册 IPC 通道
4. 创建 src/stores/virtual-contest.ts
5. 实现 VirtualContestPage.vue (选择比赛)
6. 实现 VirtualContestRunPage.vue (比赛进行)
7. 实现赛后报告组件
8. 更新路由 + 导航菜单
9. 编写测试
```

#### 每日推荐 (预计影响文件: 5+)

```
1. 创建 shared/types/recommendation.ts
2. 实现 electron/services/recommendation-service.ts
3. 注册 IPC 通道
4. 实现 RecommendationPanel.vue (可嵌入 Feature 页面或独立页面)
5. 编写测试
```

#### 数据导出/备份 (预计影响文件: 4+)

```
1. 创建 shared/types/backup.ts
2. 实现 electron/services/backup-service.ts
3. 注册 IPC 通道
4. Settings.vue 增加导出/导入区块
5. 编写测试（导出 → 导入 → 验证数据完整性）
```

### 验证标准

| 功能 | 核心验证项 |
|------|-----------|
| 题解库 | 创建/编辑/删除/搜索全流程正常；Markdown 渲染正确（含代码高亮、LaTeX 公式）；1000 篇题解下搜索响应 < 200ms |
| 虚拟竞赛 | 倒计时精确度误差 < 1 秒/小时；暂停/恢复不丢失计时；赛后报告数据正确 |
| 每日推荐 | 推荐题目难度在配置范围内；不推荐已做过的题目；"换一批"返回不同题目 |
| 数据导出 | 导出文件完整包含所有数据；导入后功能正常；跨版本兼容（v1.x 备份在 v2.x 可导入） |

### 测试策略

针对每个新功能的测试计划：

```
tests/unit/
├── solution-service.test.ts      # 题解 CRUD + 搜索
├── virtual-contest.test.ts       # 虚拟竞赛状态机
├── recommendation.test.ts        # 推荐算法 + 过滤逻辑
└── backup-service.test.ts        # 导出/导入完整性

tests/e2e/
├── solution-flow.spec.ts         # 创建 → 编辑 → 搜索 → 删除
├── virtual-contest-flow.spec.ts  # 选赛 → 开始 → AC → 结束 → 查看报告
└── backup-flow.spec.ts           # 导出 → 清空 → 导入 → 验证恢复
```
