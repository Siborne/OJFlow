<template>
  <div class="contest-page">
    <div class="app-bar">
      <h2>近期比赛</h2>
      <div class="actions">
        <div class="hide-date-toggle">
          <span class="toggle-label">隐藏日期</span>
          <n-switch :value="store.hideDate" @update:value="store.toggleHideDate" />
        </div>
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
        <p class="quote">{{ quote }}</p>
        <p class="loading-text">加载比赛…</p>
        <n-spin size="large" />
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="content scrollable" v-else>

      <!-- ===== 标签栏 + 3 卡网格 ===== -->
      <div class="header-section">
        
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

        <!-- 3 卡网格 (内容随 tab 更新) -->
        <div class="summary-grid" :key="`summary-${activeTab}`">
          
          <!-- 比赛总览 -->
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

          <!-- 下一场 -->
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

          <!-- 平台覆盖 -->
          <n-card class="summary-card summary-card--platforms" :bordered="true">
            <template #header>
              <span>平台覆盖</span>
            </template>
            <div class="card-content fade-in">
              <div class="platform-scroll-shell" role="region" aria-label="平台覆盖列表滚动区">
                <div class="platform-stats">
                  <div v-for="platform in activePlatformsWithCount" :key="platform.name" class="platform-item">
                    <span class="platform-name">{{ platform.name }}</span>
                    <span class="platform-count">
                      <span class="number-flip">{{ platform.count }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </n-card>

        </div>

      </div>

      <!-- ===== 日期列表区域 (保留原有结构) ===== -->
      
      <!-- 今天的比赛 -->
      <div v-if="todayContest.length > 0" class="contests-section">
        <div class="day-group day-group--today">
          <n-card :bordered="true" class="day-card" :content-style="{ padding: '0' }">
            <template #header>
              <span class="day-title">今天</span>
            </template>
            <div v-for="(contest, cIndex) in todayContest" :key="cIndex">
              <div v-if="store.selectedPlatforms[contest.platform]" :class="['contest-item', `contest-item--${getContestState(contest)}`]">
                <div class="platform-icon">
                  <img :src="getPlatformImage(contest.platform)" :alt="contest.platform" />
                </div>
                <div class="contest-info" role="button" tabindex="0" @click="openLink(contest)" @keydown.enter.prevent="openLink(contest)" @keydown.space.prevent="openLink(contest)">
                  <div class="contest-name">{{ contest.name }}</div>
                  <div class="contest-meta">
                    <span class="contest-time">{{ contest.startHourMinute }} - {{ contest.endHourMinute }}</span>
                    <n-tag size="small" :type="getContestStateType(contest)">{{ getContestStateLabel(contest) }}</n-tag>
                    <n-tag v-if="getCountdown(contest)" type="success" size="small" class="countdown-tag">
                      {{ getCountdown(contest) }}
                    </n-tag>
                  </div>
                </div>
                <div class="contest-action">
                  <n-button size="small" type="primary" ghost @click.stop="openLink(contest)">参赛</n-button>
                  <n-button quaternary circle @click.stop="store.toggleFavorite(contest)">
                    <template #icon>
                      <n-icon :size="24" :color="store.isFavorite(contest.name) ? 'var(--color-warning)' : undefined">
                        <star-outlined v-if="!store.isFavorite(contest.name)" />
                        <star-filled v-else />
                      </n-icon>
                    </template>
                  </n-button>
                </div>
              </div>
              <n-divider v-if="cIndex < todayContest.length - 1 && store.selectedPlatforms[todayContest[cIndex+1]?.platform]" />
            </div>
          </n-card>
        </div>
      </div>

      <!-- 明天的比赛 -->
      <div v-if="tomorrowContest.length > 0" class="contests-section">
        <div class="day-group day-group--tomorrow">
          <n-card :bordered="true" class="day-card" :content-style="{ padding: '0' }">
            <template #header>
              <span class="day-title">明天</span>
            </template>
            <div v-for="(contest, cIndex) in tomorrowContest" :key="cIndex">
              <div v-if="store.selectedPlatforms[contest.platform]" :class="['contest-item', `contest-item--${getContestState(contest)}`]">
                <div class="platform-icon">
                  <img :src="getPlatformImage(contest.platform)" :alt="contest.platform" />
                </div>
                <div class="contest-info" role="button" tabindex="0" @click="openLink(contest)" @keydown.enter.prevent="openLink(contest)" @keydown.space.prevent="openLink(contest)">
                  <div class="contest-name">{{ contest.name }}</div>
                  <div class="contest-meta">
                    <span class="contest-time">{{ contest.startHourMinute }} - {{ contest.endHourMinute }}</span>
                    <n-tag size="small" :type="getContestStateType(contest)">{{ getContestStateLabel(contest) }}</n-tag>
                    <n-tag v-if="getCountdown(contest)" type="success" size="small" class="countdown-tag">
                      {{ getCountdown(contest) }}
                    </n-tag>
                  </div>
                </div>
                <div class="contest-action">
                  <n-button size="small" type="primary" ghost @click.stop="openLink(contest)">参赛</n-button>
                  <n-button quaternary circle @click.stop="store.toggleFavorite(contest)">
                    <template #icon>
                      <n-icon :size="24" :color="store.isFavorite(contest.name) ? 'var(--color-warning)' : undefined">
                        <star-outlined v-if="!store.isFavorite(contest.name)" />
                        <star-filled v-else />
                      </n-icon>
                    </template>
                  </n-button>
                </div>
              </div>
              <n-divider v-if="cIndex < tomorrowContest.length - 1 && store.selectedPlatforms[tomorrowContest[cIndex+1]?.platform]" />
            </div>
          </n-card>
        </div>
      </div>

      <!-- 后续日期的比赛 -->
      <div v-for="(dayList, dayIdx) in futureContests" :key="`future-${dayIdx}`" class="contests-section">
        <div class="day-group day-group--future">
          <div class="day-group-header">
            <n-card :bordered="true" class="day-card day-card--collapsible" :content-style="{ padding: '0' }">
              <template #header>
                <div class="day-header-content" @click="toggleFutureDay(dayIdx)">
                  <span class="day-title">{{ getFutureDayName(dayIdx) }}</span>
                  <span class="day-count">({{ getVisibleContestCount(dayList) }} 场)</span>
                  <n-icon class="expand-icon" :class="{ 'is-expanded': expandedFutureDays.has(dayIdx) }">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </n-icon>
                </div>
              </template>
            </n-card>
          </div>

          <n-card :bordered="true" class="day-card day-card--content" v-show="expandedFutureDays.has(dayIdx)" :content-style="{ padding: '0' }">
            <div v-if="getVisibleContestCount(dayList) === 0" class="no-contest">这里没有比赛喵~</div>
            <div v-else>
              <div v-for="(contest, cIndex) in dayList" :key="cIndex">
                <div v-if="store.selectedPlatforms[contest.platform]" :class="['contest-item', `contest-item--${getContestState(contest)}`]">
                  <div class="platform-icon">
                    <img :src="getPlatformImage(contest.platform)" :alt="contest.platform" />
                  </div>
                  <div class="contest-info" role="button" tabindex="0" @click="openLink(contest)" @keydown.enter.prevent="openLink(contest)" @keydown.space.prevent="openLink(contest)">
                    <div class="contest-name">{{ contest.name }}</div>
                    <div class="contest-meta">
                      <span class="contest-time">{{ contest.startHourMinute }} - {{ contest.endHourMinute }}</span>
                      <n-tag size="small" :type="getContestStateType(contest)">{{ getContestStateLabel(contest) }}</n-tag>
                      <n-tag v-if="getCountdown(contest)" type="success" size="small" class="countdown-tag">
                        {{ getCountdown(contest) }}
                      </n-tag>
                    </div>
                  </div>
                  <div class="contest-action">
                    <n-button size="small" type="primary" ghost @click.stop="openLink(contest)">参赛</n-button>
                    <n-button quaternary circle @click.stop="store.toggleFavorite(contest)">
                      <template #icon>
                        <n-icon :size="24" :color="store.isFavorite(contest.name) ? 'var(--color-warning)' : undefined">
                          <star-outlined v-if="!store.isFavorite(contest.name)" />
                          <star-filled v-else />
                        </n-icon>
                      </template>
                    </n-button>
                  </div>
                </div>
                <n-divider v-if="cIndex < dayList.length - 1 && store.selectedPlatforms[dayList[cIndex+1]?.platform]" />
              </div>
            </div>
          </n-card>
        </div>
      </div>

      <!-- 历史比赛 -->
      <div v-if="historicalContests.length > 0" class="contests-section">
        <div class="day-group day-group--history">
          <div class="day-group-header">
            <n-card :bordered="true" class="day-card day-card--collapsible day-card--history" :content-style="{ padding: '0' }">
              <template #header>
                <div class="day-header-content" @click="toggleHistorySection">
                  <span class="day-title day-title--history">📚 历史记录</span>
                  <span class="day-count">({{ historicalContests.length }} 场)</span>
                  <n-icon class="expand-icon" :class="{ 'is-expanded': showHistory }">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </n-icon>
                </div>
              </template>
            </n-card>
          </div>

          <n-card :bordered="true" class="day-card day-card--content day-card--history-content" v-show="showHistory" :content-style="{ padding: '0' }">
            <div v-for="(contest, cIndex) in historicalContests" :key="cIndex">
              <div v-if="store.selectedPlatforms[contest.platform]" :class="['contest-item', `contest-item--${getContestState(contest)}`]">
                <div class="platform-icon">
                  <img :src="getPlatformImage(contest.platform)" :alt="contest.platform" />
                </div>
                <div class="contest-info" role="button" tabindex="0" @click="openLink(contest)" @keydown.enter.prevent="openLink(contest)" @keydown.space.prevent="openLink(contest)">
                  <div class="contest-name">{{ contest.name }}</div>
                  <div class="contest-meta">
                    <span class="contest-time">{{ contest.startHourMinute }} - {{ contest.endHourMinute }}</span>
                    <n-tag size="small" :type="getContestStateType(contest)">{{ getContestStateLabel(contest) }}</n-tag>
                  </div>
                </div>
                <div class="contest-action">
                  <n-button size="small" type="primary" ghost @click.stop="openLink(contest)">参赛</n-button>
                  <n-button quaternary circle @click.stop="store.toggleFavorite(contest)">
                    <template #icon>
                      <n-icon :size="24" :color="store.isFavorite(contest.name) ? 'var(--color-warning)' : undefined">
                        <star-outlined v-if="!store.isFavorite(contest.name)" />
                        <star-filled v-else />
                      </n-icon>
                    </template>
                  </n-button>
                </div>
              </div>
              <n-divider v-if="cIndex < historicalContests.length - 1 && store.selectedPlatforms[historicalContests[cIndex+1]?.platform]" />
            </div>
          </n-card>
        </div>
      </div>

      <div v-if="visibleContests.length === 0" class="no-data">
        <n-empty description="暂无比赛" />
      </div>

    </div>

    <!-- 筛选弹窗 -->
    <n-modal v-model:show="showFilter" preset="dialog" title="筛选平台">
      <div class="filter-content">
        <div class="filter-item">
          <span>显示无赛程日</span>
          <n-switch v-model:value="store.showEmptyDay" @update:value="store.toggleShowEmptyDay" />
        </div>
        <n-divider />
        <div v-for="platform in platforms" :key="platform" class="filter-item">
          <n-checkbox 
            :checked="store.selectedPlatforms[platform]" 
            @update:checked="(v) => store.togglePlatform(platform, v)"
          >
            {{ platform }}
          </n-checkbox>
        </div>
      </div>
    </n-modal>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useContestStore } from '../stores/contest';
