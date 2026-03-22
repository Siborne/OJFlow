# Contest 页面改造方案

## 一、日期列表优化 (已实现)

### 核心改造内容

#### 1. 默认展开逻辑
- **今天**: 始终展开所有比赛
- **明天**: 始终展开所有比赛  
- **后续日期** (3天后及以后): 默认折叠，点击卡片头部"查看全部"按钮展开
- **历史记录**: 单独折叠到底部，标记为"📚 历史记录 (N 场)"，默认折叠

#### 2. 布局改造 - 左侧固定 + 右侧可滚动
```
┌─────────────────────────────────────┐
│ 比赛总览卡片 (340px 固定宽度)        │
│ - 完全固定，不随滚动                 │
│                                      │
│ 下一场卡片                           │
│                                      │
│ 平台覆盖卡片                         │
└─────────────────────────────────────┐
        ↓
    (固定左侧)
        ↓
    ┌────────────────────────┐
    │ 右侧可滚动区域         │
    │                        │
    │ 今天的比赛 (展开)      │
    │ 明天的比赛 (展开)      │
    │ 后续日期 (折叠)        │
    │ 历史记录 (折叠)        │
    │                        │
    │ ↑ 仅此区域可滚动        │
    └────────────────────────┘
```

#### 3. 移动端适配 (768px 以下)
- 完全纵向堆积，无左侧固定列
- **列表项限制**: 每个日期卡片内仅显示前 5 个比赛项，超过的隐藏
- 汇总卡片显示在最上方

### Vue 逻辑实现

#### 新增状态管理
```typescript
// 展开/折叠状态
const expandedFutureDays = ref<Set<number>>(new Set());  // 追踪展开的未来日期
const showHistory = ref(false);                          // 历史记录展开状态
```

#### 新增计算属性

| 计算属性 | 功能说明 | 返回类型 |
|---------|--------|--------|
| `todayContest` | 当天比赛列表 | `Contest[]` |
| `tomorrowContest` | 明天比赛列表 | `Contest[]` |
| `futureContests` | 后续日期比赛 (按日期分组) | `Contest[][]` |
| `historicalContests` | 已结束的历史比赛 | `Contest[]` |
| `runningContestCount` | 进行中的比赛数 | `number` |
| `endedContestCount` | 已结束的比赛数 | `number` |
| `dayRangeText` | 日期范围文本 (如 "3/15-5/20") | `string` |

#### 新增方法

| 方法 | 功能说明 | 参数 |
|-----|--------|------|
| `toggleFutureDay(index)` | 切换指定日期的展开/折叠 | `dayIdx: number` |
| `toggleHistorySection()` | 切换历史记录展开/折叠 | - |
| `getFutureDayName(index)` | 获取未来日期的显示名称 | `index: number` |
| `getVisibleContestCount(dayList)` | 获取经过筛选的比赛数 | `dayList: Contest[]` |

### 模板代码结构

