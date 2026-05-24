# 修复设置页布局并添加主题切换控件

## 基本信息
- **时间**: 2026-05-24
- **修改文件**: `src/views/Settings.tsx`

## 根因分析
- 设置页网格布局使用 `grid-cols-[8fr_2fr_2fr]` 导致三个卡片宽度严重不均衡，视觉上很突兀
- 主题模式仅显示文本 `{uiStore.colorMode}`，无法交互切换，需要到其他地方修改主题

## 修改详情

### 文件: src/views/Settings.tsx (L80)

**BEFORE:**
```tsx
<div className="mb-4 grid grid-cols-[8fr_2fr_2fr] gap-3 max-md:grid-cols-1">
```

**AFTER:**
```tsx
<div className="mb-4 grid grid-cols-3 gap-3 max-md:grid-cols-1">
```

> 说明：将不等分网格改为等分三列，三个卡片宽度一致

### 文件: src/views/Settings.tsx (L82, L92, L99) - 渐变配色

**BEFORE:**
```css
bg-[linear-gradient(130deg,rgba(14,165,233,0.14),rgba(52,211,153,0.04)_52%,transparent_82%)]
```

**AFTER:**
```css
bg-[linear-gradient(130deg,rgba(255,161,22,0.12),rgba(20,184,166,0.04)_52%,transparent_82%)]
```

> 说明：将冷色调渐变（蓝-绿）替换为暖色调渐变（橙-青），与整体设计语言一致

### 文件: src/views/Settings.tsx (L98-L118) - 主题切换

**BEFORE:**
```tsx
<div className="relative overflow-hidden ...">
  ...
  <div className="mb-1 ...">主题模式</div>
  <div className="text-2xl ...">{uiStore.colorMode}</div>
</div>
```

**AFTER:**
```tsx
<div className="relative overflow-hidden ...">
  ...
  <div className="mb-2 ...">主题模式</div>
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
```

> 说明：将静态文本替换为三个交互按钮（自动/亮色/暗色），当前选中态高亮显示

### 文件: src/views/Settings.tsx (L124, L158, L179, L197) - 悬停背景

**BEFORE:**
```css
hover:bg-[rgba(14,165,233,0.06)]
```

**AFTER:**
```css
hover:bg-[var(--nav-hover-bg)]
```

> 说明：将硬编码的蓝色悬停背景替换为主题 CSS 变量，支持明暗主题自适应

## 解决方案
1. 网格改为等分三列布局
2. 主题模式卡片添加三个交互式切换按钮，复用 `useUiStore` 已有的 `setColorMode` 方法
3. 渐变配色统一为暖色调
4. 悬停背景色改为 CSS 变量，随主题自动适配
