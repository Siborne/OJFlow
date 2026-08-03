# UI 美化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 OJFlow 页面从当前天空蓝配色升级为 H3 双色体系（LeetCode 暖橙 + 青碧绿），引入 shadcn/ui 替换自定义 Tooltip/Switch/Toggle，清理冗余代码。

**Architecture:** 分 4 个阶段：第零阶段初始化 shadcn/ui 并添加组件；第一阶段重写 CSS 设计 token；第二阶段修复组件层（抽取 PageHeader、真实饼图、页面过渡动画、主题切换控件）；第三阶段清理死代码和硬编码颜色。

**Tech Stack:** React 18, Tailwind CSS v4, shadcn/ui (Radix UI), ECharts, Zustand, Bun

---

### Task 1: 初始化 shadcn/ui

**Files:**
- Create: `components.json`
- Modify: `src/styles/globals.css`
- Modify: `package.json` (new dependencies)

- [ ] **Step 1: 运行 shadcn init**

```pwsh
npx shadcn@latest init --defaults
```

当交互提示出现时选择:
- Style: Default
- Base color: Neutral
- CSS variables: Yes (已经使用 CSS variables)

- [ ] **Step 2: 验证 components.json 已生成且 globals.css 已更新**

```pwsh
Test-Path components.json; Test-Path src/styles/globals.css
```

- [ ] **Step 3: 添加 shadcn Tooltip 组件，替换现有自定义 tooltip**

```pwsh
npx shadcn@latest add tooltip --overwrite
```

这会安装 `@radix-ui/react-tooltip` 并覆盖 `src/components/ui/tooltip.tsx`。

- [ ] **Step 4: 添加 shadcn Switch 组件，替换 ContestFilterModal 的自定义 toggle**

```pwsh
npx shadcn@latest add switch
```

这会安装 `@radix-ui/react-switch` 并创建 `src/components/ui/switch.tsx`。

- [ ] **Step 5: 验证新增的组件文件存在且可以 import**

```pwsh
Test-Path src/components/ui/tooltip.tsx; Test-Path src/components/ui/switch.tsx
```

- [ ] **Step 6: 验证依赖已安装**

```pwsh
bun run type-check
```

- [ ] **Step 7: Commit**

```pwsh
git add components.json src/styles/globals.css src/components/ui/tooltip.tsx src/components/ui/switch.tsx package.json bun.lock
git commit -m "chore: init shadcn/ui, add Tooltip and Switch components"
```

---

### Task 2: 用 shadcn Tooltip 替换项目中的 tooltip 引用

**Files:**
- Modify: `src/components/ui/tooltip.tsx` (已被 shadcn 覆盖，调整默认参数)

shadcn Tooltip 的 API 与原来的不同：它使用 `TooltipProvider` + `Tooltip` + `TooltipTrigger` + `TooltipContent` 组合模式。需要更新所有使用 Tooltip 的地方。

- [ ] **Step 1: 查找项目中所有使用 Tooltip 的 import**

```pwsh
rg "from.*ui/tooltip" src/ --no-heading
```

预期找到 `src/views/Contest.tsx` 等文件。

- [ ] **Step 2: 更新 Contest.tsx 中的 Tooltip 用法**

shadcn Tooltip 需要包裹在 `TooltipProvider` 中，并且 children 必须是单个 ReactElement（用 `TooltipTrigger` 包裹）。

在 `src/views/Contest.tsx` 中找到所有 `<Tooltip content={...}>` 用法，替换为:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// 用法:
<TooltipProvider delayDuration={300}>
  <Tooltip>
    <TooltipTrigger asChild>
      <button>...</button>
    </TooltipTrigger>
    <TooltipContent side="top">
      <p>提示内容</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

`TooltipProvider` 放在 Contest 组件的顶层，所有 Tooltip 共享一个 Provider。`delayDuration` 设为 300（对应 app.config.json 的 showDelayMs）。

- [ ] **Step 3: 检查其他使用 Tooltip 的文件并同样更新**