```vue
<template>
  <!-- 左侧固定区域 -->
  <div class="sidebar">
    <!-- 汇总卡片 (三个设计方案可选) -->
    <n-card class="summary-card summary-card--hero">
      <!-- 方案 A/B/C 之一 -->
    </n-card>
    <!-- 下一场、平台覆盖卡片 -->
  </div>

  <!-- 右侧可滚动区域 -->
  <div class="content scrollable">

    <!-- 今天的比赛 (默认展开) -->
    <div class="contests-section contests-section--near">
      <div class="day-group day-group--today">
        <n-card class="day-card"><!-- 比赛列表 --></n-card>
      </div>
      
      <!-- 明天的比赛 (默认展开) -->
      <div class="day-group day-group--tomorrow">
        <n-card class="day-card"><!-- 比赛列表 --></n-card>
      </div>
    </div>

    <!-- 后续日期 (默认折叠) -->
    <div class="contests-section contests-section--future">
      <div v-for="(dayList, dayIdx) in futureContests"
           class="day-group day-group--future">
        
        <!-- 折叠卡片头 -->
        <div class="day-group-header">
          <n-card class="day-card day-card--collapsible">
            <div class="day-header-content" @click="toggleFutureDay(dayIdx)">
              <span>{{ getFutureDayName(dayIdx) }}</span>
              <span class="day-count">({{ getVisibleContestCount(dayList) }} 场)</span>
              <n-icon class="expand-icon" :class="{ 'is-expanded': expandedFutureDays.has(dayIdx) }">
                <!-- 向下箭头 SVG -->
              </n-icon>
            </div>
          </n-card>
        </div>

        <!-- 展开内容 -->
        <n-card v-show="expandedFutureDays.has(dayIdx)" class="day-card day-card--content">
          <!-- 比赛列表 -->
        </n-card>
      </div>
    </div>

    <!-- 历史记录 (默认折叠) -->
    <div class="contests-section contests-section--history">
      <div class="day-group day-group--history">
        <div class="day-group-header">
          <n-card class="day-card day-card--collapsible day-card--history">
            <div class="day-header-content" @click="toggleHistorySection">
              <span class="day-title day-title--history">📚 历史记录</span>
              <span class="day-count">({{ historicalContests.length }} 场)</span>
              <n-icon class="expand-icon" :class="{ 'is-expanded': showHistory }">
                <!-- 向下箭头 SVG -->
              </n-icon>
            </div>
          </n-card>
        </div>

        <!-- 展开内容 -->
        <n-card v-show="showHistory" class="day-card day-card--content">
          <!-- 比赛列表 -->
        </n-card>
      </div>
    </div>

  </div>
</template>
```

### 样式关键点

#### 布局容器
```css
/* 左固定 + 右滚动布局 */
.layout-wrapper {
  display: flex;
  flex: 1;
  gap: var(--space-3);
  overflow: hidden;
}

.sidebar {
  flex-shrink: 0;
  width: 340px;
  min-height: 0;
}

.content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
```

#### 折叠头交互
```css
.day-card--collapsible .day-header-content {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  transition: all var(--motion-base) var(--motion-ease);
  padding: 4px;
  border-radius: var(--radius-sm);
}

.day-card--collapsible .day-header-content:hover {
  background: rgba(14, 165, 233, 0.08);
}

.expand-icon {
  width: 18px;
  height: 18px;
  margin-left: auto;
  transition: transform var(--motion-base) var(--motion-ease);
}

.expand-icon.is-expanded {
  transform: rotate(180deg);
}
```

#### 移动端隐藏超过5个项
```css
@media (max-width: 768px) {
  .day-card .contest-item:nth-child(n+6) {
    display: none;  /* 隐藏第6个及以后的项 */
  }
}
```

---

## 二、卡片设计方案对比

### 方案 A: 微网格 (Micro Grid)

#### 设计理念
- **高信息密度**: 主数字居中展示，周围用 2×2 网格显示 4 个小数据
- **对称感**: 中心对称的视觉构成，具有精密的几何美感
- **数据对标**: 快速对比多个指标

#### 视觉效果
```
┌─────────────────────────┐
│                         │
│           42            │  ← 主数字 (当前筛选可见)
│    (48px 字体)          │
│                         │
│  收藏  │  今日          │  ← 4 个小指标网格
│   8   │   5             │
│───────┼─────            │
│ 进行中│ 已结束          │
│   2   │   3             │
│                         │
└─────────────────────────┘
```

