## OJFlow v1.x → v2.x 迭代规划建议

### 一、项目现状总结

**基本数据**：v1.0.1，约 6,457 行代码，39 个源文件，12+ 个 Vue 组件，2 个 Pinia Store，覆盖 6 个 OJ 平台的比赛聚合、5 个平台的 Rating 查询、9 个平台的做题统计。

**核心优势**：

- 功能闭环完整：比赛日历 → Rating 追踪 → 刷题统计 → 快捷导航
- 技术栈现代化：Electron 30 + Vue 3 + Vite 5 + Pinia
- 有基本的测试体系（unit + e2e）

**主要短板**（从重度用户角度）：

1. **数据持久化薄弱** — 全靠 localStorage，无法跨设备同步，数据易丢失
2. **安全隐患** — `nodeIntegration: true` + `contextIsolation: false`，不符合 Electron 安全最佳实践
3. **数据抓取脆弱** — 直接 cheerio 爬页面，OJ 改版会导致大面积功能失效，缺少错误恢复和降级机制
4. **无离线能力** — 断网后完全不可用，缺少本地缓存策略
5. **类型安全不完整** — Electron 主进程仍为 JS，部分类型定义有拼写错误（如 `fomattedDuration`）
6. **无代码质量工具链** — 缺少 ESLint、Prettier 配置
7. **Planned 功能未开发** — 本地题解、虚拟竞赛

---

### 二、迭代路线建议（按优先级排序）

#### Phase 1：基础加固（v1.1 - v1.2）

> 目标：提升稳定性、安全性和开发效率，不改动用户可见功能


| # | 改进项                | 说明                                                                                                         | 影响范围                                                                                     |
| - | --------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| 1 | **Electron 安全加固** | 引入 preload script + contextBridge，关闭 nodeIntegration，隔离渲染进程                                      | `electron/main.js`，新增 `electron/preload.js`，所有 IPC 调用需改为 contextBridge 暴露的 API |
| 2 | **ESLint + Prettier** | 统一代码风格，配置`@typescript-eslint`、`eslint-plugin-vue`、`prettier`，加入 husky + lint-staged            | 项目根目录配置，`package.json` scripts                                                       |
| 3 | **修复已知技术债**    | 修正`fomattedDuration` 拼写错误，统一类型导出，Electron 主进程迁移到 TypeScript                              | `src/types/index.ts`，`electron/` 全目录                                                     |
| 4 | **本地数据缓存层**    | 将 localStorage 替换为`electron-store`（已在依赖中但未充分使用），加入上次成功抓取的数据缓存，断网时显示缓存 | `src/stores/`，`src/services/`                                                               |
| 5 | **爬虫容错增强**      | 每个平台的抓取函数加入独立 try-catch，单一平台失败不影响其他平台；增加数据校验；加入健康检查状态指示         | `electron/services/contest.js`，`rating.js`，`solvedNum.js`                                  |

#### Phase 2：用户体验提升（v1.3 - v1.5）

> 目标：让日常使用更流畅、信息密度更高


| #  | 改进项                  | 说明                                                                                                                              | 用户价值                          |
| -- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 6  | **比赛日历改进**        | 当前按天分组的列表视图 → 增加月历视图选项（可用 ECharts 日历热力图或自定义日历组件）；增加比赛时长的可视化条形标记               | 一眼看清整月的比赛密度分布        |
| 7  | **系统托盘 + 比赛提醒** | 最小化到系统托盘；比赛开始前 N 分钟桌面通知提醒（`Notification` API）；设置页面配置提醒时间                                       | 不错过重要比赛                    |
| 8  | **Rating 历史对比**     | 当前只展示单用户单平台 Rating 曲线 → 支持多用户对比（输入多个 handle）；支持时间范围筛选；鼠标悬停显示具体比赛名称和排名         | 与队友/目标选手对比，分析进步轨迹 |
| 9  | **刷题数据增强**        | 当前只显示总数 → 增加按难度分级的统计（如 CF 按 rating 分段）；增加做题趋势图（按周/月统计）；能力雷达图已在 README 提及但需完善 | 科学评估能力短板                  |
| 10 | **搜索与过滤增强**      | 比赛列表支持关键词搜索；支持按比赛时长、时间段过滤；支持只看 Div.1/Div.2/Educational 等分类                                       | 快速找到目标比赛                  |
| 11 | **键盘快捷键**          | 全局快捷键：`Ctrl+R` 刷新、`Ctrl+1-4` 切换页签、`Ctrl+F` 搜索、`Esc` 关闭弹窗                                                     | 提升操作效率，符合桌面端用户习惯  |

#### Phase 3：核心新功能（v2.0）

> 目标：实现 Planned 功能，建立差异化优势


| #  | 新功能             | 设计思路                                                                                               | 实现要点                                                                 |
| -- | ------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| 12 | **本地题解库**     | Markdown 编辑器 + 题目关联（通过题号/链接）；支持标签分类（算法类型、难度）；全文搜索；导出为 PDF/HTML | 可集成`vditor` 或 `milkdown` 编辑器；数据存储在本地 SQLite 或文件系统    |
| 13 | **虚拟竞赛模式**   | 选取 CF/AtCoder 历史比赛，模拟真实时间压力；倒计时界面；提交记录追踪；赛后自动统计                     | 需要新增 Pinia Store 管理竞赛状态；可通过 iframe 或 webview 加载题目页面 |
| 14 | **每日训练推荐**   | 基于用户 Rating 和做题记录，推荐适合难度的题目；可从 CF Problemset API 拉取题目列表                    | 简单推荐算法：Rating ± 200 范围内未做过的题目                           |
| 15 | **数据导出与备份** | 一键导出所有用户数据（收藏、用户名、设置）为 JSON；支持从备份文件恢复；为未来多设备同步打基础          | 基于 electron-store，实现 export/import 功能                             |

