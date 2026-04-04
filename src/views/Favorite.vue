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
        <action-tooltip-button quaternary circle i18n-key="tooltip.add" @click="showAddModal = true">
          <template #icon>
            <n-icon :size="24"><add-outlined /></n-icon>
          </template>
        </action-tooltip-button>
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
        <div class="favorites-summary-grid">
          <n-card class="favorite-summary" :bordered="true">
            <template #header>收藏总览</template>
            <div class="summary-value">{{ filteredFavorites.length }}</div>
            <div class="summary-label">当前检索结果</div>
            <div class="summary-meta">总收藏 {{ store.favorites.length }} 场</div>
          </n-card>
          <n-card class="favorite-summary" :bordered="true">
            <template #header>即将开始</template>
            <div class="summary-value summary-value--info">{{ upcomingCount }}</div>
          </n-card>
          <n-card class="favorite-summary" :bordered="true">
            <template #header>进行中</template>
            <div class="summary-value summary-value--success">{{ runningCount }}</div>
          </n-card>
          <n-card class="favorite-summary" :bordered="true">
            <template #header>已结束</template>
            <div class="summary-value summary-value--ended">{{ endedCount }}</div>
          </n-card>
        </div>

        <!-- Active contests (upcoming + running) -->
        <div v-if="activeFavorites.length > 0" class="section-label">进行中 & 即将开始</div>
        <div class="favorites-bento-grid" v-if="activeFavorites.length > 0">
          <div v-for="contest in pagedActiveFavorites" :key="contest.name" class="favorite-grid-cell">
            <n-card class="contest-card" :content-style="{ padding: '10px 16px' }">
              <div :class="['contest-item', `contest-item--${getContestState(contest)}`]">
                <n-checkbox v-if="isBatchMode" v-model:checked="selected[contest.name]" :data-testid="`favorite-checkbox-${contest.name}`" style="margin-right: 10px" />
                <div class="platform-icon">
                  <img :src="getPlatformImage(contest.platform)" :alt="contest.platform" />
                </div>
                <div class="contest-info" role="button" tabindex="0" @click="openLink(contest)" @keydown.enter.prevent="openLink(contest)" @keydown.space.prevent="openLink(contest)">
                  <div class="contest-name">{{ contest.name }}</div>
                  <div class="contest-time" v-if="!store.hideDate">{{ contest.formattedStartTime }} ({{ contest.duration }})</div>
                  <div class="contest-meta-line">
                    <n-tag size="small" :type="getContestStateType(contest)">{{ getContestStateLabel(contest) }}</n-tag>
                    <n-tag v-if="contest.isManual" size="small" class="manual-tag">手动</n-tag>
                  </div>
                </div>
                <div class="contest-action" v-if="!isBatchMode">
                  <n-button quaternary circle @click="store.toggleFavorite(contest)">
                    <template #icon><n-icon :size="24" color="var(--color-warning)"><star-filled /></n-icon></template>
                  </n-button>
                </div>
              </div>
            </n-card>
          </div>
        </div>

        <div class="pagination" v-if="activeFavorites.length > pageSize">
          <n-pagination v-model:page="page" v-model:page-size="pageSize" :item-count="activeFavorites.length" :page-sizes="[10, 20, 50, 100]" show-size-picker data-testid="favorite-pagination" />
        </div>

        <!-- Ended contests: auto-expand when no active favorites, otherwise collapsible -->
        <div v-if="endedFavorites.length > 0" class="ended-section">
          <!-- When there are active favorites, keep ended section collapsible -->
          <template v-if="activeFavorites.length > 0">
            <n-collapse>
              <n-collapse-item :title="`已结束比赛 (${endedFavorites.length})`" name="ended">
                <div class="favorites-bento-grid">
                  <div v-for="contest in endedFavorites" :key="contest.name" class="favorite-grid-cell">
                    <n-card class="contest-card contest-card--ended" :content-style="{ padding: '10px 16px' }">
                      <div class="contest-item contest-item--ended">
                        <n-checkbox v-if="isBatchMode" v-model:checked="selected[contest.name]" :data-testid="`favorite-checkbox-${contest.name}`" style="margin-right: 10px" />
                        <div class="platform-icon">
                          <img :src="getPlatformImage(contest.platform)" :alt="contest.platform" />
                        </div>
                        <div class="contest-info" role="button" tabindex="0" @click="openLink(contest)" @keydown.enter.prevent="openLink(contest)" @keydown.space.prevent="openLink(contest)">
                          <div class="contest-name">{{ contest.name }}</div>
                          <div class="contest-time" v-if="!store.hideDate">{{ contest.formattedStartTime }} ({{ contest.duration }})</div>
                          <div class="contest-meta-line">
                            <n-tag size="small" type="default">已结束</n-tag>
                            <n-tag v-if="contest.isManual" size="small" class="manual-tag">手动</n-tag>
                          </div>
                        </div>
                        <div class="contest-action" v-if="!isBatchMode">
                          <n-button quaternary circle @click="store.toggleFavorite(contest)">
                            <template #icon><n-icon :size="24" color="var(--color-warning)"><star-filled /></n-icon></template>
                          </n-button>
                        </div>
                      </div>
                    </n-card>
                  </div>
                </div>
              </n-collapse-item>
            </n-collapse>
          </template>
          <!-- When no active favorites, show ended contests directly -->
          <template v-else>
            <div class="section-label">已结束比赛 ({{ endedFavorites.length }})</div>
            <div class="favorites-bento-grid">
              <div v-for="contest in endedFavorites" :key="contest.name" class="favorite-grid-cell">
                <n-card class="contest-card contest-card--ended" :content-style="{ padding: '10px 16px' }">
                  <div class="contest-item contest-item--ended">
                    <n-checkbox v-if="isBatchMode" v-model:checked="selected[contest.name]" :data-testid="`favorite-checkbox-${contest.name}`" style="margin-right: 10px" />
                    <div class="platform-icon">
                      <img :src="getPlatformImage(contest.platform)" :alt="contest.platform" />
                    </div>
                    <div class="contest-info" role="button" tabindex="0" @click="openLink(contest)" @keydown.enter.prevent="openLink(contest)" @keydown.space.prevent="openLink(contest)">
                      <div class="contest-name">{{ contest.name }}</div>
                      <div class="contest-time" v-if="!store.hideDate">{{ contest.formattedStartTime }} ({{ contest.duration }})</div>
                      <div class="contest-meta-line">
                        <n-tag size="small" type="default">已结束</n-tag>
                        <n-tag v-if="contest.isManual" size="small" class="manual-tag">手动</n-tag>
                      </div>
                    </div>
                    <div class="contest-action" v-if="!isBatchMode">
                      <n-button quaternary circle @click="store.toggleFavorite(contest)">
                        <template #icon><n-icon :size="24" color="var(--color-warning)"><star-filled /></n-icon></template>
                      </n-button>
                    </div>
                  </div>
                </n-card>
              </div>
            </div>
          </template>
        </div>
      </div>

      <div class="batch-bar" v-if="isBatchMode">
        <div class="batch-bar-left" data-testid="favorite-selected-count">已选 {{ selectedNames.length }} 项</div>
        <n-button type="error" @click="deleteSelected" :disabled="!hasSelection" data-testid="favorite-delete-selected" aria-label="删除选中">删除选中</n-button>
      </div>
    </div>

    <!-- Add contest modal -->
    <n-modal v-model:show="showAddModal" preset="card" title="手动添加比赛" :style="{ width: '480px', maxWidth: '95vw' }" :mask-closable="false" :segmented="{ content: true, footer: true }">
      <n-form ref="formRef" :model="addForm" :rules="formRules" label-placement="left" label-width="80" require-mark-placement="right-hanging">
        <n-form-item label="比赛名称" path="name">
          <n-input v-model:value="addForm.name" placeholder="请输入比赛名称" />
        </n-form-item>
        <n-form-item label="开始时间" path="startTime">
          <n-date-picker v-model:value="addForm.startTime" type="datetime" format="yyyy-MM-dd HH:mm" placeholder="选择开始时间" style="width: 100%" />
        </n-form-item>
        <n-form-item label="结束时间" path="endTime">
          <n-date-picker v-model:value="addForm.endTime" type="datetime" format="yyyy-MM-dd HH:mm" placeholder="选择结束时间" style="width: 100%" />
        </n-form-item>
        <n-form-item label="平台" path="platform">
          <n-select v-model:value="addForm.platform" :options="platformOptions" placeholder="选择平台" filterable tag />
        </n-form-item>
        <n-form-item label="比赛链接" path="link">
          <n-input v-model:value="addForm.link" placeholder="https://（选填）" />
        </n-form-item>
      </n-form>
      <template #footer>
        <div class="modal-footer">
          <n-button @click="showAddModal = false">取消</n-button>
          <n-button type="primary" @click="handleAddContest" :loading="addLoading">添加</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue';