#### 样式代码
```css
.summary-grid-wrapper {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: center;
}

.summary-center-value {
  grid-column: 1 / -1;
  font-size: 48px;
  line-height: 1;
  font-weight: 700;
  color: var(--color-primary);
  text-align: center;
  margin-bottom: 8px;
}

.summary-stat-grid {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  border-radius: var(--radius-md);
  background: rgba(14, 165, 233, 0.05);
  border: 1px solid rgba(14, 165, 233, 0.1);
  transition: all var(--motion-base) var(--motion-ease);
}

.stat-cell:hover {
  border-color: rgba(14, 165, 233, 0.2);
  background: rgba(14, 165, 233, 0.08);
  transform: translateY(-1px);
}

.stat-number {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 4px;
  font-weight: 500;
}
```

#### 优点
- ✅ 信息展示最完整，一眼看清所有关键指标
- ✅ 对称精密的几何构成，符合"高级感"
- ✅ 易于快速扫描对比数据
- ✅ 网格元素可单独交互（如悬停亮起）

#### 缺点
- ❌ 在超小屏幕上排列可能拥挤
- ❌ 不如纵向堆积的清晰度高 (在极小宽度下)

---

### 方案 B: 纵向 Info Stack (Recommended)

#### 设计理念
- **清晰层级**: 大数字到小文本的视觉递进，符合信息优先级
- **垂直呼吸感**: 充分利用纵向空间，留白充足
- **易读性最强**: 在任何宽度下都清晰易读
- **Bento 语言**: 与卡片堆积的纵向美学完全一致

#### 视觉效果
```
┌─────────────────────────┐
│                         │
│          42             │  ← 主标题
│      当前筛选可见        │  ← 副文本 (12px)
│                         │
│ 收藏        8 场        │  ← 一级信息
│                         │
│ 进行中      2 场        │  ← 二级信息
│                         │
│ 时间        3/15-5/20   │  ← 三级信息
│                         │
└─────────────────────────┘
```

#### 样式代码
```css
.summary-main {
  margin-bottom: 16px;
}

.summary-value {
  font-size: 44px;
  line-height: 1.1;
  font-weight: 700;
  color: var(--color-primary);
}

.summary-label {
  margin-top: 6px;
  color: var(--color-text-muted);
  font-size: 12px;
  font-weight: 500;
}

.summary-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stack-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  line-height: 1.5;
  padding: 8px 0;
  border-bottom: 1px solid rgba(14, 165, 233, 0.08);
  transition: all var(--motion-base) var(--motion-ease);
}

.stack-item:last-child {
  border-bottom: none;
}

.stack-item:hover {
  background: rgba(14, 165, 233, 0.04);
  padding: 8px 6px;
}

.stack-label {
  color: var(--color-text-muted);
  font-weight: 500;
}

.stack-value {
  color: var(--color-text);
  font-weight: 600;
  font-size: 14px;
}
```

#### 优点
- ✅ **最易读**: 任何宽度下都清晰
- ✅ **Bento 协调**: 纵向堆积与卡片布局完全一致
- ✅ **视觉递进**: 大→小→细的信息优先级明确
- ✅ **响应式友好**: 在移动端无需调整
- ✅ **交互空间**: 每行可独立交互（hover 高亮）
- ✅ **最推荐**: 适配"克制、精密、轻科技"美学

#### 缺点
- 📊 信息密度略低于方案 A (但更易理解)

#### 🏆 **推荐理由**
这是最适合 Bento 高级感的方案，因为：
1. **视觉语言一致**: 整个页面都是纵向卡片堆积，方案 B 的纵向 Info Stack 保持一致性
2. **清晰的信息悬停**: 每一行信息都可以独立强调，增强交互质感
3. **克制美学**: 不过度装饰，但足够精密（字号递进 44px → 12px）
4. **移动端无缝**: 无需响应式调整，任何宽度都适配

---

### 方案 C: 后背景强化

#### 设计理念
- **简约基础**: 保持现有排版和内容不变
- **细节增强**: 通过极浅渐变或微弱几何元素增加设计感
- **宁静优雅**: 不喧宾夺主，强化背景气氛
- **最小改动**: 仅调整背景层，业务逻辑零变化