import { ContestUtils } from '../utils/contest_utils';
import { ContestService } from '../services/contest';
import { Contest } from '../types';
import { NButton, NIcon, NSpin, NCard, NDivider, NModal, NSwitch, NCheckbox, NTag, NEmpty, useDialog } from 'naive-ui';
import { FilterAltOutlined, SearchOutlined, StarOutlined, StarFilled } from '@vicons/material';
import ActionTooltipButton from '../components/ActionTooltipButton.vue';

const images: Record<string, string> = {
  'Codeforces': new URL('../assets/platforms/Codeforces.jpg', import.meta.url).href,
  'AtCoder': new URL('../assets/platforms/AtCoder.jpg', import.meta.url).href,
  '洛谷': new URL('../assets/platforms/Luogu.jpg', import.meta.url).href,
  '蓝桥云课': new URL('../assets/platforms/Lanqiao.jpg', import.meta.url).href,
  '力扣': new URL('../assets/platforms/LeetCode.jpg', import.meta.url).href,
  '牛客': new URL('../assets/platforms/Nowcoder.jpg', import.meta.url).href,
  'Other': new URL('../assets/platforms/Other.jpg', import.meta.url).href,
};

const store = useContestStore();
const dialog = useDialog();
const showFilter = ref(false);
const quote = ref('风落吴江雪，纷纷入酒杯。');
const platforms = ['Codeforces', 'AtCoder', '洛谷', '蓝桥云课', '力扣', '牛客'];
const now = ref(Date.now());
let timer: any;