```pwsh
rg "Tooltip" src/ --no-heading -l
```

对每个文件做同样的 shadcn API 迁移。

- [ ] **Step 4: 运行类型检查确认无 TS 错误**

```pwsh
bun run type-check
```

- [ ] **Step 5: Commit**

```pwsh
git add src/views/Contest.tsx src/components/ui/tooltip.tsx
git commit -m "refactor: migrate to shadcn Tooltip component"
```

---

### Task 3: 用 shadcn Switch 替换 ContestFilterModal 中的自定义 toggle

**Files:**
- Modify: `src/components/contest/ContestFilterModal.tsx`

- [ ] **Step 1: 在 ContestFilterModal.tsx 中导入 Switch 并替换自定义 button toggle**

```tsx
import { Switch } from '@/components/ui/switch';
```

将 L36-L49 的 `<button>` + 内部 `<div>` toggle 替换为:

```tsx
<div className="flex items-center gap-2">
  <Switch
    checked={showEmptyDay}
    onCheckedChange={onToggleShowEmptyDay}
    id="show-empty-day"
  />
  <Label htmlFor="show-empty-day" className="text-sm text-[var(--color-text)]">
    显示无赛程日
  </Label>
</div>
```

需要同时导入 `Label`：

```tsx
import { Label } from '@/components/ui/label';
```

如果 Label 组件还不存在，先运行:

```pwsh
npx shadcn@latest add label
```

- [ ] **Step 2: 运行类型检查**

```pwsh
bun run type-check
```

- [ ] **Step 3: Commit**

```pwsh
git add src/components/contest/ContestFilterModal.tsx src/components/ui/label.tsx src/components/ui/switch.tsx
git commit -m "refactor: replace custom toggle with shadcn Switch in ContestFilterModal"
```

---

### Task 4: 重写 CSS 颜色 Token 为 H3 双色系

**Files:**
- Modify: `src/styles/theme.css`
- Modify: `src/styles/globals.css`

- [ ] **Step 1: 更新 globals.css 中的 Tailwind @theme 映射和 shadcn CSS variables**

当前 `globals.css`:

```css
@import "tailwindcss";
@import "./theme.css";
@import "./a11y.css";
@import "./animations.css";
@import "./mobile.css";

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

@theme {
  --color-bg: var(--color-bg);
  --color-surface: var(--color-surface);
  --color-primary: var(--color-primary);
  --color-primary-weak: var(--color-primary-weak);
  --color-text: var(--color-text);
  --color-text-muted: var(--color-text-muted);
  --color-border: var(--color-border);
  --color-success: var(--color-success);
  --color-warning: var(--color-warning);
  --color-error: var(--color-error);
}
```

改为:

```css
@import "tailwindcss";
@import "./theme.css";
@import "./a11y.css";
@import "./animations.css";
@import "./mobile.css";

@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

@theme {
  --color-bg: var(--color-bg);
  --color-surface: var(--color-surface);
  --color-primary: var(--color-primary);
  --color-accent: var(--color-accent);
  --color-primary-weak: var(--color-primary-weak);
  --color-text: var(--color-text);
  --color-text-muted: var(--color-text-muted);
  --color-border: var(--color-border);
  --color-success: var(--color-success);
  --color-warning: var(--color-warning);
  --color-error: var(--color-error);
}
```

- [ ] **Step 2: 重写 theme.css 的 `:root` 颜色 token**

将 `:root` 块 (L1-L106) 中的颜色变量替换为 H3 配色:

