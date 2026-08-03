# UI 美化设计文档

**日期**: 2026-05-23
**状态**: 已确认

## 设计方向

- **基调**: 现代 SaaS 精致风（参考 Linear / Vercel），克制圆角
- **主色**: LeetCode 暖橙 `#ffa116` — 用于主按钮、进行中状态、品牌标识
- **辅色**: 青碧绿 `#14b8a6` — 用于平台分类标签、难度标记、通过/成功状态
- **语义色**: 绿(成功) / 橙(警告/进行中) / 红(错误/已结束) / 金(收藏星标)
- **圆角**: 卡片 6px，标签/徽章 3-4px，按钮 6px
- **暗/亮**: 双模式完整支持，暗色背景 `#1a1a1a`，亮色背景 `#fafafa`

## 技术决策：引入 shadcn/ui

**为什么选 shadcn/ui**:
- 与当前技术栈完全一致（CVA + Tailwind CSS v4 + Lucide React + cn()）
- 项目中 `src/components/ui/button.tsx` 和 `tooltip.tsx` 已经是 shadcn 风格
- copy-paste 模式，组件源码在项目内，可自由修改适配 H3 配色
- 底层 Radix UI 原语提供完整的 accessibility（role、aria、键盘导航开箱即用）
- 不会引入 CSS 冲突或设计系统打架

**要添加的 shadcn 组件**:
| 组件 | 替换当前的什么 | Radix 依赖 |
|------|---------------|-------------|
| `Tooltip` | `src/components/ui/tooltip.tsx` (缺延迟/箭头/定位) | `@radix-ui/react-tooltip` |
| `Switch` | ContestFilterModal 中的自定义 toggle (缺动画/无障碍) | `@radix-ui/react-switch` |
| `Dialog` | ContestFilterModal 中的自定义弹窗 | `@radix-ui/react-dialog` |

现有 `button.tsx` 和 `skeleton.tsx` 已经是 shadcn 格式，无需替换。

## 实现阶段

### 第零阶段：shadcn/ui 初始化

#### 0.1 初始化 shadcn/ui
- 运行 `npx shadcn@latest init`（选 Tailwind v4 + CSS variables + 默认配置）
- 生成 `components.json` 配置文件
- 更新 `src/styles/globals.css` 的 shadcn CSS variables 块

#### 0.2 添加 shadcn 组件
- `npx shadcn@latest add tooltip` — 替换自定义 tooltip
- `npx shadcn@latest add switch` — 替换自定义 toggle
- `npx shadcn@latest add dialog` — 可选，替换 ContestFilterModal 的自定义弹窗
- 这些命令安装对应的 `@radix-ui/react-*` 包 + 写入组件源码到 `src/components/ui/`

### 第一阶段：设计 Token 重铸

#### 1.1 重写 CSS 颜色 Token
- **文件**: `src/styles/theme.css` + `src/styles/globals.css`
- 将 shadcn 的 CSS variables 颜色值替换为 H3 双色系：`--primary` → `#ffa116`，`--accent` → `#14b8a6`
- 删除当前 sky blue 色系所有旧 token
- 删除失效的 `data-scheme="violet"` CSS 块
- 保持平台色、rating 色不变
- 暗色模式 (.dark class) 由 shadcn 管理

#### 1.2 背景装饰优化
- **文件**: `src/styles/theme.css`
- 当前：4 层 radial-gradient + dot pattern 伪元素
- 改为：1 层 subtle radial-gradient + 微妙噪点
- dot pattern 保留但降低 opacity 到 0.3

#### 1.3 设置页增加主题切换控件
- **文件**: `src/views/Settings.tsx`、`src/stores/ui.ts`
- 使用 shadcn Switch 或 RadioGroup 实现 Light / Dark / Auto 三档切换
- 实时生效

### 第二阶段：组件层修复

#### 2.1 抽取 PageHeader 共享组件
- **新建**: `src/components/PageHeader.tsx`
- **修改**: 9 个 View 文件（Contest, Favorite, ServicePage, Settings, RatingPage, SolvedNumPage, CcpPage, OierPage, CfpReportPage）
- Props: `title: string`, `actions?: ReactNode`
- 统一 h-16 border-b 页头结构

#### 2.2 ECharts 真实饼图
- **文件**: `src/views/SolvedNumPage.tsx`
- 用 echarts PieChart 替换当前 CSS 圆环 `<div>` + 数字
- 点击平台扇区可展开/钻取

#### 2.3 页面切换过渡动画
- **文件**: `src/main.tsx`、`src/styles/animations.css`
- CSS `@keyframes` fade-in + translateY(4px) → 0，200ms
- 利用 React `<Suspense>` + CSS transition
- 不引入 framer-motion

### 第三阶段：代码清理

#### 3.1 删除残留 Naive UI CSS
- **文件**: `src/styles/theme.css`
- 删除所有 `.n-button`, `.n-card`, `.n-input`, `.n-select`, `.n-modal` 等规则（~200 行）

#### 3.2 替换硬编码 rgba 颜色
- **文件**: `src/views/SolvedNumPage.tsx` 等
- 所有 inline `rgba()` → CSS 变量

#### 3.3 设置页布局修复
- **文件**: `src/views/Settings.tsx`
- `8fr_2fr_2fr` → 均衡网格布局，移动端单列

#### 3.4 Favicon 替换
- **文件**: `index.html`、`public/`
- 复制 `src/assets/icon.ico` → `public/icon.ico`
- `index.html` `<link rel="icon">` → `/icon.ico`

#### 3.5 ECharts 依赖确认
- #2.2 使用了 ECharts 饼图，保留依赖

## 涉及文件清单

| 文件 | 操作 |
|------|------|
| `components.json` | **新建** — shadcn 配置 |
| `src/styles/globals.css` | 更新 shadcn CSS variables |
| `src/styles/theme.css` | 重写颜色 token + 清理死代码 + 优化背景 |
| `src/styles/animations.css` | 新增页面过渡 keyframes |
| `src/components/PageHeader.tsx` | **新建** |
| `src/components/ui/tooltip.tsx` | 替换为 shadcn Tooltip |
| `src/components/ui/switch.tsx` | **新建** — shadcn Switch |
| `src/components/ui/dialog.tsx` | **新建** — shadcn Dialog (可选) |
| `src/components/contest/ContestFilterModal.tsx` | 用 shadcn Switch + Dialog 重建 |
| `src/views/Settings.tsx` | 布局修复 + 主题切换控件 |
| `src/views/Contest.tsx` | 替换页头为 PageHeader |
| `src/views/Favorite.tsx` | 替换页头 |
| `src/views/ServicePage.tsx` | 替换页头 |
| `src/views/RatingPage.tsx` | 替换页头 |
| `src/views/SolvedNumPage.tsx` | 替换页头 + 真实饼图 + 修复硬编码色 |
| `src/views/CcpPage.tsx` | 替换页头 |
| `src/views/OierPage.tsx` | 替换页头 |
| `src/views/CfpReportPage.tsx` | 替换页头 |
| `src/main.tsx` | 页面过渡动画集成 |
| `index.html` | Favicon 修复 |
| `public/icon.ico` | **新建** — 从 assets 复制 |
| `package.json` | 新增 `@radix-ui/react-tooltip` `@radix-ui/react-switch` `@radix-ui/react-dialog` |

## 不做的事情

- 不修改 Electron 主进程
- 不改变数据流 / IPC / 业务逻辑
- 不调整路由结构
