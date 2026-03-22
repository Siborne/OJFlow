# Contest 页面"标签 + 卡片联动"改造

## 一、设计概览

### 核心交互流程

```
┌─────────────────────────────────────────────────┐
│  日期 Tab 栏 (今天 / 明天 / 本周 / 全部)        │
├─────────────────────────────────────────────────┤
│  3 卡网格 (内容随 Tab 切换自动更新)             │
│  ┌──────────────────┐ ┌──────────┐ ┌──────────┐
│  │  比赛总览        │ │ 下一场   │ │ 平台覆盖│
│  │  - 可见数        │ │ (该时段  │ │ (各平台│
│  │  - 收藏数        │ │  第一个) │ │  比赛数)
│  │  - 进行中        │ │          │ │
│  └──────────────────┘ └──────────┘ └──────────┘
└─────────────────────────────────────────────────┘
     ↓ 切换时 200ms 淡入淡出
     ↓ 数字更新时轻微翻转效果
└─────────────────────────────────────────────────┘

下方：完整的日期列表区域
┌─────────────────────────────────────────────────┐
│  今天的比赛 (展开)                              │
│  明天的比赛 (展开)                              │
│  后续日期   (折叠/展开)                         │
│  历史记录   (折叠/展开)                         │
└─────────────────────────────────────────────────┘
```

## 二、Tab 数据分组逻辑

### Tab 类型定义

```typescript
const dateTabs = [
  { id: 'today', label: '今天' },      // 仅当天比赛
  { id: 'tomorrow', label: '明天' },  // 仅明天比赛
  { id: 'thisWeek', label: '本周' },  // 今天 + 后续 6 天
  { id: 'all', label: '全部' }        // 所有筛选后的比赛
];
```

### 状态管理

```typescript
// 当前激活的 Tab
const activeTab = ref<'today' | 'tomorrow' | 'thisWeek' | 'all'>('today');

// Tab 切换函数
const selectTab = (tabId: string) => {
  activeTab.value = tabId as any;
};
```

### 数据过滤计算属性

```typescript
// 根据 Tab 过滤数据的核心逻辑
const filteredContestsByTab = computed(() => {
  const today = new Date(now.value);
  today.setHours(0, 0, 0, 0);

  if (activeTab.value === 'today') {
    // 仅当天
    return visibleContests.value.filter(c => {
      const contestDate = new Date(c.startTimeSeconds * 1000);
      contestDate.setHours(0, 0, 0, 0);
      return contestDate.getTime() === today.getTime();
    });
  } 
  else if (activeTab.value === 'tomorrow') {
    // 仅明天
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return visibleContests.value.filter(c => {
      const contestDate = new Date(c.startTimeSeconds * 1000);
      contestDate.setHours(0, 0, 0, 0);
      return contestDate.getTime() === tomorrow.getTime();
    });
  } 
  else if (activeTab.value === 'thisWeek') {
    // 本周 (7天)
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return visibleContests.value.filter(c => {
      const contestDate = new Date(c.startTimeSeconds * 1000);
      contestDate.setHours(0, 0, 0, 0);
      return contestDate.getTime() >= today.getTime() && 
             contestDate.getTime() < weekEnd.getTime();
    });
  } 
  else {
    // 全部
    return visibleContests.value;
  }
});
```

## 三、3 卡网格联动逻辑

### 卡片 1: 比赛总览

```typescript
// 根据 filteredContestsByTab 计算统计数据

// 1. 可见比赛数
const filteredContestsByTab.length

// 2. 收藏数
const favoriteCountByTab = computed(() => {
  return filteredContestsByTab.value
    .filter(c => store.isFavorite(c.name)).length;
});

// 3. 进行中的比赛数
const runningCountByTab = computed(() => {
  return filteredContestsByTab.value
    .filter(c => getContestState(c) === 'running').length;
});
```