#### 视觉效果
```
┌─────────────────────────┐ ✨ 微弱渐变背景
│ [极浅渐变或网格纹理]    │    (30% 透明度)
│   42                    │
│   当前筛选可见比赛       │ ✨ 浅色几何元素
│                         │    (如淡圆圈)
│ 收藏 8 场 · 今日 5 场    │
│                         │
└─────────────────────────┘
```

#### 样式代码 - 方案 C1: 微弱渐变背景
```css
.summary-content--scheme-c {
  position: relative;
  z-index: 1;
}

.summary-card--scheme-c::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  background: linear-gradient(
    135deg,
    rgba(14, 165, 233, 0.08) 0%,
    rgba(52, 211, 153, 0.04) 50%,
    rgba(59, 130, 246, 0.06) 100%
  );
  pointer-events: none;
  z-index: 0;
}

.summary-content--scheme-c {
  position: relative;
  z-index: 1;
}

.summary-main {
  margin-bottom: 16px;
}

.summary-value {
  font-size: 34px;
  line-height: 1.1;
  font-weight: 700;
  color: var(--color-primary);
}

.summary-label {
  margin-top: 4px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.summary-meta {
  margin-top: 14px;
  color: var(--color-text-soft);
  font-size: 13px;
}
```

#### 样式代码 - 方案 C2: 网格纹理背景
```css
.summary-card--scheme-c::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  background-image: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 48px,
      rgba(14, 165, 233, 0.04) 48px,
      rgba(14, 165, 233, 0.04) 49px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 48px,
      rgba(14, 165, 233, 0.04) 48px,
      rgba(14, 165, 233, 0.04) 49px
    );
  pointer-events: none;
  z-index: 0;
}
```

#### 样式代码 - 方案 C3: 几何圆形元素
```css
.summary-card--scheme-c::before {
  content: '';
  position: absolute;
  inset: -20%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 30% 40%,
    rgba(14, 165, 233, 0.08) 0%,
    transparent 70%
  );
  pointer-events: none;
  z-index: 0;
}

.summary-content--scheme-c {
  position: relative;
  z-index: 1;
}
```

#### 优点
- ✅ 改动最小，保持原有排版结构
- ✅ 细节优雅，不影响内容阅读
- ✅ 易于定制背景样式（可切换多种变体）
- ✅ 轻盈感，符合"轻科技"美学

#### 缺点
- ❌ 增强感受依赖于背景，不如前两个方案直观
- ❌ 在不同主题下需微调渐变颜色
- ❌ 信息密度仍偏低

---

## 三、推荐实施方案

### 最佳选择: **方案 B (纵向 Info Stack)**

#### 核心理由
| 维度 | 方案 A | 方案 B | 方案 C |
|-----|------|------|------|
| **信息清晰度** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Bento 协调** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **交互质感** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **响应式友好** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **高级感** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **易改迭代** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### 实施步骤

#### 步骤 1: 启用方案 B (默认已启用)
在 `Contest.vue` 的 `<template>` 中，确保 `summary-content--scheme-b` 是可见的：

```vue
<!-- 方案 B：纵向 Info Stack (default) -->
<div class="summary-content summary-content--scheme-b">
  <div class="summary-main">
    <div class="summary-value">{{ visibleContests.length }}</div>
    <div class="summary-label">当前筛选可见</div>
  </div>
  <div class="summary-stack">
    <div class="stack-item">
      <span class="stack-label">收藏</span>
      <span class="stack-value">{{ favoriteVisibleCount }} 场</span>
    </div>
    <div class="stack-item">
      <span class="stack-label">进行中</span>
      <span class="stack-value">{{ runningContestCount }} 场</span>
    </div>
    <div class="stack-item">
      <span class="stack-label">时间</span>
      <span class="stack-value">{{ dayRangeText }}</span>
    </div>
  </div>
</div>
```

#### 步骤 2: 切换至其他方案 (可选)
在 `<template>` 中隐藏方案 B，启用方案 A 或 C：