```css
:root {
  --color-bg: #fafafa;
  --color-surface: rgba(255, 255, 255, 0.92);
  --color-surface-muted: rgba(255, 255, 255, 0.72);
  --color-border: rgba(38, 38, 38, 0.1);

  --color-text: #262626;
  --color-text-muted: rgba(38, 38, 38, 0.58);
  --color-text-soft: rgba(38, 38, 38, 0.8);

  /* H3: LeetCode orange primary */
  --color-primary: #ffa116;
  --color-primary-weak: rgba(255, 161, 22, 0.12);
  /* H3: teal accent */
  --color-accent: #14b8a6;
  --color-accent-weak: rgba(20, 184, 166, 0.12);

  --color-success: #16a34a;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  --gradient-start: rgba(255, 161, 22, 0.08);
  --gradient-end: rgba(20, 184, 166, 0.06);
  --gradient-accent: rgba(20, 184, 166, 0.08);

  --card-bg: var(--color-surface);
  --card-border: var(--color-border);
  --card-accent: linear-gradient(135deg, rgba(255, 161, 22, 0.14) 0%, rgba(20, 184, 166, 0.12) 100%);
  --card-shadow: var(--shadow-1);
  --card-shadow-hover: var(--shadow-2);
  --card-divider: var(--divider);

  --nav-height: 56px;
  --nav-bg-color: rgba(255, 255, 255, 0.76);
  --nav-text-color: var(--color-text-muted);
  --nav-hover-color: var(--color-primary);
  --nav-active-color: var(--color-primary);
  --nav-hover-bg: rgba(255, 161, 22, 0.1);
  --nav-active-bg: rgba(255, 161, 22, 0.14);

  --contest-loading-gradient-start: #ffa116;
  --contest-loading-gradient-end: #14b8a6;
  --contest-loading-text-shadow: rgba(255, 255, 255, 0.92);

  --settings-icon-default: var(--color-text-muted);
  --settings-icon-hover: var(--nav-bg-color);
  --settings-icon-active: var(--color-primary);

  --shadow-1: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-2: 0 8px 24px rgba(0, 0, 0, 0.08);
  --shadow-3: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-dark: 0 8px 24px rgba(0, 0, 0, 0.45);

  /* 圆角收窄 */
  --radius-xs: 3px;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;

  --font-size-xs: 11px;
  --font-size-sm: 13px;
  --font-size-md: 14px;
  --font-size-lg: 16px;
  --font-size-xl: 18px;
  --font-size-2xl: 24px;
  --font-size-3xl: 32px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;

  --motion-fast: 120ms;
  --motion-base: 200ms;
  --motion-page: 220ms;
  --motion-ease: cubic-bezier(0.2, 0.8, 0.2, 1);

  --frost-blur: 12px;
  --focus-ring: 0 0 0 2px rgba(255, 161, 22, 0.4);

  --divider: rgba(0, 0, 0, 0.1);

  /* ECharts palette */
  --chart-1: #ffa116;
  --chart-2: #14b8a6;
  --chart-3: #f59e0b;
  --chart-4: #ef4444;
  --chart-5: #8b5cf6;
  --chart-6: #3b82f6;
  --chart-7: #ec4899;
  --chart-8: #06b6d4;

  /* Platform brand colors */
  --platform-codeforces: #1e88e5;
  --platform-atcoder: #222222;
  --platform-luogu: #5c9ded;
  --platform-leetcode: #ffa116;
  --platform-nowcoder: #00b4ff;
  --platform-lanqiao: #00a8e6;

  /* Rating tier colors */
  --rating-newbie: #9ca3af;
  --rating-pupil: #22c55e;
  --rating-specialist: #06b6d4;
  --rating-expert: #3b82f6;
  --rating-master: #a855f7;
  --rating-grandmaster: #ef4444;

  --card-bg-elevated: rgba(255, 255, 255, 0.94);
}
```

- [ ] **Step 3: 删除 `data-scheme="violet"` CSS 块 (L108-L116)**

保留 `data-theme="light"` 和 `data-theme="dark"` 块，但更新它们的颜色值以匹配 H3 配色。

- [ ] **Step 4: 更新暗色模式 token (`data-theme="dark"`)**

