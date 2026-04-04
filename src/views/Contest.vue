<template>
  <div class="contest-page">
    <div class="app-bar">
      <h2>近期比赛</h2>
      <div class="actions">
        <action-tooltip-button quaternary circle i18n-key="tooltip.filter" @click="showFilter = true">
          <template #icon>
            <n-icon :size="28"><filter-alt-outlined /></n-icon>
          </template>
        </action-tooltip-button>
        <action-tooltip-button quaternary circle i18n-key="tooltip.refresh" @click="refresh">
          <template #icon>
            <n-icon :size="28"><search-outlined /></n-icon>
          </template>
        </action-tooltip-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div class="content" v-if="store.loading">
      <div class="loading-container">
        <skeleton-card :rows="3" />
        <skeleton-card :rows="2" />
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="content scrollable" v-else>
      <div class="header-section">
        <contest-date-tabs v-model="activeTab" />
        <contest-summary-grid
          :key="`summary-${activeTab}`"
          :visible-count="filteredContestsByTab.length"
          :favorite-count="favoriteCountByTab"
          :running-count="runningCountByTab"
          :next-contest="nextContestByTab"
          :platforms-with-count="activePlatformsWithCount"
        />
      </div>

      <!-- 今天的比赛 -->
      <contest-day-group
        v-if="todayContest.length > 0"
        title="今天"
        variant="today"
        :contests="todayContest"
        :now="now"
        :selected-platforms="store.selectedPlatforms"
        :is-favorite="store.isFavorite"
        :get-platform-image="getPlatformImage"
        @open-contest="openLink"
        @toggle-favorite="store.toggleFavorite"
      />

      <!-- 明天的比赛 -->
      <contest-day-group
        v-if="tomorrowContest.length > 0"
        title="明天"
        variant="tomorrow"
        :contests="tomorrowContest"
        :now="now"
        :selected-platforms="store.selectedPlatforms"
        :is-favorite="store.isFavorite"
        :get-platform-image="getPlatformImage"
        @open-contest="openLink"
        @toggle-favorite="store.toggleFavorite"
      />

      <!-- 后续日期 -->
      <contest-day-group
        v-for="(dayList, dayIdx) in futureContests"
        :key="`future-${dayIdx}`"
        :title="getFutureDayName(dayIdx)"
        variant="future"
        collapsible
        :expanded="expandedFutureDays.has(dayIdx)"
        :contests="dayList"
        :now="now"
        :selected-platforms="store.selectedPlatforms"
        :is-favorite="store.isFavorite"
        :get-platform-image="getPlatformImage"
        @toggle="toggleFutureDay(dayIdx)"
        @open-contest="openLink"
        @toggle-favorite="store.toggleFavorite"
      />

      <!-- 历史比赛 -->
      <contest-day-group
        v-if="historicalContests.length > 0"
        title="📚 历史记录"
        variant="history"
        collapsible
        :expanded="showHistory"
        :contests="historicalContests"
        :now="now"
        :selected-platforms="store.selectedPlatforms"
        :is-favorite="store.isFavorite"
        :get-platform-image="getPlatformImage"
        @toggle="showHistory = !showHistory"
        @open-contest="openLink"
        @toggle-favorite="store.toggleFavorite"
      />

      <div v-if="visibleContests.length === 0" class="no-data">
        <n-empty description="暂无比赛" />
      </div>
    </div>

    <!-- 筛选弹窗 -->
    <contest-filter-modal
      v-model:show="showFilter"
      :show-empty-day="store.showEmptyDay"
      :selected-platforms="store.selectedPlatforms"
      :platforms="platforms"
      @update:show-empty-day="store.toggleShowEmptyDay"
      @toggle-platform="store.togglePlatform"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useContestStore } from '../stores/contest';