**HTML 结构**:
```vue
<n-card class="summary-card summary-card--overview" :bordered="true">
  <template #header>
    <span>比赛总览</span>
  </template>
  <div class="card-content fade-in">
    <div class="stats-group">
      <div class="stat-item">
        <div class="stat-label">可见</div>
        <div class="stat-value">
          <span class="number-flip">{{ filteredContestsByTab.length }}</span>
        </div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-label">收藏</div>
        <div class="stat-value">
          <span class="number-flip">{{ favoriteCountByTab }}</span>
        </div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-label">进行中</div>
        <div class="stat-value">
          <span class="number-flip">{{ runningCountByTab }}</span>
        </div>
      </div>
    </div>
  </div>
</n-card>
```

### 卡片 2: 下一场

```typescript
// 获取该时段的第一场比赛
const nextContestByTab = computed(() => {
  const next = filteredContestsByTab.value
    .filter(c => c.startTimeSeconds * 1000 > now.value)
    .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)[0];
  return next || null;
});
```

**HTML 结构**:
```vue
<n-card class="summary-card summary-card--next" :bordered="true">
  <template #header>
    <span>下一场</span>
  </template>
  <div class="card-content fade-in">
    <div v-if="nextContestByTab" class="next-contest">
      <div class="next-name">{{ nextContestByTab.name }}</div>
      <div class="next-meta">
        <span>{{ nextContestByTab.platform }}</span>
        <span class="dot">•</span>
        <span>{{ nextContestByTab.startHourMinute }}</span>
      </div>
    </div>
    <div v-else class="next-empty">暂无比赛</div>
  </div>
</n-card>
```

### 卡片 3: 平台覆盖

```typescript
// 计算该时段各平台的比赛数
const activePlatformsWithCount = computed(() => {
  const platformCounts: Record<string, number> = {};
  
  filteredContestsByTab.value.forEach(c => {
    if (!platformCounts[c.platform]) {
      platformCounts[c.platform] = 0;
    }
    platformCounts[c.platform]++;
  });

  return platforms
    .filter(p => store.selectedPlatforms[p] && platformCounts[p])
    .map(p => ({ name: p, count: platformCounts[p] || 0 }));
});
```

**HTML 结构**:
```vue
<n-card class="summary-card summary-card--platforms" :bordered="true">
  <template #header>
    <span>平台覆盖</span>
  </template>
  <div class="card-content fade-in">
    <div class="platform-stats">
      <div v-for="platform in activePlatformsWithCount" 
           :key="platform.name" class="platform-item">
        <span class="platform-name">{{ platform.name }}</span>
        <span class="platform-count">
          <span class="number-flip">{{ platform.count }}</span>
        </span>
      </div>
    </div>
  </div>
</n-card>
```

## 四、动效实现

### 1. 标签栏激活态动效

**特点**: 
- 激活态背景 + 左侧 2px 彩色缘
- 鼠标悬停 hover 效果

**样式代码**:
```css
.tab-item {
  position: relative;
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all var(--motion-base) var(--motion-ease);
}

/* 激活前的左侧缘 */
.tab-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 0;
  background: var(--color-primary);
  border-radius: 999px;
  transition: height var(--motion-base) var(--motion-ease);
}

.tab-item:hover {
  background: rgba(14, 165, 233, 0.08);
  color: var(--color-text);
}

/* 激活态 */
.tab-item--active {
  background: rgba(14, 165, 233, 0.12);
  color: var(--color-primary);
  font-weight: 600;
}

/* 激活态时左侧缘展开 */
.tab-item--active::before {
  height: 20px;  /* 展开到 20px */
}
```

**关键类名**:
- `.tab-item`: 基础样式
- `.tab-item--active`: 激活态 (背景 + 左缘)
- `.tab-item::before`: 左侧 2px 彩色缘 (高度从 0 动画到 20px)

### 2. 卡片内容淡入淡出 (200ms)

**特点**:
- 点击 Tab 时整个卡片内容重新渲染
- 使用 `key` 强制 Vue 重新渲染 (`:key="\`summary-\${activeTab}\`"`)
- `.fade-in` 类在新卡片挂载时自动播放动效

**样式代码**:
```css
.card-content {
  position: relative;
  z-index: 1;
}

.fade-in {
  animation: fade-in 200ms var(--motion-ease) both;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**模板中使用**:
```vue
<!-- 3 卡网格，这个 key 使得 Tab 切换时整个网格重新渲染 -->
<div class="summary-grid" :key="`summary-${activeTab}`">
  
  <!-- 卡片内容使用 fade-in 类 -->
  <n-card class="summary-card summary-card--overview">
    <div class="card-content fade-in">
      <!-- 内容 -->
    </div>
  </n-card>
  
  <!-- 其他卡片... -->