// ===== Tab 管理 =====
const dateTabs = [
  { id: 'today', label: '今天' },
  { id: 'tomorrow', label: '明天' },
  { id: 'thisWeek', label: '本周' },
  { id: 'all', label: '全部' }
];

const activeTab = ref<'today' | 'tomorrow' | 'thisWeek' | 'all'>('today');

const selectTab = (tabId: string) => {
  activeTab.value = tabId as any;
};

// ===== 折叠状态 =====
const expandedFutureDays = ref<Set<number>>(new Set());
const showHistory = ref(false);

const getPlatformImage = (platform: string) => {
  return images[platform] || images['Other'];
};

const getDayName = (index: number) => {
  return ContestUtils.getDayName(index);
};

// ===== 数据过滤 =====
const visibleContests = computed(() => {
  return store.timeContests.flat().filter(c => store.selectedPlatforms[c.platform]);
});

// 根据 Tab 过滤比赛
const filteredContestsByTab = computed(() => {
  const today = new Date(now.value);
  today.setHours(0, 0, 0, 0);

  if (activeTab.value === 'today') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return visibleContests.value.filter(c => {
      const contestDate = new Date(c.startTimeSeconds * 1000);
      contestDate.setHours(0, 0, 0, 0);
      return contestDate.getTime() === today.getTime();
    });
  } else if (activeTab.value === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);
    return visibleContests.value.filter(c => {
      const contestDate = new Date(c.startTimeSeconds * 1000);
      contestDate.setHours(0, 0, 0, 0);
      return contestDate.getTime() === tomorrow.getTime();
    });
  } else if (activeTab.value === 'thisWeek') {
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return visibleContests.value.filter(c => {
      const contestDate = new Date(c.startTimeSeconds * 1000);
      contestDate.setHours(0, 0, 0, 0);
      return contestDate.getTime() >= today.getTime() && contestDate.getTime() < weekEnd.getTime();
    });
  } else {
    return visibleContests.value;
  }
});

