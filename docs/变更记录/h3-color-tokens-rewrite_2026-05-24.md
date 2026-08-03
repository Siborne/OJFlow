# H3 Dual-Color System Token Rewrite

**时间**: 2026-05-24

**修改文件**:
- `src/styles/theme.css`
- `src/styles/animations.css`
- `src/views/CfpReportPage.tsx`

## 根因分析

问题现象：项目当前使用 sky-blue (#0ea5e9) + emerald green (#34d399) 双色系，缺乏辨识度。

根因：设计 tokens 未体现品牌色升级需求。需要切换到 LeetCode 暖橙 (#ffa116) + teal green (#14b8a6) 的 H3 双色系。

## 修改详情

### 文件: src/styles/theme.css

1. `:root` 块中所有与 primary/accent 相关的 CSS 变量已重写：
   - `--color-primary`: `#0ea5e9` → `#ffa116`
   - `--color-primary-weak`: 对应的 rgba 值更新
   - 新增 `--color-accent: #14b8a6` 和 `--color-accent-weak`
   - 新增 `--gradient-accent`
   - `--gradient-start/end` 更新为新的双色系
   - `--card-accent` 渐变更新
   - `--nav-hover-bg/--nav-active-bg` 更新
   - `--contest-loading-gradient-start/end` 更新
   - `--focus-ring` 更新
   - `--chart-1/2/8` 更新
   - `--radius-xs/sm/md/lg/xl` 缩小为更克制的值 (3/4/6/8/12px)
   - `--color-bg` 更新为 `#fafafa`

2. 删除了 `:root[data-scheme="violet"]` 整个块（原映射回相同的 sky-blue 颜色，无实际作用）

3. `:root[data-theme="dark"]` 块全面更新：
   - bg/surface/border/text 颜色调整
   - gradient/contest-loading/nav/shadow 值更新为 H3 色彩
   - card-bg-elevated 更新

4. `@media (prefers-color-scheme: dark)` 自动暗色模式块：同上更新

5. body 背景装饰简化：4 层 radial-gradient → 2 层（1 radial + 1 linear），减少视觉噪音
   - 点阵不透明度从 0.3 降至 0.15

6. `.n-button.n-button--primary-type` box-shadow 颜色更新为新的 primary color

### 文件: src/styles/animations.css

- `@keyframes pulse-ring` 中的颜色从 `rgba(52, 211, 153, ...)` → `rgba(20, 184, 166, ...)`（新 accent 颜色）

### 文件: src/views/CfpReportPage.tsx

- `backgroundColor` 从 `rgba(14, 165, 233, ...)` → `rgba(255, 161, 22, ...)`（新 primary 颜色）

## 解决方案

系统性将 CSS 设计 tokens 从旧的 sky-blue 双色系迁移到 H3 (暖橙 + teal green) 双色系。平台品牌色、rating tier 颜色、success/warning/error 语义色保持不动。shadcn/ui tokens 通过变量链自动继承新值，无需改动。
