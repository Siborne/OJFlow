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
                    <n-icon :size="24" color="#ffc107">
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
  background-color: white;
}

.app-bar {
  display: flex;
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

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.contest-card {
  border: none !important;
  border-radius: 14px;
  background: linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
  transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease;
}

.contest-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.16);
  filter: saturate(1.02);
}

.contest-card:active {
  transform: translateY(0px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.14);
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
  color: rgba(0, 0, 0, 0.65);
}

.contest-card :deep(.n-card__content) {
  background: transparent;
}

@media (prefers-color-scheme: dark) {
  .favorites-page {
    background-color: #0f1115;
  }

  .app-bar {
    background-color: #0f1115;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .app-bar h2 {
    color: rgba(255, 255, 255, 0.92);
  }

  .contest-card {
    background: linear-gradient(135deg, rgba(0, 201, 255, 0.78) 0%, rgba(146, 254, 157, 0.62) 100%);
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
  }

  .contest-name {
    color: rgba(255, 255, 255, 0.92);
  }

  .contest-time {
    color: rgba(255, 255, 255, 0.72);
  }
}
</style>