</div>
```

### 3. 数字翻转效果 (轻微)

**特点**:
- 数字更新时有轻微的缩放和位置变化
- 使用 Vue 的 `transition-group` 或 CSS 动画

**样式代码**:
```css
.number-flip {
  display: inline-block;
  transition: all 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* 当数字变化时应用的效果 (可选) */
.stat-value .number-flip {
  will-change: transform;
}
```

**动效触发原理**:
Vue 响应式系统自动检测 `filteredContestsByTab.length` 的变化 → 模板re-render → `.number-flip` 元素的数字文本更新 → CSS transition 平滑过渡

如果想要更明显的"翻转"效果，可以使用数字动画库：
```typescript
import { useTransition } from '@vueuse/core';

const displayCount = ref(0);
const { number: animatedCount } = useTransition(
  () => filteredContestsByTab.value.length,
  {
    duration: 300,
    onFinish: () => {
      displayCount.value = Math.round(animatedCount.value);
    }
  }
);
```

### 4. 无感加载 & 平滑体验

**关键点**:

| 技术点 | 实现 |
|------|------|
| **Tab 切换不阻塞** | 使用 computed 属性，Vue 自动响应式更新 |
| **卡片数据无延迟** | 所有数据都是本地计算，无网络请求 |
| **平滑过渡** | 所有过渡时间 200ms (var(--motion-base)) |
| **减速运动** | 使用 cubic-bezier(0.2, 0.8, 0.2, 1)，前快后慢感觉 |

**样式中的过渡统一**:
```css
/* 所有元素默认过渡时间 */
.tab-item,
.summary-card,
.day-card {
  transition: all var(--motion-base) var(--motion-ease);
  /* 
    var(--motion-base) = 200ms
    var(--motion-ease) = cubic-bezier(0.2, 0.8, 0.2, 1)
  */
}
```

**Reduced Motion 支持** (无障碍):
```css
@media (prefers-reduced-motion: reduce) {
  .tab-item,
  .number-flip,
  .day-card {
    animation: fade-only 140ms ease-out both !important;
    transition-duration: 0.01ms !important;
  }

  .expand-icon.is-expanded {
    transform: none;
  }
}

@keyframes fade-only {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## 五、完整代码片段

### Tab 栏 HTML

```vue
<!-- 日期 Tab 栏 -->
<div class="date-tabs-container">
  <div class="date-tabs">
    <button 
      v-for="tab in dateTabs" 
      :key="tab.id"
      :class="['tab-item', { 'tab-item--active': activeTab === tab.id }]"
      @click="selectTab(tab.id)"
    >
      <span class="tab-label">{{ tab.label }}</span>
      <span class="tab-accent"></span>
    </button>
  </div>
</div>
```

### 3 卡网格 HTML

```vue
<!-- 3 卡网格 (内容随 tab 更新) -->
<div class="summary-grid" :key="`summary-${activeTab}`">
  <!-- 比赛总览 -->
  <n-card class="summary-card summary-card--overview" :bordered="true">
    <template #header><span>比赛总览</span></template>
    <div class="card-content fade-in">
      <div class="stats-group">
        <div class="stat-item">
          <div class="stat-label">可见</div>
          <div class="stat-value">
            <span class="number-flip">{{ filteredContestsByTab.length }}</span>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-label">收藏</div>
          <div class="stat-value">
            <span class="number-flip">{{ favoriteCountByTab }}</span>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <div class="stat-label">进行中</div>
          <div class="stat-value">
            <span class="number-flip">{{ runningCountByTab }}</span>
          </div>
        </div>
      </div>
    </div>
  </n-card>

  <!-- 下一场 -->
  <n-card class="summary-card summary-card--next" :bordered="true">
    <template #header><span>下一场</span></template>
    <div class="card-content fade-in">
      <div v-if="nextContestByTab" class="next-contest">
        <div class="next-name">{{ nextContestByTab.name }}</div>
        <div class="next-meta">
          <span>{{ nextContestByTab.platform }}</span>
          <span class="dot">•</span>
          <span>{{ nextContestByTab.startHourMinute }}</span>
        </div>
      </div>
      <div v-else class="next-empty">暂无比赛</div>
    </div>
  </n-card>

  <!-- 平台覆盖 -->
  <n-card class="summary-card summary-card--platforms" :bordered="true">
    <template #header><span>平台覆盖</span></template>
    <div class="card-content fade-in">
      <div class="platform-stats">
        <div v-for="platform in activePlatformsWithCount" 
             :key="platform.name" class="platform-item">
          <span class="platform-name">{{ platform.name }}</span>
          <span class="platform-count">
            <span class="number-flip">{{ platform.count }}</span>
          </span>
        </div>
      </div>
    </div>
  </n-card>
</div>
```

### 核心 CSS 动效

```css
/* Tab 栏激活态 */
.tab-item {
  position: relative;
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all var(--motion-base) var(--motion-ease);
  outline: none;
}

.tab-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 0;
  background: var(--color-primary);
  border-radius: 999px;
  transition: height var(--motion-base) var(--motion-ease);
}

.tab-item--active {
  background: rgba(14, 165, 233, 0.12);
  color: var(--color-primary);
  font-weight: 600;
}

.tab-item--active::before {
  height: 20px;
}

/* 卡片淡入 */
.fade-in {
  animation: fade-in 200ms var(--motion-ease) both;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 数字翻转 */
.number-flip {
  display: inline-block;
  transition: all 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
```

## 六、用户体验流程

### 场景 1: 点击"明天"标签

1. 用户点击"明天"按钮
2. `activeTab` 变为 `'tomorrow'`
3. Vue 响应式系统触发 computed 重新计算:
   - `filteredContestsByTab` 过滤出明天的比赛
   - `favoriteCountByTab` 计算明天的收藏数
   - `nextContestByTab` 获取明天的第一场比赛
   - `activePlatformsWithCount` 计算明天各平台的比赛数
4. Tab 按钮激活态变化 (背景 + 左缘):
   - `tab-item--active` 类应用
   - `.tab-item::before` 高度从 0 → 20px (200ms)
5. 3 卡网格重新渲染 (因为 `:key` 变化)
6. 卡片内容播放淡入动效 (200ms fade-in)
7. 数字从旧值 → 新值的过渡 (300ms transition)
8. **整个过程用户感受**：平滑的内容切换，无卡顿

### 场景 2: 从"今天"切换到"本周"

- Tab 栏从"今天" → "本周"激活态切换 (200ms)
- 卡片内容：
  - 比赛总览：比赛数可能从 5 → 18
  - 下一场：显示今天的第一个upcoming，还是本周的第一个？
    - *取决于逻辑*: 建议显示本周范围内的下一个 (即使是今日)
  - 平台覆盖：完整统计本周所有平台
- 所有数字动画平滑过渡

## 七、关键指标

| 指标 | 目标 | 实现 |
|-----|------|------|
| **Tab 切换响应时间** | < 50ms | Computed computed 属性，无网络 |
| **卡片更新延迟** | 0ms | 本地数据，响应式计算 |
| **淡入淡出动效** | 200ms | CSS animation: fade-in |
| **数字翻转效果** | 300ms | CSS transition |
| **整体感受** | 无感加载 | 所有操作都是 local compute |

## 八、测试清单

- [ ] 点击"今天" → 只显示当天比赛
- [ ] 点击"明天" → 只显示明天比赛
- [ ] 点击"本周" → 显示 7 天内的比赛
- [ ] 点击"全部" → 显示所有比赛
- [ ] Tab 激活态左缘动效是否流畅
- [ ] 卡片内容淡入淡出是否 200ms
- [ ] 数字更新时是否有平滑过渡
- [ ] 移动端 (< 768px) 标签栏是否自适应
- [ ] 减速运动用户体验是否良好
- [ ] 无障碍模式 (prefers-reduced-motion) 是否正常

---

**完成！** 整个设计遵循"无感加载、平滑体验"的原则，所有 Tab 切换和数据更新都是本地计算，用户可以立即感受到响应反馈。