import { ContestService } from '../services/contest';
import type { Contest } from '../types';
import { NIcon, NEmpty, useDialog } from 'naive-ui';
import { FilterAltOutlined, SearchOutlined } from '@vicons/material';
import ActionTooltipButton from '../components/ActionTooltipButton.vue';
import ContestDateTabs from '../components/contest/ContestDateTabs.vue';
import ContestSummaryGrid from '../components/contest/ContestSummaryGrid.vue';
import ContestDayGroup from '../components/contest/ContestDayGroup.vue';
import ContestFilterModal from '../components/contest/ContestFilterModal.vue';
import SkeletonCard from '../components/contest/SkeletonCard.vue';

const images: Record<string, string> = {
  Codeforces: new URL('../assets/platforms/Codeforces.jpg', import.meta.url).href,
  AtCoder: new URL('../assets/platforms/AtCoder.jpg', import.meta.url).href,
  '\u6d1b\u8c37': new URL('../assets/platforms/Luogu.jpg', import.meta.url).href,
  '\u84dd\u6865\u4e91\u8bfe': new URL('../assets/platforms/Lanqiao.jpg', import.meta.url).href,
  '\u529b\u6263': new URL('../assets/platforms/LeetCode.jpg', import.meta.url).href,
  '\u725b\u5ba2': new URL('../assets/platforms/Nowcoder.jpg', import.meta.url).href,
  Other: new URL('../assets/platforms/Other.jpg', import.meta.url).href,
};

const store = useContestStore();
const dialog = useDialog();
const showFilter = ref(false);
const platforms = ['Codeforces', 'AtCoder', '\u6d1b\u8c37', '\u84dd\u6865\u4e91\u8bfe', '\u529b\u6263', '\u725b\u5ba2'];
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval>;

// ===== Tab =====
const activeTab = ref<string>('today');

// ===== 折叠状态 =====
const expandedFutureDays = ref<Set<number>>(new Set());
const showHistory = ref(false);

const getPlatformImage = (platform: string) => images[platform] || images.Other;

// ===== 数据过滤 =====
const visibleContests = computed(() =>
  store.timeContests.flat().filter((c) => store.selectedPlatforms[c.platform]),
);