#### Phase 4：进阶优化（v2.x+）


| #  | 方向               | 说明                                                                                                        |
| -- | ------------------ | ----------------------------------------------------------------------------------------------------------- |
| 16 | **插件系统**       | 允许社区贡献新 OJ 平台适配器，定义标准化的 platform adapter 接口（fetchContests, fetchRating, fetchSolved） |
| 17 | **自动更新改进**   | 当前手动下载安装 → 引入`electron-updater` 实现静默更新                                                     |
| 18 | **性能优化**       | 比赛列表虚拟滚动（大量数据）；图表懒加载；首屏渲染优化                                                      |
| 19 | **云同步（可选）** | 提供可选的云端数据同步，多设备共享收藏和用户名配置                                                          |
| 20 | **无障碍（a11y）** | 完善 ARIA 标签、键盘导航、高对比度主题                                                                      |

---

### 三、架构改进建议

**1. Platform Adapter 抽象层**

当前各平台的抓取代码直接写在 `electron/services/` 中，耦合度高。建议抽象为统一接口：

```typescript
interface PlatformAdapter {
  id: string;
  name: string;
  fetchContests(days: number): Promise<RawContest[]>;
  fetchRating?(handle: string): Promise<Rating>;
  fetchSolvedCount?(handle: string): Promise<number>;
  healthCheck(): Promise<boolean>;
}
```

每个平台一个文件实现此接口，主服务只负责编排和聚合。这样新增平台只需一个文件，不改动核心代码。

**2. IPC 类型安全**

当前 IPC channel 名称用字符串魔法值（`'get-recent-contests'`），建议定义共享的 channel 枚举和类型映射：

```typescript
// shared/ipc-channels.ts
export const IPC = {
  GET_CONTESTS: 'get-recent-contests',
  GET_RATING: 'get-rating',
  GET_SOLVED: 'get-solved-num',
  OPEN_URL: 'open-url',
} as const;

type IpcHandlers = {
  [IPC.GET_CONTESTS]: (days: number) => Contest[];
  [IPC.GET_RATING]: (platform: string, name: string) => Rating;
  // ...
};
```

**3. 数据层重构**

```
当前: Component → Store → Service → IPC → Electron Service → 外部 API
                ↕ localStorage

建议: Component → Store → Service → IPC → Electron Service → 外部 API
                ↕                              ↕
              Pinia                      electron-store (缓存)
              (响应式)                    (持久化 + 离线降级)
```

---

### 四、优先级建议（实施顺序）

```
高优先级 (立即):
  ├── Electron 安全加固 (preload + contextBridge)
  ├── ESLint/Prettier 代码规范
  ├── 本地数据缓存 + 离线降级
  └── 爬虫容错增强

中优先级 (核心体验):
  ├── 系统托盘 + 比赛提醒通知
  ├── 比赛日历月历视图
  ├── Rating 多用户对比
  ├── 键盘快捷键
  └── 数据导出/备份

低优先级 (新功能):
  ├── 本地题解库 (Markdown)
  ├── 虚拟竞赛模式
  ├── 每日训练推荐
  └── 插件系统
```

---

### 五、具体代码级改进建议

1. **修复类型拼写错误**：`types/index.ts` 中 `fomattedDuration` → `formattedDuration`，全局替换引用
2. **Electron 主进程 TypeScript 化**：`electron/main.js` → `electron/main.ts`，利用类型系统避免 IPC 参数错误
3. **Store 合并/拆分**：`contest.ts` store 有 215 行且同时管理比赛数据 + 收藏 + UI 设置，建议拆分为 `contestStore` + `favoriteStore`
4. **组件拆分**：`Contest.vue` 达到 39.5KB，严重超出合理范围，建议拆分为 `ContestSummary`、`ContestList`、`ContestCard`、`ContestFilter` 等子组件
5. **移除遗留文件**：存在 `FavoritesPage.vue`、`SettingPage.vue`、`ServicePage.vue`、`RecentContestPage.vue` 等 Legacy 文件，如果已被新版替代应清理

---

以上是基于对 OJFlow 全部源码的分析得出的迭代建议。核心思路是：**先加固基础设施（安全+稳定性），再优化核心体验（提醒+可视化），最后扩展新功能（题解+虚拟赛）**。每个阶段的改动相对独立，可以按需取舍。

---

### 六、详细实施方案文档

以下三份文档对本 PRD 中的各阶段提供了完整的技术方案、代码示例和实施步骤：

| 文档 | 覆盖阶段 | 核心内容 |
|------|----------|----------|
| [INFRA_PLAN.md](./INFRA_PLAN.md) | Phase 1 (v1.1 ~ v1.2) | Electron 安全加固、TypeScript 迁移、ESLint/Prettier 工具链、electron-store 持久化 |
| [UX_OPTIMIZATION_PLAN.md](./UX_OPTIMIZATION_PLAN.md) | Phase 2 (v1.3 ~ v1.5) | Platform Adapter 重构、离线缓存策略、性能优化（组件拆分/ECharts 按需引入/路由懒加载） |
| [NEW_FEATURES_PLAN.md](./NEW_FEATURES_PLAN.md) | Phase 3 (v2.0) | 本地题解库、虚拟竞赛模式、每日训练推荐、数据导出与备份 |

三份文档按依赖顺序排列，后一份依赖前一份的基础设施建设完成。