// 比赛总览卡片数据
const favoriteCountByTab = computed(() => {
  return filteredContestsByTab.value.filter(c => store.isFavorite(c.name)).length;
});

const runningCountByTab = computed(() => {
  return filteredContestsByTab.value.filter(c => getContestState(c) === 'running').length;
});

// 下一场比赛
const nextContestByTab = computed(() => {
  const next = filteredContestsByTab.value
    .filter(c => c.startTimeSeconds * 1000 > now.value)
    .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)[0];
  return next || null;
});

// 平台覆盖统计
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

const activePlatforms = computed(() => {
  return platforms.filter(p => store.selectedPlatforms[p]);
});

// ===== 日期相关 =====
const todayContest = computed(() => {
  const today = new Date(now.value);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return visibleContests.value.filter(c => {
    const contestDate = new Date(c.startTimeSeconds * 1000);
    contestDate.setHours(0, 0, 0, 0);
    return contestDate.getTime() === today.getTime();
  });
});

const tomorrowContest = computed(() => {
  const today = new Date(now.value);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  return visibleContests.value.filter(c => {
    const contestDate = new Date(c.startTimeSeconds * 1000);
    contestDate.setHours(0, 0, 0, 0);
    return contestDate.getTime() === tomorrow.getTime();
  });
});