```css
:root[data-theme="dark"] {
  color-scheme: dark;
  --color-bg: #1a1a1a;
  --color-surface: rgba(38, 38, 38, 0.82);
  --color-surface-muted: rgba(115, 115, 115, 0.16);
  --color-border: rgba(115, 115, 115, 0.22);

  --color-text: #e5e5e5;
  --color-text-muted: rgba(229, 229, 229, 0.64);
  --color-text-soft: rgba(229, 229, 229, 0.86);

  --gradient-start: rgba(255, 161, 22, 0.16);
  --gradient-end: rgba(20, 184, 166, 0.12);

  --divider: rgba(115, 115, 115, 0.22);

  --card-bg: var(--color-surface);
  --card-border: var(--color-border);
  --card-accent: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
  --card-shadow: var(--shadow-dark);
  --card-shadow-hover: var(--shadow-dark);
  --card-divider: var(--divider);

  --contest-loading-gradient-start: #ffa116;
  --contest-loading-gradient-end: #5eead4;
  --contest-loading-text-shadow: rgba(0, 0, 0, 0.72);

  --nav-bg-color: rgba(38, 38, 38, 0.76);
  --nav-hover-bg: rgba(255, 161, 22, 0.16);
  --nav-active-bg: rgba(255, 161, 22, 0.2);

  --shadow-1: 0 6px 16px rgba(0, 0, 0, 0.36);
  --shadow-2: 0 10px 28px rgba(0, 0, 0, 0.46);
  --shadow-3: 0 4px 12px rgba(0, 0, 0, 0.38);

  --platform-atcoder: #e5e5e5;
  --card-bg-elevated: rgba(38, 38, 38, 0.92);
}
```

- [ ] **Step 5: 更新暗色模式 media query (`prefers-color-scheme: dark`)**

将 L164-L206 中的 `:root:not([data-theme]), :root[data-theme="auto"]` 内的值同步为 Step 4 相同的暗色值。

- [ ] **Step 6: 优化背景装饰**

将 `html, body, #app` 的背景 (L215-L221) 从 4 层 radial-gradient 改为:

```css
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: "SF Pro Text", "Segoe UI Variable", "PingFang SC", "Noto Sans SC", "Microsoft YaHei UI", sans-serif;
  background:
    radial-gradient(900px 500px at 50% -10%, var(--gradient-start), transparent 50%),
    linear-gradient(180deg, #fefefe 0%, var(--color-bg) 42%, #f8f8f8 100%);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

并降低 dot pattern opacity (L233):

```css
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(rgba(38, 38, 38, 0.03) 0.5px, transparent 0.5px);
  background-size: 3px 3px;
  opacity: 0.15;
  z-index: 0;
}
```

- [ ] **Step 7: 更新 focus-ring 中的颜色引用**

将 L75 的 `--focus-ring: 0 0 0 2px rgba(14, 165, 233, 0.4)` 改为 `--focus-ring: 0 0 0 2px rgba(255, 161, 22, 0.4)`

(已在 Step 2 的 :root 块中更新)

- [ ] **Step 8: 更新 shadcn globals.css 中的 CSS variables**

shadcn init 会在 `globals.css` 中注入类似这样的块:

```css
:root {
  --background: ...
  --foreground: ...
  --primary: ...
  --primary-foreground: ...
  ...
}
```

将 `--primary` 映射到 `#ffa116`，`--accent` 映射到 `#14b8a6`。如果需要，重写整个 shadcn CSS variables 块使其引用 theme.css 中的 token。

- [ ] **Step 9: Commit**

```pwsh
git add src/styles/theme.css src/styles/globals.css
git commit -m "style: rewrite color tokens to H3 dual-color system (orange + teal)"
```

---

### Task 5: 删除残留 Naive UI CSS

**Files:**
- Modify: `src/styles/theme.css`

- [ ] **Step 1: 删除 Naive UI 相关 CSS 规则**

在 theme.css 中，删除以下块 (L263-L270):

```css
/* Naive UI manages its own focus rings; remove global override */
.n-input *:focus-visible,
.n-input-number *:focus-visible,
.n-select *:focus-visible,
.n-date-picker *:focus-visible,
.n-button:focus-visible {
  box-shadow: none;
}
```

