# OJFlow 基础设施建设实施方案

> 版本：v1.1 ~ v1.2 | 基于 PRD Phase 1 | 目标：不改动用户可见功能，全面加固项目基座

---

## 目录

1. [Electron 安全加固](#1-electron-安全加固)
2. [完整类型安全体系](#2-完整类型安全体系)
3. [代码质量工具链](#3-代码质量工具链)
4. [数据持久化方案](#4-数据持久化方案)
5. [实施顺序与依赖关系](#5-实施顺序与依赖关系)
6. [风险与回滚策略](#6-风险与回滚策略)

---

## 1. Electron 安全加固

### 1.1 现状问题

当前 `electron/main.js` 第 275-278 行的配置：

```javascript
webPreferences: {
  nodeIntegration: true,    // 渲染进程可直接访问 Node.js API
  contextIsolation: false,  // 主进程和渲染进程共享上下文
}
```

**风险评估**：
- 渲染进程加载的任何内容（包括第三方脚本）可直接执行 `require('child_process').exec()` 等危险操作
- `window.require('electron').ipcRenderer` 暴露在全局作用域，任何注入的代码都可以调用 IPC
- 外部链接通过 `setWindowOpenHandler` 处理，但如果恶意内容嵌入主窗口仍有风险
- 违反 Electron 安全检查清单中的第 2、3 项核心建议

### 1.2 目标架构

```
渲染进程 (Vue App)          Preload 脚本             主进程 (Electron)
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│                 │    │                  │    │                  │
│  window.api.*   │───>│  contextBridge   │───>│  ipcMain.handle  │
│  (类型安全的    │    │  .exposeInMain   │    │  (验证参数)      │
│   白名单 API)   │    │  World('api',{}) │    │                  │
│                 │    │                  │    │                  │
│  无 require     │    │  有 ipcRenderer  │    │  有完整 Node.js  │
│  无 Node.js     │    │  访问权限        │    │  访问权限        │
└─────────────────┘    └──────────────────┘    └──────────────────┘
```

### 1.3 实施步骤

#### 步骤 1：创建共享 IPC Channel 定义

新建文件 `shared/ipc-channels.ts`：

```typescript
// shared/ipc-channels.ts
// 主进程和渲染进程共享的 IPC 通道定义

export const IPC_CHANNELS = {
  GET_CONTESTS: 'get-recent-contests',
  GET_RATING: 'get-rating',
  GET_SOLVED_NUM: 'get-solved-num',
  OPEN_URL: 'open-url',
  UPDATER_INSTALL: 'updater-install',
  // 后续新增的 channel 统一在此注册
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
```

#### 步骤 2：创建 Preload 脚本

新建文件 `electron/preload.ts`（编译为 `electron/preload.js`）：

```typescript
// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';

// 只暴露白名单 API，不暴露 ipcRenderer 本身
const api = {
  getRecentContests: (day: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CONTESTS, day),

  getRating: (platform: string, name: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_RATING, { platform, name }),

  getSolvedNum: (platform: string, name: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SOLVED_NUM, { platform, name }),

  openUrl: (url: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_URL, url),

  installUpdate: (url: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATER_INSTALL, { url }),
};

export type ElectronApi = typeof api;

contextBridge.exposeInMainWorld('api', api);
```

#### 步骤 3：更新类型声明

修改 `src/types/global.d.ts`：

```typescript
// src/types/global.d.ts
import type { ElectronApi } from '../electron/preload';

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare global {
  interface Window {
    api: ElectronApi;
  }
}
```

#### 步骤 4：修改主进程窗口配置

修改 `electron/main.js`（或迁移后的 `main.ts`）：

```typescript
function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, '../src/assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,       // 关闭 Node.js 集成
      contextIsolation: true,       // 启用上下文隔离
      preload: path.join(__dirname, 'preload.js'),  // 注册 preload 脚本
      sandbox: true,                // 启用沙箱模式（推荐）
    },
    autoHideMenuBar: true,
  });

  // ...其余不变
}
```

#### 步骤 5：更新渲染进程 Service 层

修改所有渲染进程中的 IPC 调用，从 `window.require('electron').ipcRenderer` 改为 `window.api`：

**`src/services/contest.ts`**（修改后）：

```typescript
import { Contest } from '../types';
import { ContestUtils } from '../utils/contest_utils';
import appConfig from '../../electron/app.config.json';

const DEFAULT_DAYS = appConfig?.crawl?.defaultDays ?? 7;

export class ContestService {
  static async getRecentContests(day: number = DEFAULT_DAYS): Promise<Contest[]> {
    try {
      const rawContests: any[] = await window.api.getRecentContests(day);
      return rawContests.map(c => ContestUtils.createContest(
        c.name, c.startTime, c.duration, c.platform, c.link
      ));
    } catch (error) {
      console.error('Failed to get contests:', error);
      return [];
    }
  }

  static async openUrl(url: string): Promise<void> {
    await window.api.openUrl(url);
  }

  static async installUpdate(url: string): Promise<void> {
    await window.api.installUpdate(url);
  }
}
```

**`src/services/rating.ts`**（修改后）：

```typescript
import { Rating } from '../types';

export class RatingService {
  static async getRating(platform: string, name: string): Promise<Rating> {
    return await window.api.getRating(platform, name);
  }
}
```

**`src/services/solved.ts`**（修改后）：

```typescript
import { SolvedNum } from '../types';

export class SolvedNumService {
  static async getSolvedNum(platform: string, name: string): Promise<SolvedNum> {
    return await window.api.getSolvedNum(platform, name);
  }
}
```

#### 步骤 6：主进程 IPC 参数校验

在 `electron/main.js` 的 IPC handler 中增加输入校验：

```typescript
ipcMain.handle(IPC_CHANNELS.OPEN_URL, async (_event, url) => {
  // 安全校验：只允许 http/https 协议
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
    throw new Error('Invalid URL protocol');
  }
  await shell.openExternal(url);
});

ipcMain.handle(IPC_CHANNELS.GET_RATING, async (_event, { platform, name }) => {
  // 类型校验
  if (typeof platform !== 'string' || typeof name !== 'string') {
    throw new Error('Invalid parameters');
  }
  if (name.length > 100 || platform.length > 50) {
    throw new Error('Parameter too long');
  }
  return await ratingService.getRating(platform, name);
});
```

#### 步骤 7：构建配置更新

修改 `package.json` 的 `build.files` 配置，包含 preload 脚本：

```json
{
  "build": {
    "files": [
      "dist/**/*",
      "electron/**/*",
      "shared/**/*",
      "package.json"
    ]
  }
}
```

### 1.4 影响范围清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `electron/main.js` | 修改 | webPreferences 配置、IPC 参数校验 |
| `electron/preload.ts` | 新增 | contextBridge 白名单 API |
| `shared/ipc-channels.ts` | 新增 | 共享 IPC 通道常量 |
| `src/types/global.d.ts` | 修改 | 删除 `window.require`，添加 `window.api` 类型 |
| `src/services/contest.ts` | 修改 | IPC 调用方式 |
| `src/services/rating.ts` | 修改 | IPC 调用方式 |
| `src/services/solved.ts` | 修改 | IPC 调用方式 |
| `package.json` | 修改 | build 配置 |

### 1.5 验证清单

- [ ] `bun run dev` 启动正常，所有页面功能不受影响
- [ ] 渲染进程中 `window.require` 不可用（控制台验证）
- [ ] `window.api` 只包含白名单方法
- [ ] 比赛列表正常加载
- [ ] Rating 查询正常
- [ ] 做题统计正常
- [ ] 外部链接正常打开
- [ ] 更新检查正常
- [ ] `bun run dist:win` 打包后功能正常

---

## 2. 完整类型安全体系

### 2.1 现状问题

1. **Electron 主进程无类型**：`electron/main.js`（368 行）、`electron/services/contest.js`（296 行）、`rating.js`（160 行）、`solvedNum.js`（195 行）均为纯 JavaScript
2. **类型定义有拼写错误**：`src/types/index.ts` 第 15 行 `fomattedDuration` 应为 `formattedDuration`
3. **IPC 通信无类型约束**：channel 名称为魔法字符串，参数/返回值无类型检查
4. **主进程与渲染进程类型不共享**：两侧独立定义数据结构，存在不一致风险

### 2.2 实施步骤

#### 步骤 1：修复已知类型拼写错误

**`src/types/index.ts`** — 修正 `fomattedDuration`：

```typescript
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
  formattedDuration: string;    // 修复：fomattedDuration -> formattedDuration
}
```

**关联修改**：`src/utils/contest_utils.ts` 第 41 行对应属性名同步修改。

**全局替换清单**（使用 IDE 全局搜索 `fomattedDuration`）：
- `src/types/index.ts`
- `src/utils/contest_utils.ts`
- 所有引用 `contest.fomattedDuration` 的 Vue 组件

#### 步骤 2：创建共享类型目录

新建 `shared/types.ts`，将主进程和渲染进程共用的类型集中管理：

```typescript
// shared/types.ts

/** 原始比赛数据（从 Electron 主进程传来，未格式化） */
export interface RawContest {
  name: string;
  startTime: number;     // Unix timestamp (seconds)
  duration: number;       // seconds
  platform: string;
  link?: string;
}

/** 渲染进程使用的格式化比赛数据 */
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

/** 支持的 OJ 平台标识 */
export type ContestPlatform =
  | 'Codeforces' | 'AtCoder' | '洛谷'
  | '蓝桥云课' | '力扣' | '牛客';

export type RatingPlatform =
  | 'Codeforces' | 'AtCoder' | '力扣'
  | '洛谷' | '牛客';

export type SolvedPlatform =
  | 'Codeforces' | '力扣' | 'VJudge' | '洛谷'
  | 'AtCoder' | 'HDU' | 'POJ' | '牛客' | 'QOJ';
```

然后让 `src/types/index.ts` 从 `shared/types.ts` 重导出：

```typescript
// src/types/index.ts
export type { Contest, Rating, SolvedNum, RawContest,
  ContestPlatform, RatingPlatform, SolvedPlatform } from '../../shared/types';
```

#### 步骤 3：定义类型安全的 IPC 协议

扩展 `shared/ipc-channels.ts`：

```typescript
// shared/ipc-channels.ts
import type { RawContest, Rating, SolvedNum } from './types';

export const IPC_CHANNELS = {
  GET_CONTESTS: 'get-recent-contests',
  GET_RATING: 'get-rating',
  GET_SOLVED_NUM: 'get-solved-num',
  OPEN_URL: 'open-url',
  UPDATER_INSTALL: 'updater-install',
} as const;

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

/** IPC 调用的参数和返回值类型映射 */
export interface IpcHandlerMap {
  [IPC_CHANNELS.GET_CONTESTS]: {
    args: [day: number];
    return: RawContest[];
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
}
```

#### 步骤 4：Electron 主进程迁移到 TypeScript

**4a. 新增 `tsconfig.electron.json`**：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "outDir": "electron-dist",
    "rootDir": ".",
    "declaration": false,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": [
    "electron/**/*.ts",
    "shared/**/*.ts"
  ]
}
```

**4b. 迁移文件清单**：

| 原文件 | 目标文件 | 行数 | 复杂度 |
|--------|----------|------|--------|
| `electron/main.js` | `electron/main.ts` | 368 | 高 |
| `electron/services/contest.js` | `electron/services/contest.ts` | 296 | 中 |
| `electron/services/rating.js` | `electron/services/rating.ts` | 160 | 中 |
| `electron/services/solvedNum.js` | `electron/services/solvedNum.ts` | 195 | 中 |

**4c. 迁移策略**：逐文件迁移，优先迁移 services（依赖少），最后迁移 `main.ts`（依赖 services）。

**示例：`electron/services/contest.ts` 迁移后核心改动**：

```typescript
import axios from 'axios';
import * as cheerio from 'cheerio';
import type { RawContest } from '../../shared/types';

interface AppConfig {
  crawl: { defaultDays: number; minDays: number; maxDays: number };
}

const appConfig: AppConfig = require('../app.config.json');

class RecentContestService {
  private _leetcodeUrl = 'https://leetcode.cn/graphql';
  private _atcoderUrl = 'https://atcoder.jp/contests/';
  // ... 其余 URL

  private _defaultDays: number;
  private _queryEndSeconds: number;

  constructor() {
    this._defaultDays = appConfig.crawl.defaultDays;
    this._queryEndSeconds = this._defaultDays * 24 * 60 * 60;
  }

  setDay(day: number): void {
    const d = Number.isFinite(day) ? day : this._defaultDays;
    this._queryEndSeconds = d * 24 * 60 * 60;
  }

  private _isIntime(startTime: number, duration: number): 0 | 1 | 2 {
    // ... 返回值类型化
  }

  async getLeetcodeContests(): Promise<RawContest[]> {
    // ... 返回值类型化
  }

  // ... 其余方法类型化

  async getAllContests(day: number): Promise<RawContest[]> {
    this.setDay(day);
    const results = await Promise.all([
      this.getLeetcodeContests(),
      this.getCodeforcesContests(),
      this.getNowcoderContests(),
      this.getAtCoderContests(),
      this.getLuoguContests(),
      this.getLanqiaoContests(),
    ]);
    return results.flat();
  }
}

export default new RecentContestService();
```

**4d. 构建脚本更新**：

在 `package.json` 中新增 Electron 编译步骤：

```json
{
  "scripts": {
    "build:electron": "tsc -p tsconfig.electron.json",
    "dev": "bun run build:electron && concurrently \"bun run vite\" \"wait-on http://localhost:5173 && electron .\"",
    "dist": "bun run build:electron && bun run build && electron-builder"
  }
}
```

同时更新 `package.json` 的 `main` 字段指向编译输出：

```json
{
  "main": "electron-dist/electron/main.js"
}
```

### 2.3 验证方法

- `tsc -p tsconfig.electron.json --noEmit` 零错误
- `vue-tsc --noEmit` 零错误
- 全局搜索 `fomattedDuration` 确认零结果
- 全局搜索 `as any` 数量应明显减少

---

## 3. 代码质量工具链

### 3.1 现状问题

项目当前没有任何代码格式化或静态分析配置：
- 无 ESLint 配置
- 无 Prettier 配置
- 无 Git hooks 保证提交质量
- 代码风格不一致（部分文件用 2 空格缩进，部分用 4 空格）

### 3.2 工具选型

| 工具 | 版本 | 用途 |
|------|------|------|
| ESLint | 9.x (flat config) | JavaScript/TypeScript 静态分析 |
| @typescript-eslint | 8.x | TypeScript 特定规则 |
| eslint-plugin-vue | 9.x | Vue SFC 规则 |
| Prettier | 3.x | 代码格式化 |
| eslint-config-prettier | 9.x | 关闭与 Prettier 冲突的 ESLint 规则 |
| husky | 9.x | Git hooks 管理 |
| lint-staged | 15.x | 只对暂存文件运行 lint |

### 3.3 实施步骤

#### 步骤 1：安装依赖

```bash
bun add -d eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  eslint-plugin-vue prettier eslint-config-prettier \
  husky lint-staged
```

#### 步骤 2：创建 ESLint 配置

新建 `eslint.config.js`（ESLint 9 flat config 格式）：

```javascript
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import prettier from 'eslint-config-prettier';

export default [
  // 全局忽略
  { ignores: ['dist/**', 'release/**', 'node_modules/**', 'electron-dist/**'] },

  // JavaScript/TypeScript 基础规则
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Vue 规则
  ...pluginVue.configs['flat/recommended'],

  // Vue 文件的 TypeScript 解析
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },

  // 项目自定义规则
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'vue/multi-word-component-names': 'off',     // 允许单词组件名（如 Contest, Settings）
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // 关闭与 Prettier 冲突的规则（必须放最后）
  prettier,
];
```

#### 步骤 3：创建 Prettier 配置

新建 `.prettierrc`：

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "endOfLine": "lf",
  "arrowParens": "avoid",
  "vueIndentScriptAndStyle": false
}
```

新建 `.prettierignore`：

```
dist
release
node_modules
electron-dist
*.min.js
```

#### 步骤 4：配置 Git Hooks

```bash
# 初始化 husky
bunx husky init
```

更新 `.husky/pre-commit`：

```bash
#!/usr/bin/env sh
bunx lint-staged
```

在 `package.json` 中添加 lint-staged 配置：

```json
{
  "lint-staged": {
    "*.{ts,tsx,vue}": ["eslint --fix", "prettier --write"],
    "*.{js,json,css,scss,md}": ["prettier --write"]
  }
}
```

#### 步骤 5：添加 npm scripts

在 `package.json` 的 `scripts` 中添加：

```json
{
  "scripts": {
    "lint": "eslint src/ electron/ shared/ tests/",
    "lint:fix": "eslint --fix src/ electron/ shared/ tests/",
    "format": "prettier --write \"src/**/*.{ts,vue,css,scss}\" \"electron/**/*.ts\" \"shared/**/*.ts\"",
    "type-check": "vue-tsc --noEmit && tsc -p tsconfig.electron.json --noEmit"
  }
}
```

#### 步骤 6：首次全量格式化

```bash
# 先运行一次全量格式化，作为单独的 commit
bun run format
bun run lint:fix

# 提交为独立的 formatting commit（不混入功能变更）
git add -A
git commit -m "chore: apply eslint + prettier formatting"
```

### 3.4 验证方法

- `bun run lint` 零 error（warn 可以逐步消除）
- `bun run type-check` 零错误
- 修改任意 `.ts` 文件并 `git commit`，husky 自动运行 lint-staged
- CI 中运行 `bun run lint && bun run type-check` 作为门禁

---

## 4. 数据持久化方案

### 4.1 现状问题

当前所有用户数据存储在渲染进程的 `localStorage` 中：

| 数据 | localStorage Key | 问题 |
|------|------------------|------|
| 收藏列表 | `favourite_contests_list` | JSON 序列化，无大小限制保护（localStorage 上限 ~5MB） |
| 抓取天数 | `max_crawl_days` | 简单字符串 |
| 隐藏日期 | `hide_date` | 布尔值用 '0'/'1' 表示 |
| 主题/模式 | `theme_scheme`, `color_mode` | 简单字符串 |
| 语言 | `locale` | 简单字符串 |
| 用户名 | `rating_username_{platform}` | 分散存储，无统一管理 |

**问题**：
1. 数据存储在 Chromium 的 Local Storage 中，清除浏览器数据会丢失
2. 无法从主进程访问（主进程需要独立读取配置时做不到）
3. 无法实现数据导出/备份（后续功能需求）
4. 无法支持多窗口数据同步
5. 容量受限，无法存储大量题解数据（后续功能需求）

### 4.2 方案设计

引入 **electron-store**（已在 `package.json` 依赖中，version ^8.1.0）作为主进程侧的持久化层。

#### 架构设计

```
渲染进程                       主进程
┌──────────────┐          ┌──────────────────┐
│  Pinia Store │          │  electron-store   │
│  (响应式)    │  ──IPC── │  (JSON 文件)      │
│              │          │                   │
│  内存状态    │          │  userData/         │
│              │          │    config.json     │
└──────────────┘          └──────────────────┘
```

#### 数据结构定义

```typescript
// shared/store-schema.ts

export interface UserConfig {
  // UI 偏好
  ui: {
    themeScheme: 'ocean' | 'violet';
    colorMode: 'auto' | 'light' | 'dark';
    locale: 'zh-CN' | 'en-US';
  };

  // 比赛设置
  contest: {
    maxCrawlDays: number;
    hideDate: boolean;
    selectedPlatforms: Record<string, boolean>;
  };

  // 收藏
  favorites: Array<{
    name: string;
    platform: string;
    link?: string;
    addedAt: number;  // 收藏时间戳，新增字段
  }>;

  // 用户名
  usernames: Record<string, string>;  // { 'Codeforces': 'tourist', ... }

  // 缓存（用于离线降级）
  cache: {
    contests?: {
      data: any[];
      fetchedAt: number;
    };
    ratings?: Record<string, {
      data: any;
      fetchedAt: number;
    }>;
    solvedNums?: Record<string, {
      data: any;
      fetchedAt: number;
    }>;
  };
}
```

### 4.3 实施步骤

#### 步骤 1：主进程初始化 electron-store

```typescript
// electron/store.ts
import Store from 'electron-store';
import type { UserConfig } from '../shared/store-schema';

const defaults: UserConfig = {
  ui: {
    themeScheme: 'ocean',
    colorMode: 'auto',
    locale: 'zh-CN',
  },
  contest: {
    maxCrawlDays: 7,
    hideDate: false,
    selectedPlatforms: {
      Codeforces: true, AtCoder: true, '洛谷': true,
      '蓝桥云课': true, '力扣': true, '牛客': true,
    },
  },
  favorites: [],
  usernames: {},
  cache: {},
};

export const store = new Store<UserConfig>({
  name: 'ojflow-config',
  defaults,
  // 数据迁移：从 localStorage 迁移到 electron-store
  migrations: {
    '1.1.0': (store) => {
      // 首次迁移时，从旧数据迁移的逻辑在渲染进程触发
      // 这里只确保 schema 结构正确
    },
  },
});
```

#### 步骤 2：新增 IPC 通道用于配置读写

```typescript
// shared/ipc-channels.ts 追加
export const IPC_CHANNELS = {
  // ...已有通道

  // 配置管理
  STORE_GET: 'store-get',
  STORE_SET: 'store-set',
  STORE_GET_ALL: 'store-get-all',

  // 数据导入导出（为后续功能预留）
  EXPORT_DATA: 'export-data',
  IMPORT_DATA: 'import-data',
} as const;
```

#### 步骤 3：主进程注册 Store IPC Handler

```typescript
// electron/main.ts 中添加
import { store } from './store';

ipcMain.handle(IPC_CHANNELS.STORE_GET, (_event, key: string) => {
  return store.get(key);
});

ipcMain.handle(IPC_CHANNELS.STORE_SET, (_event, key: string, value: unknown) => {
  store.set(key, value);
});

ipcMain.handle(IPC_CHANNELS.STORE_GET_ALL, () => {
  return store.store;  // 返回完整配置对象
});
```

#### 步骤 4：Preload 脚本暴露 Store API

```typescript
// electron/preload.ts 追加
const storeApi = {
  get: (key: string) => ipcRenderer.invoke(IPC_CHANNELS.STORE_GET, key),
  set: (key: string, value: unknown) => ipcRenderer.invoke(IPC_CHANNELS.STORE_SET, key, value),
  getAll: () => ipcRenderer.invoke(IPC_CHANNELS.STORE_GET_ALL),
};

contextBridge.exposeInMainWorld('store', storeApi);
```

#### 步骤 5：渲染进程 Store 适配

以 `src/stores/ui.ts` 为例，从 localStorage 迁移到 electron-store：

```typescript
// src/stores/ui.ts（迁移后）
import { defineStore } from 'pinia';
import appConfig from '../../electron/app.config.json';

type ThemeScheme = 'ocean' | 'violet';
type ColorMode = 'auto' | 'light' | 'dark';

export const useUiStore = defineStore('ui', {
  state: () => ({
    themeScheme: (appConfig?.theme?.defaultScheme ?? 'ocean') as ThemeScheme,
    colorMode: (appConfig?.theme?.defaultMode ?? 'auto') as ColorMode,
    initialized: false,
  }),
  actions: {
    async init() {
      if (this.initialized) return;
      try {
        const ui = await window.store.get('ui');
        if (ui) {
          this.themeScheme = ui.themeScheme ?? this.themeScheme;
          this.colorMode = ui.colorMode ?? this.colorMode;
        }
      } catch {
        // 降级：保持默认值
      }
      this.initialized = true;
      this.applyToDom();
    },
    applyToDom() {
      const el = typeof document !== 'undefined' ? document.documentElement : undefined;
      if (!el) return;
      el.dataset.scheme = this.themeScheme;
      el.dataset.theme = this.colorMode;
      delete el.dataset.mode;
    },
    async setThemeScheme(scheme: ThemeScheme) {
      this.themeScheme = scheme;
      this.applyToDom();
      await window.store.set('ui.themeScheme', scheme);
    },
    async setColorMode(mode: ColorMode) {
      this.colorMode = mode;
      this.applyToDom();
      await window.store.set('ui.colorMode', mode);
    },
  },
});
```

#### 步骤 6：数据迁移（从 localStorage 到 electron-store）

在应用首次启动时执行一次性迁移：

```typescript
// src/utils/migrate-storage.ts
export async function migrateFromLocalStorage(): Promise<void> {
  const migrated = await window.store.get('_migrated');
  if (migrated) return;

  try {
    // 迁移 UI 设置
    const themeScheme = localStorage.getItem('theme_scheme');
    const colorMode = localStorage.getItem('color_mode');
    const locale = localStorage.getItem('locale');
    if (themeScheme) await window.store.set('ui.themeScheme', themeScheme);
    if (colorMode) await window.store.set('ui.colorMode', colorMode);
    if (locale) await window.store.set('ui.locale', locale);

    // 迁移比赛设置
    const maxDays = localStorage.getItem('max_crawl_days');
    const hideDate = localStorage.getItem('hide_date');
    if (maxDays) await window.store.set('contest.maxCrawlDays', Number(maxDays));
    if (hideDate) await window.store.set('contest.hideDate', hideDate === '1');

    // 迁移收藏
    const favRaw = localStorage.getItem('favourite_contests_list');
    if (favRaw) {
      const favs = JSON.parse(favRaw);
      await window.store.set('favorites', favs);
    }

    // 迁移用户名
    const platforms = ['Codeforces', 'AtCoder', '力扣', '洛谷', '牛客', 'VJudge', 'HDU', 'POJ', 'QOJ'];
    const usernames: Record<string, string> = {};
    for (const p of platforms) {
      const name = localStorage.getItem(`rating_username_${p}`);
      if (name) usernames[p] = name;
    }
    if (Object.keys(usernames).length > 0) {
      await window.store.set('usernames', usernames);
    }

    await window.store.set('_migrated', true);
  } catch (error) {
    console.error('Migration failed:', error);
    // 迁移失败不阻塞启动，下次再试
  }
}
```

在 `src/main.ts` 中调用：

```typescript
import { migrateFromLocalStorage } from './utils/migrate-storage';

const app = createApp(App);
app.use(pinia);
app.use(router);
app.mount('#app');

// 挂载后异步迁移
migrateFromLocalStorage();
```

### 4.4 数据存储位置

electron-store 默认存储在操作系统的用户数据目录：

| 平台 | 路径 |
|------|------|
| Windows | `%APPDATA%/ojflow/ojflow-config.json` |
| macOS | `~/Library/Application Support/ojflow/ojflow-config.json` |
| Linux | `~/.config/ojflow/ojflow-config.json` |

优势：
- 不会被"清除浏览器数据"操作删除
- 可以被文件管理器直接访问和备份
- 为后续的数据导出功能提供基础

### 4.5 验证方法

- 全新安装后 electron-store 文件自动创建
- 从 v1.0.x 升级后 localStorage 数据自动迁移
- 修改设置后检查 JSON 文件内容正确更新
- 删除 localStorage 后重启，设置仍保留（来自 electron-store）

---

## 5. 实施顺序与依赖关系

```
步骤 1: ESLint + Prettier 配置
  │   （独立，无依赖，为后续所有代码变更建立基线）
  │
  ▼
步骤 2: 类型拼写错误修复 + shared/ 目录创建
  │   （独立改动，影响小，建立共享类型基础）
  │
  ▼
步骤 3: Electron 主进程 TS 迁移
  │   （依赖 shared/ 类型，services 先行，main 最后）
  │   迁移顺序：
  │   3a. electron/services/contest.ts
  │   3b. electron/services/rating.ts
  │   3c. electron/services/solvedNum.ts
  │   3d. electron/main.ts
  │
  ▼
步骤 4: Electron 安全加固
  │   （依赖 shared/ipc-channels.ts + TS 迁移完成）
  │   4a. 创建 preload.ts
  │   4b. 修改 main.ts webPreferences
  │   4c. 更新渲染进程 services
  │   4d. 更新 global.d.ts
  │
  ▼
步骤 5: 数据持久化迁移
  │   （依赖安全加固完成，因为需要通过 preload 暴露 store API）
  │   5a. 创建 electron/store.ts
  │   5b. 新增 store 相关 IPC handler
  │   5c. preload 暴露 store API
  │   5d. 迁移 Pinia stores
  │   5e. 实现 localStorage → electron-store 数据迁移
  │
  ▼
步骤 6: 全量测试 + 清理遗留代码
      删除 FavoritesPage.vue, SettingPage.vue 等 legacy 文件
      删除 router 中对应的兼容路由
      运行完整测试套件
```

### 里程碑节点

| 里程碑 | 标志 | 输出物 |
|--------|------|--------|
| M1: 代码规范 | `bun run lint` + `bun run type-check` 零错误 | eslint.config.js, .prettierrc, husky |
| M2: 类型安全 | Electron 全 TS，共享类型，零 any | shared/, electron/*.ts |
| M3: 安全加固 | preload + contextIsolation 上线 | preload.ts, 更新的 services |
| M4: 数据持久化 | electron-store 替代 localStorage | store.ts, 迁移脚本 |
| M5: 发布 v1.1 | 全平台打包测试通过 | release/ |

---

## 6. 风险与回滚策略

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| preload 迁移后 IPC 调用异常 | 中 | 高 | 逐个 IPC channel 迁移并测试，保留旧代码作为注释参考 |
| TS 迁移引入运行时错误 | 低 | 中 | `strict: true` 编译通过即安全；逐文件迁移，每个文件独立 commit |
| electron-store 迁移数据丢失 | 低 | 高 | 迁移前不删除 localStorage；迁移失败不阻塞启动；首月保持双写 |
| 现有测试用例失败 | 中 | 低 | 每步完成后运行 `bun run test:unit`，失败则修复测试适配新接口 |
| ESLint 规则过严导致大量报错 | 中 | 低 | 初期规则设为 warn 而非 error，逐步收紧 |

**回滚策略**：每个步骤完成后独立 commit + tag。如果某步骤引入问题，`git revert` 该步骤的 commit(s)，不影响之前的改动。
