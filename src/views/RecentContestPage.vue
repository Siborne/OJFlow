<template>
  <div class="contest-page">
    <div class="app-bar">
      <h2>近期比赛</h2>
      <div class="actions">
        <n-button quaternary @click="router.push('/question-volume')" style="margin-right: 8px">
          查询解题数量
        </n-button>
        <n-button quaternary circle @click="showFilter = true">
          <template #icon>
            <n-icon :size="28"><filter-alt-outlined /></n-icon>
          </template>
        </n-button>
        <n-button quaternary circle @click="refresh">
          <template #icon>
            <n-icon :size="28"><search-outlined /></n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <div class="content" v-if="store.loading">
      <div class="loading-container">
        <p class="quote">{{ quote }}</p>
        <n-spin size="large" />
      </div>
    </div>

    <div class="content scrollable" v-else>
      <div v-for="(dayList, index) in store.timeContests" :key="index">
        <div v-if="shouldShowDay(dayList)" class="day-group">
          <n-card :bordered="true" class="day-card" :content-style="{ padding: '0' }">
            <template #header>
              <span class="day-title">{{ getDayName(index) }}</span>
            </template>
            
            <div v-if="dayList.length === 0 || !hasVisibleContests(dayList)" class="no-contest">
              这里没有比赛喵~
            </div>

            <div v-else>
              <div v-for="(contest, cIndex) in dayList" :key="cIndex">
                <div v-if="store.selectedPlatforms[contest.platform]" class="contest-item">
                  <div class="platform-icon">
                     <img :src="getPlatformImage(contest.platform)" :alt="contest.platform" />
                  </div>
                  <div class="contest-info" @click="openLink(contest)">
                    <div class="contest-name">{{ contest.name }}</div>
                    <div class="contest-time">{{ contest.startHourMinute }} - {{ contest.endHourMinute }}</div>
                  </div>
                  <div class="contest-action">
                    <n-button quaternary circle @click="store.toggleFavorite(contest)">
                      <template #icon>
                        <n-icon :size="24" :color="store.isFavorite(contest.name) ? '#ffc107' : undefined">
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
    </div>

    <!-- Filter Modal -->
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useContestStore } from '../stores/contest';
import { ContestUtils } from '../utils/contest_utils';
import { ContestService } from '../services/contest';
import { Contest } from '../types';
import { NButton, NIcon, NSpin, NCard, NDivider, NModal, NSwitch, NCheckbox, useDialog } from 'naive-ui';
import { FilterAltOutlined, SearchOutlined, StarOutlined, StarFilled } from '@vicons/material';

// Import images
// Vite handles asset imports
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
const router = useRouter();
const dialog = useDialog();
const showFilter = ref(false);
const quote = ref('风落吴江雪，纷纷入酒杯。');
const platforms = ['Codeforces', 'AtCoder', '洛谷', '蓝桥云课', '力扣', '牛客'];

const getPlatformImage = (platform: string) => {
  return images[platform] || images['Other'];
};

const getDayName = (index: number) => {
  return ContestUtils.getDayName(index);
};

const shouldShowDay = (dayList: Contest[]) => {
  if (store.showEmptyDay) return true;
  return hasVisibleContests(dayList);
};

const hasVisibleContests = (dayList: Contest[]) => {
  return dayList.some(c => store.selectedPlatforms[c.platform]);
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
});
</script>

<style scoped>
.contest-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: white;
}

.app-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  height: 64px;
  background-color: white;
  border-bottom: 1px solid #eee;
}

.app-bar h2 {
  margin: 0;
  font-size: 20px;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.quote {
  font-size: 18px;
  color: #2080f0;
  margin-bottom: 20px;
  font-weight: bold;
}

.day-group {
  margin-bottom: 16px;
}

.day-card {
  border: 2px solid #2080f0;
  border-radius: 10px;
}

.day-title {
  font-size: 18px;
  font-weight: bold;
}

.no-contest {
  padding: 20px;
  text-align: center;
  font-size: 16px;
  font-weight: bold;
}

.contest-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
}

.platform-icon img {
  width: 30px;
  height: 30px;
  border-radius: 4px;
}

.contest-info {
  flex: 1;
  margin-left: 20px;
  cursor: pointer;
}

.contest-name {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 4px;
}

.contest-time {
  font-size: 14px;
  color: grey;
}

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
</style>
