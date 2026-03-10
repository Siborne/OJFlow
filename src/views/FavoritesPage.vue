<template>
  <div class="favorites-page">
    <div class="app-bar">
      <h2>收藏比赛</h2>
    </div>

    <div class="content scrollable">
      <div v-if="store.favorites.length === 0" class="no-data">
        <n-empty description="暂无收藏" />
      </div>
      
      <div v-else>
        <div v-for="(contest, index) in store.favorites" :key="index">
          <n-card class="contest-card" :content-style="{ padding: '10px 16px' }">
            <div class="contest-item">
              <div class="platform-icon">
                  <img :src="getPlatformImage(contest.platform)" :alt="contest.platform" />
              </div>
              <div class="contest-info" @click="openLink(contest)">
                <div class="contest-name">{{ contest.name }}</div>
                <div class="contest-time" v-if="!store.hideDate">
                  {{ contest.formattedStartTime }} ({{ contest.duration }})
                </div>
              </div>
              <div class="contest-action">
                <n-button quaternary circle @click="store.toggleFavorite(contest)">
                  <template #icon>
                    <n-icon :size="24" color="var(--color-warning)">
                      <star-filled />
                    </n-icon>
                  </template>
                </n-button>
              </div>
            </div>
          </n-card>
          <div style="height: 10px"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useContestStore } from '../stores/contest';
import { ContestService } from '../services/contest';
import { Contest } from '../types';
import { NButton, NIcon, NCard, NEmpty, useDialog } from 'naive-ui';
import { StarFilled } from '@vicons/material';

const store = useContestStore();
const dialog = useDialog();

// Import images
const images: Record<string, string> = {
  'Codeforces': new URL('../assets/platforms/Codeforces.jpg', import.meta.url).href,
  'AtCoder': new URL('../assets/platforms/AtCoder.jpg', import.meta.url).href,
  '洛谷': new URL('../assets/platforms/Luogu.jpg', import.meta.url).href,
  '蓝桥云课': new URL('../assets/platforms/Lanqiao.jpg', import.meta.url).href,
  '力扣': new URL('../assets/platforms/LeetCode.jpg', import.meta.url).href,
  '牛客': new URL('../assets/platforms/Nowcoder.jpg', import.meta.url).href,
  'Other': new URL('../assets/platforms/Other.jpg', import.meta.url).href,
};

const getPlatformImage = (platform: string) => {
  return images[platform] || images['Other'];
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
</script>

<style scoped>
.favorites-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-surface);
}

.app-bar {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 64px;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
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

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.contest-card {
  border: none !important;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
  box-shadow: var(--shadow-1);
  transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease;
}

.contest-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-2);
  filter: saturate(1.02);
}

.contest-card:active {
  transform: translateY(0px);
  box-shadow: var(--shadow-3);
}

.contest-item {
  display: flex;
  align-items: center;
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
  color: var(--color-text-muted);
}

.contest-card :deep(.n-card__content) {
  background: transparent;
}
</style>
