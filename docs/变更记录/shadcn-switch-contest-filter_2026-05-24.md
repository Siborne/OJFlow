# shadcn Switch 替换 ContestFilterModal 自定义 toggle

## 基本信息

- **时间**: 2026-05-24
- **修改文件**:
  - `src/components/contest/ContestFilterModal.tsx`
  - `src/components/ui/label.tsx` (新建)

## 根因分析

- **问题现象**: ContestFilterModal 中"显示无赛程日"使用自定义 `<button>` + 绝对定位 `<div>` 实现的 toggle 开关
- **根因**: 项目迁移到 shadcn/ui 后，应使用 shadcn 提供的 Switch 组件替代手写 toggle，统一 UI 风格并减少维护负担

## 修改详情

### 文件: src/components/contest/ContestFilterModal.tsx (L1-L2, L35-L44)

**BEFORE:**
```tsx
import { cn } from '@/lib/utils';
```

```tsx
<div className="flex items-center justify-between">
  <span className="text-sm text-[var(--color-text)]">显示无赛程日</span>
  <button
    onClick={() => onToggleShowEmptyDay(!showEmptyDay)}
    className={cn(
      'relative h-5 w-9 rounded-full transition-colors',
      showEmptyDay ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-muted)]',
    )}
  >
    <div
      className={cn(
        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
        showEmptyDay ? 'translate-x-[18px]' : 'translate-x-0.5',
      )}
    />
  </button>
</div>
```

**AFTER:**
```tsx
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
```

```tsx
<div className="flex items-center gap-2">
  <Switch
    checked={showEmptyDay}
    onCheckedChange={onToggleShowEmptyDay}
    id="show-empty-day"
  />
  <Label htmlFor="show-empty-day" className="text-sm text-[var(--color-text)] cursor-pointer">
    显示无赛程日
  </Label>
</div>
```

> 说明：使用 shadcn Switch 组件（底层 @radix-ui/react-switch）替换手写 toggle，同时用 Label 组件关联 Switch，提升可点击区域。Switch 的 `onCheckedChange` 直接传递布尔值给 `onToggleShowEmptyDay`，无需适配逻辑。

### 文件: src/components/ui/label.tsx (新建)

新建 Label 组件，封装原生 HTML `<label>` 元素，提供与 shadcn 兼容的 API（`htmlFor`、`className` 等属性透传）。

## 解决方案

1. 使用 shadcn Switch（基于 @radix-ui/react-switch，项目已安装）替代手写 toggle
2. 新建 Label 组件提供标签功能，无需额外安装 @radix-ui/react-label
3. 移除不再使用的 `cn` import
