# shadcn/ui 初始化 + Tooltip/Switch 组件_2026-05-24

## 基本信息

- **时间**: 2026-05-24
- **修改文件**:
  - `components.json` (新建)
  - `src/styles/globals.css` (修改)
  - `src/styles/theme.css` (修改)
  - `src/components/ui/tooltip.tsx` (重写)
  - `src/components/ui/switch.tsx` (新建)
  - `src/views/Contest.tsx` (修改)
  - `package.json` (修改)

## 根因分析

- **问题现象**: 项目需要 shadcn/ui 组件库用于 UI beautification，但尚未初始化。
- **根因**: 项目处于 Electron React 迁移阶段，之前使用的是自定义组件，缺少 shadcn/ui 标准组件库。

## 修改详情

### 文件: components.json (新建)

配置 shadcn/ui CLI，指定：
- Style: default, Base color: neutral
- CSS variables: enabled
- 路径别名: `@/` 映射到 `src/`

### 文件: src/styles/theme.css (L104-L126, L192-L218, L253-L273)

在 `:root`、`:root[data-theme="dark"]`、`@media (prefers-color-scheme: dark)` 三个主题块中分别添加 shadcn 语义化 CSS 变量。

**BEFORE (缺失):**
```css
/* 项目缺少 shadcn 的 --background, --primary, --foreground 等变量 */
```

**AFTER (新增):**
```css
--background: var(--color-bg);
--foreground: var(--color-text);
--primary: var(--color-primary);
--primary-foreground: #ffffff;
--border: var(--color-border);
--input: var(--color-border);
--ring: var(--color-primary);
--radius: 0.625rem;
/* ... 等 25 个语义变量 */
```

> 说明: shadcn 组件使用标准语义变量名，此处将它们映射到项目现有的 `--color-*` 主题系统，确保 shadcn 组件自动跟随项目主题切换。

### 文件: src/styles/globals.css (L7, L24-L48)

1. 添加 `@plugin "tailwindcss-animate"` 使 shadcn 动画类可用
2. 添加 `@theme inline` 块，将 shadcn CSS 变量注册为 Tailwind v4 主题 token

**AFTER (新增 @theme inline):**
```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ... 等 20 个 token 映射 */
}
```

> 说明: Tailwind v4 的 `@theme inline` 块优先级高于 `@theme`，确保 shadcn 的语义类名（如 `bg-primary`、`text-foreground`）正确解析。项目原有组件使用自定义变量（如 `bg-[var(--color-primary)]`），不受影响。

### 文件: src/components/ui/tooltip.tsx (重写)

**BEFORE (自定义 tooltip, 57 行):**
```tsx
export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  // 纯 CSS 定位实现，无动画，无 Radix 可访问性支持
}
```

**AFTER (shadcn tooltip, 57 行):**
```tsx
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
// 导出: TooltipProvider, Tooltip, TooltipTrigger, TooltipContent
// 基于 @radix-ui/react-tooltip，支持键盘导航、屏幕阅读器、Portal 渲染
```

> 说明: 替换为 shadcn 基于 Radix 的标准组件。API 从 `<Tooltip content="..." side="...">` 改为复合组件模式 `<Tooltip><TooltipTrigger>...<TooltipContent>...</TooltipContent></Tooltip>`。

### 文件: src/components/ui/switch.tsx (新建)

shadcn Switch 组件，基于 `@radix-ui/react-switch`，导出 `Switch` 函数组件。

### 文件: src/views/Contest.tsx (L12, L260-L275)

更新 Tooltip 用法以匹配新的 shadcn API。

**BEFORE:**
```tsx
<Tooltip content="筛选">
  <Button ...><Filter size={22} /></Button>
</Tooltip>
```

**AFTER:**
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Button ...><Filter size={22} /></Button>
  </TooltipTrigger>
  <TooltipContent>筛选</TooltipContent>
</Tooltip>
```

### 文件: package.json (L57-L58)

新增依赖:
- `@radix-ui/react-switch: ^1.1.0`
- `@radix-ui/react-tooltip: ^1.1.0`

## 解决方案

手动创建 shadcn/ui 初始化所需的所有文件（`npx shadcn@latest` 不可用），包括：
1. CLI 配置文件 `components.json`
2. shadcn 兼容的 CSS 变量系统（映射到项目现有主题）
3. 两个 shadcn 组件（Tooltip 和 Switch）基于 Radix primitives
4. 必要的 npm 依赖声明
5. 更新受影响的 Contest.tsx 以适配新 API

## 待完成

- [ ] 运行 `bun install` 安装 `@radix-ui/react-tooltip` 和 `@radix-ui/react-switch`
- [ ] 运行 `bun run type-check` 验证无新增 TS 错误
- [ ] 提交变更
