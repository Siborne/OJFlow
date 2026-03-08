<template>
  <div class="favorites-page">
    <div class="app-bar">
      <h2>收藏比赛</h2>
      <div class="actions">
        <n-button quaternary circle @click="toggleSort">
          <template #icon>
            <n-icon :size="24"><sort-outlined /></n-icon>
          </template>
        </n-button>
        <n-button quaternary circle @click="showSearch = !showSearch">
          <template #icon>
            <n-icon :size="24"><search-outlined /></n-icon>
          </template>
        </n-button>
        <n-button quaternary circle @click="isBatchMode = !isBatchMode">
          <template #icon>
            <n-icon :size="24"><edit-outlined /></n-icon>
          </template>
        </n-button>
      </div>
    </div>
    
    <div class="search-bar" v-if="showSearch">
      <n-input v-model:value="searchQuery" placeholder="搜索比赛..." clearable />
    </div>

    <div class="content scrollable">
      <div v-if="filteredFavorites.length === 0" class="no-data">
        <n-empty description="暂无收藏" />
      </div>
      
      <div v-else>
        <div v-for="(contest, index) in filteredFavorites" :key="index">
          <n-card class="contest-card" :content-style="{ padding: '10px 16px' }">
            <div class="contest-item">
              <n-checkbox 
                v-if="isBatchMode" 
                v-model:checked="selected[contest.name]" 
                style="margin-right: 10px"
              />
              <div class="platform-icon">
                  <img :src="getPlatformImage(contest.platform)" :alt="contest.platform" />
              </div>
              <div class="contest-info" @click="openLink(contest)">
                <div class="contest-name">{{ contest.name }}</div>
                <div class="contest-time">
                  {{ contest.formattedStartTime }} ({{ contest.duration }})
                </div>
              </div>
              <div class="contest-action" v-if="!isBatchMode">
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
    
    <div class="batch-actions" v-if="isBatchMode">
      <n-button type="error" @click="deleteSelected" :disabled="!hasSelection">
        删除选中
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { useContestStore } from '../stores/contest';
import { ContestService } from '../services/contest';
import { Contest } from '../types';
import { NButton, NIcon, NCard, NEmpty, NInput, NCheckbox, useDialog } from 'naive-ui';
import { StarFilled, SearchOutlined, SortOutlined, EditOutlined } from '@vicons/material';

const store = useContestStore();
const dialog = useDialog();
const searchQuery = ref('');
const showSearch = ref(false);
const isBatchMode = ref(false);
const sortAsc = ref(true);
const selected = reactive<Record<string, boolean>>({});

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

const filteredFavorites = computed(() => {
  let list = store.favorites.filter(c => 
    c.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
  
  if (sortAsc.value) {
    list.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
  } else {
    list.sort((a, b) => b.startTimeSeconds - a.startTimeSeconds);
  }
  
  return list;
});

const hasSelection = computed(() => {
  return Object.values(selected).some(v => v);
});

const toggleSort = () => {
  sortAsc.value = !sortAsc.value;
};

const deleteSelected = () => {
  const toDelete = Object.keys(selected).filter(k => selected[k]);
  toDelete.forEach(name => {
    store.removeFavorite(name);
    delete selected[name];
  });
  isBatchMode.value = false;
};

const openLink = (contest: Contest) => {
  if (isBatchMode.value) {
    selected[contest.name] = !selected[contest.name];
    return;
  }
  
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

.actions {
  display: flex;
  gap: 8px;
}

.search-bar {
  padding: 8px 16px;
  background-color: #f9f9f9;
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
  border: 2px solid #2080f0;
  border-radius: 10px;
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
  color: grey;
}

.batch-actions {
  padding: 16px;
  background-color: white;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
}
</style>