const futureContests = computed(() => {
  const today = new Date(now.value);
  today.setHours(0, 0, 0, 0);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const future: Contest[] = visibleContests.value.filter(c => {
    const contestDate = new Date(c.startTimeSeconds * 1000);
    contestDate.setHours(0, 0, 0, 0);
    return contestDate.getTime() >= dayAfter.getTime();
  });

  const grouped: Contest[][] = [];
  let currentDay = new Date(dayAfter);
  
  for (let i = 0; i < 30; i++) {
    const dayStart = new Date(currentDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const dayContests = future.filter(c => {
      const contestDate = new Date(c.startTimeSeconds * 1000);
      return contestDate.getTime() >= dayStart.getTime() && contestDate.getTime() < dayEnd.getTime();
    });

    if (dayContests.length > 0) {
      grouped.push(dayContests);
    }

    currentDay.setDate(currentDay.getDate() + 1);
  }

  return grouped;
});

const historicalContests = computed(() => {
  const today = new Date(now.value);
  today.setHours(0, 0, 0, 0);

  return visibleContests.value.filter(c => {
    const contestDate = new Date(c.startTimeSeconds * 1000);
    contestDate.setHours(0, 0, 0, 0);
    return contestDate.getTime() < today.getTime();
  });
});

type ContestState = 'upcoming' | 'running' | 'ended';

const getContestState = (contest: Contest): ContestState => {
  const start = contest.startTimeSeconds * 1000;
  const end = start + contest.durationSeconds * 1000;
  if (now.value < start) return 'upcoming';
  if (now.value >= start && now.value <= end) return 'running';
  return 'ended';
};

const getContestStateLabel = (contest: Contest) => {
  const state = getContestState(contest);
  if (state === 'upcoming') return '即将开始';
  if (state === 'running') return '进行中';
  return '已结束';
};

const getContestStateType = (contest: Contest) => {
  const state = getContestState(contest);
  if (state === 'upcoming') return 'info';
  if (state === 'running') return 'success';
  return 'default';
};

const getCountdown = (contest: Contest) => {
  if (!contest.startTimeSeconds) return null;
  const diff = contest.startTimeSeconds * 1000 - now.value;
  if (diff <= 0) return null;
  if (diff > 24 * 60 * 60 * 1000) return null;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}小时${minutes}分后`;
};

const getFutureDayName = (index: number) => {
  if (futureContests.value.length === 0) return '';
  const dayContest = futureContests.value[index];
  if (dayContest.length === 0) return '';
  
  const contestDate = new Date(dayContest[0].startTimeSeconds * 1000);
  const today = new Date(now.value);
  today.setHours(0, 0, 0, 0);
  
  const days = Math.floor((contestDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const monthDay = `${contestDate.getMonth() + 1}/${contestDate.getDate()}`;
  
  if (days === 2) return `后天 ${monthDay}`;
  if (days === 3) return `${monthDay}`;
  
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${monthDay} ${weekDays[contestDate.getDay()]}`;
};

const getVisibleContestCount = (dayList: Contest[]) => {
  return dayList.filter(c => store.selectedPlatforms[c.platform]).length;
};

const toggleFutureDay = (index: number) => {
  if (expandedFutureDays.value.has(index)) {
    expandedFutureDays.value.delete(index);
  } else {
    expandedFutureDays.value.add(index);
  }
  expandedFutureDays.value = new Set(expandedFutureDays.value);
};

const toggleHistorySection = () => {
  showHistory.value = !showHistory.value;
};

const refresh = () => {
  store.fetchContests();
};

const openLink = (contest: Contest) => {
  if (!contest.link) return;
  
  dialog.info({
    title: '确认访问？',
    content: `即将访问: ${contest.name}`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      ContestService.openUrl(contest.link!);
    }
  });
};