删除 L310-L326 的 Naive UI 剩余规则:

```css
.n-button {
  border-radius: var(--radius-sm);
  transition: transform var(--motion-fast) var(--motion-ease), ...
}

.n-button.n-button--pressed,
.n-button:active {
  transform: translateY(1px) scale(0.99);
}

.n-button.n-button--primary-type {
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.24);
}

.n-card {
  border-radius: var(--radius-lg);
}
```

删除 `reduced-motion` 媒体查询中引用 `.n-button` 的部分 (L349-L354):

```css
.n-button.n-button--pressed,
.n-button:active,
.day-card:hover,
.contest-card:hover,
.nav-item:hover {
  transform: none !important;
}
```

保留 `.day-card:hover`, `.contest-card:hover`, `.nav-item:hover` 部分（如果它们在项目中有对应的 class 名称）。

- [ ] **Step 2: Commit**

```pwsh
git add src/styles/theme.css
git commit -m "chore: remove dead Naive UI CSS rules"
```

---

### Task 6: 抽取 PageHeader 共享组件并替换所有 View

**Files:**
- Create: `src/components/PageHeader.tsx`
- Modify: `src/views/Contest.tsx`, `Favorite.tsx`, `ServicePage.tsx`, `Settings.tsx`, `RatingPage.tsx`, `SolvedNumPage.tsx`, `CcpPage.tsx`, `OierPage.tsx`, `CfpReportPage.tsx` (9 files)

- [ ] **Step 1: 创建 PageHeader 组件**

```tsx
// src/components/PageHeader.tsx
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 shadow-sm">
      <h2 className="text-lg font-[650]">{title}</h2>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 2: 替换 Contest.tsx 的 header**

将 L? 的:

```tsx
<div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 shadow-sm">
  <h2 className="text-lg font-[650]">比赛列表</h2>
  <div className="flex items-center gap-1">
    {/* existing action buttons */}
  </div>