import { useContestStore } from '../stores/contest';
import { ContestService } from '../services/contest';
import { ContestUtils } from '../utils/contest_utils';
import { Contest } from '../types';
import { NButton, NIcon, NCard, NEmpty, NInput, NCheckbox, NPagination, NTag, NModal, NForm, NFormItem, NDatePicker, NSelect, NCollapse, NCollapseItem, useDialog, useMessage } from 'naive-ui';
import type { FormInst, FormRules } from 'naive-ui';
import { StarFilled, SearchOutlined, SortOutlined, EditOutlined, AddOutlined } from '@vicons/material';
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

// Add contest modal state
const showAddModal = ref(false);
const addLoading = ref(false);
const formRef = ref<FormInst | null>(null);
const addForm = reactive({
  name: '',
  startTime: null as number | null,
  endTime: null as number | null,
  platform: null as string | null,
  link: '',
});

const platformOptions = [
  { label: 'Codeforces', value: 'Codeforces' },
  { label: 'AtCoder', value: 'AtCoder' },
  { label: '洛谷', value: '洛谷' },
  { label: '蓝桥云课', value: '蓝桥云课' },
  { label: '力扣', value: '力扣' },
  { label: '牛客', value: '牛客' },
  { label: '其他', value: 'Other' },
];

const formRules: FormRules = {
  name: [
    { required: true, message: '请输入比赛名称', trigger: 'blur' },
    {
      validator: (_rule: any, value: string) => {
        if (store.favorites.some(c => c.name === value)) {
          return new Error('已存在同名收藏比赛');
        }
        return true;
      },
      trigger: 'blur',
    },
  ],
  startTime: [
    { type: 'number', required: true, message: '请选择开始时间', trigger: 'change' },
  ],
  endTime: [
    { type: 'number', required: true, message: '请选择结束时间', trigger: 'change' },
    {
      validator: (_rule: any, value: number) => {
        if (addForm.startTime && value && value <= addForm.startTime) {
          return new Error('结束时间必须晚于开始时间');
        }
        return true;
      },
      trigger: 'change',
    },
  ],
  platform: [
    { required: true, message: '请选择平台', trigger: 'change' },
  ],
  link: [
    {
      validator: (_rule: any, value: string) => {
        if (value && !/^https?:\/\/.+/.test(value)) {
          return new Error('请输入有效的URL（以 http:// 或 https:// 开头）');
        }
        return true;
      },
      trigger: 'blur',
    },
  ],
};

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

