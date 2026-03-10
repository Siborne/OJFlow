<template>
  <div class="favorites-page">
    <div class="app-bar">
      <h2>收藏比赛</h2>
      <div class="actions">
        <n-checkbox
          v-if="isBatchMode"
          :checked="allSelected"
          :indeterminate="isIndeterminate"
          aria-label="全选"
          @update:checked="setAllSelected"
          data-testid="favorite-select-all"
        >
          全选
        </n-checkbox>
        <action-tooltip-button quaternary circle i18n-key="tooltip.sort" @click="toggleSort">
          <template #icon>
            <n-icon :size="24"><sort-outlined /></n-icon>
          </template>
        </action-tooltip-button>
        <action-tooltip-button quaternary circle i18n-key="tooltip.search" @click="showSearch = !showSearch">
          <template #icon>
            <n-icon :size="24"><search-outlined /></n-icon>
          </template>
        </action-tooltip-button>
        <action-tooltip-button
          quaternary
          circle
          i18n-key="tooltip.batch"
          @click="isBatchMode = !isBatchMode"
          data-testid="favorite-batch-toggle"
        >
          <template #icon>
            <n-icon :size="24"><edit-outlined /></n-icon>
          </template>
        </action-tooltip-button>
      </div>
    </div>
    
    <div class="search-bar" v-if="showSearch">
      <n-input v-model:value="searchQuery" placeholder="搜索比赛..." clearable />
    </div>

    <div class="content scrollable" ref="contentRef">
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
                <div class="contest-time" v-if="!store.hideDate">
                  {{ contest.formattedStartTime }} ({{ contest.duration }})
                </div>
              </div>
              <div class="contest-action" v-if="!isBatchMode">
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

      <div class="batch-bar" v-if="isBatchMode">
        <div class="batch-bar-left" data-testid="favorite-selected-count">
          已选 {{ selectedNames.length }} 项
        </div>
        <n-button
          type="error"
          @click="deleteSelected"
          :disabled="!hasSelection"
          data-testid="favorite-delete-selected"
          aria-label="删除选中"
        >
          删除选中
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue';
import { useContestStore } from '../stores/contest';
import { ContestService } from '../services/contest';
import { Contest } from '../types';
import { NButton, NIcon, NCard, NEmpty, NInput, NCheckbox, NPagination, useDialog, useMessage } from 'naive-ui';
import { StarFilled, SearchOutlined, SortOutlined, EditOutlined } from '@vicons/material';
import ActionTooltipButton from '../components/ActionTooltipButton.vue';

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
const contentRef = ref<HTMLElement | null>(null);

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

const allSelected = computed(() => {
  const list = filteredFavorites.value;
  if (list.length === 0) return false;
  return list.every(c => selected[c.name]);
});

const isIndeterminate = computed(() => {
  const list = filteredFavorites.value;
  if (list.length === 0) return false;
  const count = list.reduce((acc, c) => acc + (selected[c.name] ? 1 : 0), 0);
  return count > 0 && count < list.length;
});

const setAllSelected = (checked: boolean) => {
  for (const c of filteredFavorites.value) {
    selected[c.name] = checked;
  }
};

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

watch(filteredFavorites, () => {
  const visible = new Set(filteredFavorites.value.map(c => c.name));
  for (const name of Object.keys(selected)) {
    if (!visible.has(name)) delete selected[name];
  }
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
        page.value = 1;
        contentRef.value?.scrollTo({ top: 0 });

        if (notFound.length > 0 && deleted.length > 0) {
          message.warning(`已删除 ${deleted.length} 条，${notFound.length} 条已不存在`);
        } else if (notFound.length > 0) {
          message.warning(`未删除任何收藏，${notFound.length} 条已不存在`);
        } else {
          message.success(`已删除 ${deleted.length} 条收藏`);
        }
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

const onKeyDown = (e: KeyboardEvent) => {
  if (!isBatchMode.value) return;

  if (e.key.toLowerCase() === 'a' && e.ctrlKey) {
    e.preventDefault();
    setAllSelected(true);
    return;
  }

  if (e.key === 'Delete') {
    e.preventDefault();
    deleteSelected();
  }
};

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});
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
  justify-content: space-between;
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

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-bar {
  padding: 8px 16px;
  background-color: var(--color-surface-muted);
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
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
  position: relative;
  overflow: hidden;
  transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease;
}

.contest-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 14px;
  padding: 1px;
  background: var(--card-accent);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.contest-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--card-shadow-hover);
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

.pagination {
  display: flex;
  justify-content: center;
  padding: 8px 0 16px;
}

.batch-bar {
  position: sticky;
  bottom: 0;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  z-index: 2;
}

.batch-bar-left {
  color: var(--color-text-muted);
  font-size: 14px;
}

.contest-card :deep(.n-card__content) {
  background: transparent;
}
</style>