onMounted(() => {
  if (store.contests.length === 0) {
    refresh();
  }
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

.hide-date-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid var(--color-border);
}

.toggle-label {
  font-size: 13px;
  color: var(--color-text-soft);
  white-space: nowrap;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.quote {
  font-size: 16px;
  color: var(--color-text-muted);
  margin-bottom: var(--space-4);
  font-weight: 500;
}

.loading-text {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 16px;
  background: linear-gradient(90deg, var(--contest-loading-gradient-start), var(--contest-loading-gradient-end));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
}

/* ===== 标签栏 ===== */
.header-section {
  margin-bottom: var(--space-4);
}

.date-tabs-container {
  margin-bottom: var(--space-3);
}

.date-tabs {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}

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

.tab-item:hover {
  background: rgba(14, 165, 233, 0.08);
  color: var(--color-text);
}

.tab-item--active {
  background: rgba(14, 165, 233, 0.12);
  color: var(--color-primary);
  font-weight: 600;
}

.tab-item--active::before {
  height: 20px;
}

.tab-label {
  position: relative;
  z-index: 1;
}

.tab-accent {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  pointer-events: none;
}

/* ===== 3 卡网格 ===== */
.summary-grid {
  --summary-card-height: 272px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-3);
  align-items: stretch;
}

.summary-card {
  border: 1px solid var(--card-border) !important;
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  position: relative;
  overflow: hidden;
  height: var(--summary-card-height);
  min-height: var(--summary-card-height);
  display: flex;
  flex-direction: column;
}

.summary-card :deep(.n-card-header) {
  flex-shrink: 0;
}

.summary-card :deep(.n-card__content) {
  flex: 1;
  min-height: 0;
}

.summary-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(130deg, rgba(14, 165, 233, 0.12), rgba(52, 211, 153, 0.03) 42%, transparent 72%);
}

.card-content {
  position: relative;
  z-index: 1;
  height: 100%;
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

/* 统计组 */
.stats-group {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: var(--space-2);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 6px;
  font-weight: 500;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: var(--color-border);
  opacity: 0.5;
}

/* 数字翻转效果 */
.number-flip {
  display: inline-block;
  transition: all 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* 下一场比赛 */
.next-contest {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.next-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.next-meta {
  font-size: 13px;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  opacity: 0.5;
}

.next-empty {
  font-size: 14px;
  color: var(--color-text-muted);
  text-align: center;
  padding: 10px 0;
}

/* 平台统计 */
.platform-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-card--platforms .card-content {
  min-height: 0;
}

.platform-scroll-shell {
  --scroll-mask-height: 16px;
  position: relative;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-text-muted) 50%, transparent) transparent;
}

.platform-scroll-shell::before,
.platform-scroll-shell::after {
  content: '';
  position: sticky;
  left: 0;
  right: 0;
  display: block;
  height: var(--scroll-mask-height);
  pointer-events: none;
  z-index: 2;
}

.platform-scroll-shell::before {
  top: 0;
  margin-bottom: calc(var(--scroll-mask-height) * -1);
  background: linear-gradient(to bottom, var(--color-surface) 25%, transparent 100%);
}

.platform-scroll-shell::after {
  bottom: 0;
  margin-top: calc(var(--scroll-mask-height) * -1);
  background: linear-gradient(to top, var(--color-surface) 25%, transparent 100%);
}

.platform-scroll-shell::-webkit-scrollbar {
  width: 6px;
}

.platform-scroll-shell::-webkit-scrollbar-track {
  background: transparent;
}

.platform-scroll-shell::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--color-text-muted) 42%, transparent);
  border-radius: 999px;
  border: 1px solid transparent;
}

.platform-scroll-shell::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(in srgb, var(--color-text-muted) 58%, transparent);
}

.platform-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid rgba(14, 165, 233, 0.08);
  transition: all var(--motion-base) var(--motion-ease);
}

.platform-item:last-child {
  border-bottom: none;
}

.platform-item:hover {
  background: rgba(14, 165, 233, 0.04);
  padding: 8px 6px;
  border-radius: var(--radius-sm);
}