const filteredContestsByTab = computed(() => {
  const today = new Date(now.value);
  today.setHours(0, 0, 0, 0);

  if (activeTab.value === 'today') {
    return visibleContests.value.filter((c) => {
      const d = new Date(c.startTimeSeconds * 1000);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
  } else if (activeTab.value === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return visibleContests.value.filter((c) => {
      const d = new Date(c.startTimeSeconds * 1000);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === tomorrow.getTime();
    });
  } else if (activeTab.value === 'thisWeek') {
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return visibleContests.value.filter((c) => {
      const d = new Date(c.startTimeSeconds * 1000);
      d.setHours(0, 0, 0, 0);
      return d.getTime() >= today.getTime() && d.getTime() < weekEnd.getTime();
    });
  }
  return visibleContests.value;
});

const favoriteCountByTab = computed(() =>
  filteredContestsByTab.value.filter((c) => store.isFavorite(c.name)).length,
);

const runningCountByTab = computed(() =>
  filteredContestsByTab.value.filter((c) => {
    const start = c.startTimeSeconds * 1000;
    const end = start + c.durationSeconds * 1000;
    return now.value >= start && now.value <= end;
  }).length,
);

const nextContestByTab = computed(() => {
  const next = filteredContestsByTab.value
    .filter((c) => c.startTimeSeconds * 1000 > now.value)
    .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)[0];
  return next || null;
});

const activePlatformsWithCount = computed(() => {
  const counts: Record<string, number> = {};
  filteredContestsByTab.value.forEach((c) => {
    counts[c.platform] = (counts[c.platform] || 0) + 1;
  });
  return platforms
    .filter((p) => store.selectedPlatforms[p] && counts[p])
    .map((p) => ({ name: p, count: counts[p] || 0 }));
});

// ===== 日期相关 =====
const todayContest = computed(() => {
  const today = new Date(now.value);
  today.setHours(0, 0, 0, 0);
  return visibleContests.value.filter((c) => {
    const d = new Date(c.startTimeSeconds * 1000);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
});

const tomorrowContest = computed(() => {
  const today = new Date(now.value);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return visibleContests.value.filter((c) => {
    const d = new Date(c.startTimeSeconds * 1000);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === tomorrow.getTime();
  });
});

const futureContests = computed(() => {
  const today = new Date(now.value);
  today.setHours(0, 0, 0, 0);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const future = visibleContests.value.filter((c) => {
    const d = new Date(c.startTimeSeconds * 1000);
    d.setHours(0, 0, 0, 0);
    return d.getTime() >= dayAfter.getTime();
  });

  const grouped: Contest[][] = [];
  const currentDay = new Date(dayAfter);

  for (let i = 0; i < 30; i++) {
    const dayStart = new Date(currentDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayContests = future.filter((c) => {
      const cd = new Date(c.startTimeSeconds * 1000);
      return cd.getTime() >= dayStart.getTime() && cd.getTime() < dayEnd.getTime();
    });

    if (dayContests.length > 0) grouped.push(dayContests);
    currentDay.setDate(currentDay.getDate() + 1);
  }

  return grouped;
});

const historicalContests = computed(() => {
  const today = new Date(now.value);
  today.setHours(0, 0, 0, 0);
  return visibleContests.value.filter((c) => {
    const d = new Date(c.startTimeSeconds * 1000);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  });
});

const getFutureDayName = (index: number) => {
  if (!futureContests.value[index]?.length) return '';
  const contestDate = new Date(futureContests.value[index][0].startTimeSeconds * 1000);
  const today = new Date(now.value);
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((contestDate.getTime() - today.getTime()) / 86400000);
  const md = `${contestDate.getMonth() + 1}/${contestDate.getDate()}`;
  if (days === 2) return `\u540e\u5929 ${md}`;
  if (days === 3) return md;
  const weekDays = ['\u5468\u65e5', '\u5468\u4e00', '\u5468\u4e8c', '\u5468\u4e09', '\u5468\u56db', '\u5468\u4e94', '\u5468\u516d'];
  return `${md} ${weekDays[contestDate.getDay()]}`;
};

const toggleFutureDay = (index: number) => {
  if (expandedFutureDays.value.has(index)) {
    expandedFutureDays.value.delete(index);
  } else {
    expandedFutureDays.value.add(index);
  }
  expandedFutureDays.value = new Set(expandedFutureDays.value);
};

const refresh = () => store.fetchContests();

const openLink = (contest: Contest) => {
  if (!contest.link) return;
  dialog.info({
    title: '\u786e\u8ba4\u8bbf\u95ee\uff1f',
    content: `\u5373\u5c06\u8bbf\u95ee: ${contest.name}`,
    positiveText: '\u786e\u5b9a',
    negativeText: '\u53d6\u6d88',
    onPositiveClick: () => {
      ContestService.openUrl(contest.link!);
    },
  });
};

onMounted(() => {
  if (store.contests.length === 0) refresh();
  timer = setInterval(() => {
    now.value = Date.now();
  }, 60000);
});

onUnmounted(() => {
  clearInterval(timer);
});
</script>

<style scoped>
.contest-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
}

.app-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 var(--space-4);
  height: 64px;
  background: var(--color-surface-muted);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
  flex-shrink: 0;
}

.app-bar h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: 0.01em;
}

.actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
}

.loading-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-4);
}

.header-section {
  margin-bottom: var(--space-4);
}

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: var(--space-4);
}

@media (max-width: 768px) {
  .app-bar {
    padding: 0 12px;
  }

  .app-bar h2 {
    font-size: 16px;
  }

  .content {
    padding: var(--space-2);
  }
}
</style>