</div>
```

改为:

```tsx
<PageHeader title="比赛列表" actions={<>...</>} />
```

- [ ] **Step 3-10: 同样替换其余 8 个 View**

对每个 View 文件，将重复的 header div 替换为 `<PageHeader title="..." />` 或 `<PageHeader title="..." actions={...} />`:

| View | 标题 | 有无 actions |
|------|------|-------------|
| Contest.tsx | 比赛列表 | 有 (筛选/刷新) |
| Favorite.tsx | 收藏的比赛 | 有 (搜索/排序等) |
| ServicePage.tsx | 服务 | 无 |
| Settings.tsx | 设置中心 | 无 |
| RatingPage.tsx | Rating 查询 | 无 |
| SolvedNumPage.tsx | 题数统计 | 有 (饼图/查询全部) |
| CcpPage.tsx | CCPC 获奖查询 | 无 |
| OierPage.tsx | OIER 排名 | 无 |
| CfpReportPage.tsx | CF 年度报告 | 无 |

- [ ] **Step 11: 运行类型检查**

```pwsh
bun run type-check
```

- [ ] **Step 12: Commit**

```pwsh
git add src/components/PageHeader.tsx src/views/*.tsx
git commit -m "refactor: extract PageHeader component, deduplicate 9 view headers"
```

---

### Task 7: 修复设置页布局并添加主题切换控件

**Files:**
- Modify: `src/views/Settings.tsx`

- [ ] **Step 1: 修复网格布局**

将 L81 的 `grid-cols-[8fr_2fr_2fr]` 改为 `grid-cols-3`:

```tsx
<div className="mb-4 grid grid-cols-3 gap-3 max-md:grid-cols-1">
```

- [ ] **Step 2: 将"主题模式"卡片从纯文本改为可交互的切换控件**

将 L99-L105:

```tsx
<div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
  <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(14,165,233,0.14),rgba(52,211,153,0.04)_52%,transparent_82%)]" />
  <div className="relative z-10">
    <div className="mb-1 text-sm font-medium text-[var(--color-text-soft)]">主题模式</div>
    <div className="text-2xl font-[680] text-[var(--color-text-soft)]">{uiStore.colorMode}</div>
  </div>
</div>
```

改为:

```tsx
<div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
  <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(255,161,22,0.12),rgba(20,184,166,0.04)_52%,transparent_82%)]" />
  <div className="relative z-10">
    <div className="mb-2 text-sm font-medium text-[var(--color-text-soft)]">主题模式</div>
    <div className="flex items-center gap-2">
      {(['auto', 'light', 'dark'] as const).map((mode) => (
        <button
          key={mode}
          onClick={() => uiStore.setColorMode(mode)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            uiStore.colorMode === mode
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:bg-[var(--nav-hover-bg)]'
          }`}
        >
          {mode === 'auto' ? '自动' : mode === 'light' ? '亮色' : '暗色'}
        </button>
      ))}
    </div>
  </div>
</div>
```

- [ ] **Step 3: 更新卡片渐变中的硬编码 rgba 为 CSS 变量**

将 Settings.tsx 中所有 `rgba(14,165,233,0.14)` 和 `rgba(52,211,153,0.04)` 替换为对应的 CSS 变量值（已在 theme.css 中定义为 `--gradient-start` 和 `--gradient-end`），或者直接写为新的 H3 色值 `rgba(255,161,22,0.12)` 和 `rgba(20,184,166,0.04)`。

同时更新 hover 背景色 `hover:bg-[rgba(14,165,233,0.06)]` → `hover:bg-[var(--nav-hover-bg)]`。

- [ ] **Step 4: 运行类型检查**

```pwsh
bun run type-check
```

- [ ] **Step 5: Commit**

```pwsh
git add src/views/Settings.tsx
git commit -m "feat: add theme toggle controls, fix settings grid layout"
```

---

### Task 8: ECharts 真实饼图替换 SolvedNumPage 的 CSS 圆环

**Files:**
- Modify: `src/views/SolvedNumPage.tsx`

- [ ] **Step 1: 导入 ECharts**

```tsx
import * as echarts from 'echarts';
```

在 `showPieChart` 函数中，改为收集每个平台的数据并记录平台名称:

```tsx
const showPieChart = useCallback(async () => {
  const platformData: { name: string; solved: number; color: string }[] = [];
  const loaded = loadSavedUsernames();

  for (const p of PLATFORMS) {
    const u = loaded[p.name];
    if (!u?.trim()) continue;
    try {
      const users = u.split(';').map((s) => s.trim()).filter(Boolean);
      let sum = 0;
      for (const user of users) {
        const data = await SolvedNumService.getSolvedNum(p.name, user);
        sum += (data as { solvedNum: number }).solvedNum || 0;
      }
      if (sum > 0) {
        platformData.push({ name: p.name, solved: sum, color: p.color });
      }
    } catch {
      // skip
    }
  }

  setPieData(platformData.length > 0 ? { platforms: platformData } : { platforms: [] });
}, []);
```

- [ ] **Step 2: 更新 pieData state 类型和 modal 渲染**

将 `pieData` state 类型改为:

```tsx
const [pieData, setPieData] = useState<{ platforms: { name: string; solved: number; color: string }[] } | null>(null);
```

替换 modal 中的 CSS 圆环 (L276-L281) 为 echarts 容器:

```tsx
<div ref={chartRef} className="mx-auto h-64 w-64" />
```

- [ ] **Step 3: 添加 useEffect 初始化 echarts**

```tsx
const chartRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!pieData || pieData.platforms.length === 0 || !chartRef.current) return;

  const chart = echarts.init(chartRef.current);
  chart.setOption({
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      data: pieData.platforms.map((p) => ({
        name: p.name,
        value: p.solved,
        itemStyle: { color: p.color },
      })),
      label: { show: true, formatter: '{b}\n{d}%' },
    }],
  });

  return () => chart.dispose();
}, [pieData]);
```

- [ ] **Step 4: 运行类型检查**

```pwsh
bun run type-check
```

- [ ] **Step 5: Commit**

```pwsh
git add src/views/SolvedNumPage.tsx
git commit -m "feat: replace static pie chart with ECharts interactive pie chart"
```

---

### Task 9: 替换硬编码 rgba 颜色为 CSS 变量

**Files:**
- Modify: `src/views/SolvedNumPage.tsx`
- Modify: `src/views/Favorite.tsx`
- Modify: `src/views/Settings.tsx` (已在 Task 7 处理)

- [ ] **Step 1: 查找项目中所有硬编码 rgba 值**

```pwsh
rg "rgba\(\d+,\s*\d+,\s*\d+" src/ --no-heading -n
```

- [ ] **Step 2: 逐个替换**

对每个找到的硬编码 rgba:
- `rgba(211,218,220,0.3)` (SolvedNumPage L117) → 使用 `bg-[var(--color-surface-muted)]`
- `rgba(126,186,213,0.3)` (SolvedNumPage L171) → `bg-[var(--color-surface-muted)]`
- `rgba(14,165,233,0.1)` → `bg-[var(--color-primary-weak)]`
- `rgba(52,211,153,0.1)` → `bg-[var(--color-success)]/10`

- [ ] **Step 3: 运行类型检查**

```pwsh
bun run type-check
```

- [ ] **Step 4: Commit**

```pwsh
git add src/views/SolvedNumPage.tsx src/views/Favorite.tsx
git commit -m "refactor: replace hardcoded rgba colors with CSS variables"
```

---

### Task 10: 页面过渡动画 + Favicon 修复

**Files:**
- Modify: `src/styles/animations.css`
- Modify: `src/main.tsx` 或 `src/router.tsx`
- Modify: `index.html`
- Create: `public/icon.ico`

- [ ] **Step 1: 在 animations.css 中新增页面进入动画**

追加:

```css
/* Page enter transition */
@keyframes page-enter {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-transition {
  animation: page-enter 200ms var(--motion-ease) both;
}
```

- [ ] **Step 2: 在 router.tsx 的 LazyRoute 中应用过渡**

```tsx
function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full p-8"><Skeleton className="h-32 w-full" /></div>}>
      <div className="page-transition h-full">{children}</div>
    </Suspense>
  );
}
```

- [ ] **Step 3: 复制 favicon**

```pwsh
if (-not (Test-Path public)) { New-Item -ItemType Directory public }
Copy-Item src/assets/icon.ico public/icon.ico
```

- [ ] **Step 4: 更新 index.html**

将 L6 的:

```html
<link rel="icon" type="image/svg+xml" href="/vite.svg" />
```

改为:

```html
<link rel="icon" type="image/x-icon" href="/icon.ico" />
```

- [ ] **Step 5: 验证构建**

```pwsh
bun run build
```

- [ ] **Step 6: Commit**

```pwsh
git add src/styles/animations.css src/router.tsx index.html public/icon.ico
git commit -m "feat: add page transition animation, fix favicon"
```

---

### Task 11: 最终验证与变更记录

- [ ] **Step 1: 运行完整类型检查**

```pwsh
bun run type-check
```

- [ ] **Step 2: 运行 lint**

```pwsh
bun run lint
```

- [ ] **Step 3: 构建确保正常**

```pwsh
bun run build
```

- [ ] **Step 4: 运行 dev 并目视检查页面**

```pwsh
bun run dev
```

确认:
- [ ] 暗/亮切换控件正常工作
- [ ] 橙色主题色生效
- [ ] 页面过渡动画流畅
- [ ] 设置页布局均衡
- [ ] 饼图为真实 echarts 图表
- [ ] 各页面标题正常显示

- [ ] **Step 5: 创建变更记录**

写入 `docs/变更记录/ui-beautification-h3-color-system_2026-05-23.md`

- [ ] **Step 6: 最终提交**

```pwsh
git add docs/变更记录/
git commit -m "docs: add change log for UI beautification"
```