.platform-name {
  color: var(--color-text);
  font-weight: 500;
}

.platform-count {
  color: var(--color-primary);
  font-weight: 600;
}

/* ===== 日期列表区域 ===== */
.contests-section {
  margin-bottom: var(--space-3);
}

.day-group {
  margin-bottom: var(--space-3);
}

.day-group-header {
  margin-bottom: var(--space-2);
}

.day-card {
  border: 1px solid var(--card-border) !important;
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: transform var(--motion-base) var(--motion-ease), box-shadow var(--motion-base) var(--motion-ease);
}

.day-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  padding: 1px;
  background: linear-gradient(180deg, rgba(14, 165, 233, 0.14), rgba(52, 211, 153, 0.08));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.day-card:hover:not(.day-card--collapsible) {
  transform: translateY(-2px);
  box-shadow: var(--card-shadow-hover);
}

.day-card--collapsible .day-header-content {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  user-select: none;
  padding: 4px;
  margin: -4px;
  border-radius: var(--radius-sm);
  transition: all var(--motion-base) var(--motion-ease);
}

.day-card--collapsible .day-header-content:hover {
  background: rgba(14, 165, 233, 0.08);
}

.expand-icon {
  width: 18px;
  height: 18px;
  margin-left: auto;
  color: var(--color-text-muted);
  transition: transform var(--motion-base) var(--motion-ease);
  flex-shrink: 0;
}

.expand-icon.is-expanded {
  transform: rotate(180deg);
}

.day-title {
  font-size: 15px;
  font-weight: 620;
  color: var(--color-text);
}

.day-title--history {
  color: var(--color-text-soft);
}

.day-count {
  font-size: 13px;
  color: var(--color-text-muted);
}

.no-contest {
  padding: 20px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-muted);
}

/* ===== 比赛项 ===== */
.contest-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  position: relative;
}

.contest-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.45);
}

.contest-item--upcoming::before {
  background: rgba(14, 165, 233, 0.7);
}

.contest-item--running::before {
  background: rgba(52, 211, 153, 0.78);
}

.contest-item--ended::before {
  background: rgba(148, 163, 184, 0.62);
}

.platform-icon img {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.contest-info {
  flex: 1;
  margin-left: 14px;
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.contest-info:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.contest-name {
  font-size: 14px;
  font-weight: 610;
  margin-bottom: 4px;
  color: var(--color-text);
}

.contest-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.contest-time {
  font-size: 12px;
  color: var(--color-text-muted);
}

.contest-action {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* ===== 通用 ===== */
.filter-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: var(--space-4);
}

.day-card :deep(.n-card__content),
.day-card :deep(.n-card__header) {
  background: transparent;
}

.day-card :deep(.n-card-header__main) {
  color: var(--color-text-soft);
}

.day-card :deep(.n-divider) {
  margin: 0;
  background-color: var(--card-divider);
}

.day-card :deep(.n-tag) {
  border-radius: 999px;
}

.day-card :deep(.n-button.n-button--primary-type.n-button--ghost) {
  border-color: rgba(14, 165, 233, 0.28);
  color: var(--color-primary);
}

.day-card :deep(.n-button.n-button--primary-type.n-button--ghost:hover) {
  border-color: rgba(14, 165, 233, 0.42);
  background-color: rgba(14, 165, 233, 0.08);
}

@media (max-width: 1024px) {
  .summary-grid {
    --summary-card-height: 252px;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
}

@media (max-width: 768px) {
  .app-bar {
    padding: 0 12px;
  }

  .app-bar h2 {
    font-size: 16px;
  }

  .hide-date-toggle {
    display: none;
  }

  .content {
    padding: var(--space-2);
  }

  .summary-grid {
    --summary-card-height: 224px;
    grid-template-columns: 1fr;
  }

  .date-tabs {
    gap: var(--space-1);
  }

  .tab-item {
    padding: 6px 12px;
    font-size: 13px;
  }

  .contest-item {
    padding: 12px;
  }

  .contest-name {
    font-size: 13px;
  }

  .stat-value {
    font-size: 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tab-item,
  .tab-item--active,
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
</style>