const getContestState = (contest: Contest) => {
  const now = Date.now();
  const start = contest.startTimeSeconds * 1000;
  const end = start + contest.durationSeconds * 1000;
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'running';
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

const activeFavorites = computed(() => filteredFavorites.value.filter(c => getContestState(c) !== 'ended'));
const endedFavorites = computed(() => filteredFavorites.value.filter(c => getContestState(c) === 'ended'));

const upcomingCount = computed(() => filteredFavorites.value.filter(c => getContestState(c) === 'upcoming').length);
const runningCount = computed(() => filteredFavorites.value.filter(c => getContestState(c) === 'running').length);
const endedCount = computed(() => endedFavorites.value.length);

const selectedNames = computed(() => Object.keys(selected).filter(k => selected[k]));
const hasSelection = computed(() => selectedNames.value.length > 0);

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

const pagedActiveFavorites = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return activeFavorites.value.slice(start, end);
});

watch([activeFavorites, pageSize], () => {
  const maxPage = Math.max(1, Math.ceil(activeFavorites.value.length / pageSize.value));
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
        for (const name of deleted) delete selected[name];
        for (const name of notFound) delete selected[name];
        const maxPage = Math.max(1, Math.ceil(activeFavorites.value.length / pageSize.value));
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

const resetAddForm = () => {
  addForm.name = '';
  addForm.startTime = null;
  addForm.endTime = null;
  addForm.platform = null;
  addForm.link = '';
};

const handleAddContest = async () => {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }
  addLoading.value = true;
  try {
    const startTimeSeconds = Math.floor(addForm.startTime! / 1000);
    const durationSeconds = Math.floor((addForm.endTime! - addForm.startTime!) / 1000);
    const contest = ContestUtils.createContest(
      addForm.name,
      startTimeSeconds,
      durationSeconds,
      addForm.platform!,
      addForm.link || undefined
    );
    contest.isManual = true;
    store.addManualContest(contest);
    message.success('比赛添加成功');
    showAddModal.value = false;
    resetAddForm();
  } catch (error: any) {
    message.error(error?.message || '添加失败');
  } finally {
    addLoading.value = false;
  }
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
}

.app-bar h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
}

.actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.search-bar {
  padding: 10px var(--space-4);
  background: rgba(255, 255, 255, 0.58);
  border-bottom: 1px solid var(--color-border);
}

.search-bar :deep(.n-input) {
  --n-border-radius: 12px;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
}

.favorites-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.favorite-summary {
  border: 1px solid var(--card-border) !important;
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  overflow: hidden;
  position: relative;
}

.favorite-summary::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.14), rgba(52, 211, 153, 0.04) 48%, transparent 80%);
}



.summary-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1.1;
}

.summary-label {
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.summary-meta {
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-text-soft);
}

.summary-value--info {
  color: var(--color-info, #0ea5e9);
}

.summary-value--success {
  color: var(--color-success, #34d399);
}

.summary-value--ended {
  color: var(--color-text-muted);
}

.favorites-bento-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
}

.favorite-grid-cell {
  display: flex;
}

.no-data {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.contest-card {
  border: 1px solid var(--card-border) !important;
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: transform var(--motion-base) var(--motion-ease), box-shadow var(--motion-base) var(--motion-ease), border-color var(--motion-base) var(--motion-ease);
  width: 100%;
}

.contest-card::before {
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

.contest-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--card-shadow-hover);
  border-color: rgba(14, 165, 233, 0.2) !important;
}

.contest-card:active {
  transform: translateY(0);
  box-shadow: var(--shadow-3);
}

.contest-item {
  display: flex;
  align-items: center;
  animation: list-reveal 220ms var(--motion-ease) both;
  position: relative;
}

.contest-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.45);
  opacity: 0.55;
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

.contest-meta-line {
  margin-top: 6px;
}

.contest-name {
  font-size: 15px;
  font-weight: 610;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.contest-time {
  font-size: 13px;
  color: var(--color-text-muted);
}

.pagination {
  display: flex;
  justify-content: center;
  padding: 10px 0 16px;
}

.batch-bar {
  position: sticky;
  bottom: 0;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(var(--frost-blur));
  -webkit-backdrop-filter: blur(var(--frost-blur));
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -8px 18px rgba(15, 23, 42, 0.06);
  z-index: 2;
}

.batch-bar-left {
  color: var(--color-text-muted);
  font-size: 13px;
  letter-spacing: 0.01em;
}

.contest-card :deep(.n-card__content) {
  background: transparent;
}

.contest-card :deep(.n-checkbox-box) {
  border-radius: 8px;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-soft);
  margin-bottom: var(--space-2);
  padding-left: 2px;
}

.ended-section {
  margin-top: var(--space-4);
}

.ended-section :deep(.n-collapse-item__header-main) {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-muted);
}

.contest-card--ended {
  opacity: 0.72;
}

.contest-card--ended:hover {
  opacity: 1;
}

.manual-tag {
  margin-left: 6px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.contest-item:nth-child(1) { animation-delay: 20ms; }
.contest-item:nth-child(2) { animation-delay: 40ms; }
.contest-item:nth-child(3) { animation-delay: 60ms; }
.contest-item:nth-child(4) { animation-delay: 80ms; }
.contest-item:nth-child(5) { animation-delay: 100ms; }
.contest-item:nth-child(6) { animation-delay: 120ms; }

@keyframes list-reveal {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .favorites-summary-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2);
  }

  .favorites-bento-grid {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }

  .favorite-grid-cell {
    grid-column: span 1;
  }

  .app-bar {
    padding: 0 12px;
  }

  .app-bar h2 {
    font-size: 17px;
  }

  .search-bar {
    padding: 8px 12px;
  }

  .content {
    padding: 10px;
  }

  .batch-bar {
    height: 54px;
    padding: 0 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .contest-item {
    animation: fade-only 140ms ease-out both;
  }

  .contest-card:hover,
  .contest-card:active {
    transform: none;
  }
}

@keyframes fade-only {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