```vue
<!-- 隐藏方案 B 的 display: block 规则 -->
.summary-content--scheme-b {
  display: none;  /* 隐藏 */
}

<!-- 启用方案 A 或 C -->
.summary-content--scheme-a {
  display: block;  /* 显示方案 A */
}
```

#### 步骤 3: 动态切换 (高级用法)
添加一个用户偏好设置以允许动态切换：

```typescript
// 在 stores/ui.ts 中
export const useUiStore = defineStore('ui', () => {
  const heroCardScheme = ref<'a' | 'b' | 'c'>('b');  // 默认方案 B
  
  const toggleHeroCardScheme = (scheme: 'a' | 'b' | 'c') => {
    heroCardScheme.value = scheme;
  };

  return { heroCardScheme, toggleHeroCardScheme };
});
```

```vue
<!-- 在 Contest.vue template 中动态切换 -->
<div :class="{
  'summary-content--scheme-a': uiStore.heroCardScheme === 'a',
  'summary-content--scheme-b': uiStore.heroCardScheme === 'b',
  'summary-content--scheme-c': uiStore.heroCardScheme === 'c',
}">
  <!-- 所有三个方案内容都在这里 -->
</div>
```

---

## 四、完整样式代码库

### Contest.vue 中的三个方案样式

已全部集成在 `<style scoped>` 块中。关键类名：
- `.summary-content--scheme-a`: 微网格方案
- `.summary-content--scheme-b`: 纵向 Info Stack (默认)
- `.summary-content--scheme-c`: 后背景强化

### 核心布局样式

```css
/* 左固定 + 右滚动的两列布局 */
.layout-wrapper {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: var(--space-3);
  padding: var(--space-3);
  background: transparent;
  overflow: hidden;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  flex-shrink: 0;
  width: 340px;
  min-height: 0;
}

.content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* 移动端：纵向堆积 */
@media (max-width: 1024px) {
  .layout-wrapper {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
  }
}

/* 移动端：列表项隐藏 */
@media (max-width: 768px) {
  .day-card .contest-item:nth-child(n+6) {
    display: none;
  }
}
```

---

## 五、测试清单

- [ ] 今天的比赛默认展开
- [ ] 明天的比赛默认展开
- [ ] 后续日期默认折叠，点击"查看全部"展开
- [ ] 历史记录默认折叠，点击"📚 历史记录"展开
- [ ] 左侧汇总卡片固定不动
- [ ] 右侧列表区域可滚动
- [ ] 移动端 (< 768px):
  - [ ] 汇总卡片显示在最上方
  - [ ] 列表纵向堆积
  - [ ] 每个日期卡片仅显示前 5 个比赛
  - [ ] 选择的方案卡片 B 清晰易读
- [ ] 三个方案都能正确显示 (通过改动 CSS 切换)
- [ ] 展开/折叠箭头旋转动画流畅
- [ ] 所有交互响应快速

---

## 六、预期用户体验

### 桌面端 (> 1024px)
1. 打开 Contest 页面
2. 左边固定看到汇总数据（方案 B: 42 场 | 收藏 8 | 进行中 2 | 时间 3/15-5/20）
3. 右边看到"今天"和"明天"的比赛，自动展开
4. 向下滚动看到"后续日期"（默认折叠），点击展开
5. 继续滚动到底部看"📚 历史记录 (5 场)"，点击展开查看
6. 左侧卡片始终可见，提供上下文参考

### 平板/小桌面 (768px-1024px)
1. 汇总卡片显示在最上方
2. 列表区域占据主要空间，可滚动
3. 布局自动调整为纵向堆积

### 移动端 (< 768px)
1. 页面自上而下纵向排列
2. 汇总卡片最上方
3. 每个日期卡片只显示前 5 个比赛 (超过隐藏)
4. 想看全部用户可在"查看全部"打开后查看

