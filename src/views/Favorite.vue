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
        <n-button quaternary circle @click="isBatchMode = !isBatchMode" data-testid="favorite-batch-toggle">
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
        <div v-for="contest in pagedFavorites" :key="contest.name">
          <n-card class="contest-card" :content-style="{ padding: '10px 16px' }">
            <div class="contest-item">
              <n-checkbox 
                v-if="isBatchMode" 
                v-model:checked="selected[contest.name]" 
                :data-testid="`favorite-checkbox-${contest.name}`"
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

      <div class="pagination" v-if="filteredFavorites.length > pageSize">
        <n-pagination
          v-model:page="page"
          v-model:page-size="pageSize"
          :item-count="filteredFavorites.length"
          :page-sizes="[10, 20, 50, 100]"
          show-size-picker
          data-testid="favorite-pagination"
        />
      </div>
    </div>
    
    <div class="batch-actions" v-if="isBatchMode">
      <n-button type="error" @click="deleteSelected" :disabled="!hasSelection" data-testid="favorite-delete-selected">
        删除选中
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import { useContestStore } from '../stores/contest';
import { ContestService } from '../services/contest';
import { Contest } from '../types';
import { NButton, NIcon, NCard, NEmpty, NInput, NCheckbox, NPagination, useDialog, useMessage } from 'naive-ui';
import { StarFilled, SearchOutlined, SortOutlined, EditOutlined } from '@vicons/material';

const store = useContestStore();
const dialog = useDialog();
const message = useMessage();
const searchQuery = ref('');
const showSearch = ref(false);
const isBatchMode = ref(false);
const sortAsc = ref(true);
const selected = reactive<Record<string, boolean>>({});
const page = ref(1);
const pageSize = ref(20);

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

const selectedNames = computed(() => {
  return Object.keys(selected).filter(k => selected[k]);
});

const hasSelection = computed(() => {
  return selectedNames.value.length > 0;
});

const toggleSort = () => {
  sortAsc.value = !sortAsc.value;
};

const pagedFavorites = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredFavorites.value.slice(start, end);
});

watch([filteredFavorites, pageSize], () => {
  const maxPage = Math.max(1, Math.ceil(filteredFavorites.value.length / pageSize.value));
  if (page.value > maxPage) page.value = maxPage;
});

const deleteSelected = () => {
  const toDelete = selectedNames.value;
  if (toDelete.length === 0) {
    message.warning('请先选择要删除的收藏');
    return;
  }

  dialog.warning({
    title: '确认删除？',
    content: `确定要删除选中的 ${toDelete.length} 条收藏吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      try {
        const { deleted, notFound } = store.removeFavorites(toDelete);
        for (const name of deleted) {
          delete selected[name];
        }
        for (const name of notFound) {
          delete selected[name];
        }

        const maxPage = Math.max(1, Math.ceil(filteredFavorites.value.length / pageSize.value));
        if (page.value > maxPage) page.value = maxPage;

        if (notFound.length > 0 && deleted.length > 0) {
          message.warning(`已删除 ${deleted.length} 条，${notFound.length} 条已不存在`);
        } else if (notFound.length > 0) {
          message.warning(`未删除任何收藏，${notFound.length} 条已不存在`);
        } else {
          message.success(`已删除 ${deleted.length} 条收藏`);
        }

        isBatchMode.value = false;
      } catch (error: any) {
        message.error(error?.message ? `删除失败：${error.message}` : '删除失败');
      }
    }
  });
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

.pagination {
  display: flex;
  justify-content: center;
  padding: 8px 0 16px;
}
</style>
