<template>
  <div class="settings-page">
    <div class="app-bar">
      <h2>设置中心</h2>
    </div>

    <div class="content">
      <n-list clickable hoverable>
        <!-- Account -->
        <!-- <n-list-item aria-label="用户" tabindex="0">
          <template #prefix>
            <n-avatar round size="medium" src="https://avatars.githubusercontent.com/u/1?v=4" />
          </template>
          <n-thing title="用户" description="已登录: Guest" />
           <n-thing title="用户" description="正在开发中" />
          <template #suffix>
            <n-button size="small" type="error" ghost>退出登录</n-button>
          </template>
        </n-list-item> -->

        <!-- <n-divider /> -->

        <!-- Theme -->
        <!-- <n-list-item aria-label="暗色模式" tabindex="0">
          <template #prefix>
            <span class="settings-icon-wrap" aria-hidden="true">
              <svg class="settings-icon" viewBox="0 0 24 24">
                <title>暗色模式</title>
                <use href="#icon-dark" />
              </svg>
            </span>
          </template>
          <n-thing title="暗色模式（试验性功能）" />
          <template #suffix>
            <n-switch :value="isExperimentalDark" @update:value="toggleExperimentalDark" />
          </template>
        </n-list-item> -->

        <!-- Language -->
        <!-- <n-list-item>
          <template #prefix>
            <n-icon :size="24"><language-outlined /></n-icon>
          </template>
          <n-thing title="语言" />
          <template #suffix>
            <n-select v-model:value="language" :options="langOptions" size="small" style="width: 100px" />
          </template>
        </n-list-item> -->

        <!-- Clear Cache -->
        <!-- <n-list-item @click="clearCache">
          <template #prefix>
            <n-icon :size="24"><delete-outline-outlined /></n-icon>
          </template>
          <n-thing title="清除缓存" description="释放本地存储空间" />
        </n-list-item> -->
        <!-- Update -->
        <n-list-item :aria-label="retentionLabel" tabindex="0">
          <template #prefix>
            <span class="settings-icon-wrap" aria-hidden="true">
              <svg class="settings-icon" viewBox="0 0 24 24">
                <title>{{ retentionLabel }}</title>
                <use href="#icon-retention" />
              </svg>
            </span>
          </template>
          <n-thing :title="retentionLabel" :description="retentionDesc" />
          <template #suffix>
            <div class="max-days-suffix">
              <n-spin v-if="isUpdatingDays" size="small" />
              <n-input-number
                v-model:value="maxDays"
                size="small"
                :min="1"
                :max="30"
                style="width: 110px"
                @update:value="updateMaxDays"
              />
            </div>
          </template>
        </n-list-item>

        <n-list-item
          aria-label="检查更新"
          tabindex="0"
          role="button"
          @click="checkForUpdate"
          @keydown.enter.prevent="checkForUpdate"
          @keydown.space.prevent="checkForUpdate"
        >
          <template #prefix>
            <span class="settings-icon-wrap" aria-hidden="true">
              <svg class="settings-icon" viewBox="0 0 24 24">
                <title>检查更新</title>
                <use href="#icon-update" />
              </svg>
            </span>
          </template>
          <n-thing title="检查更新" :description="'当前版本: ' + curVersion" />
          <template #suffix>
            <n-spin v-if="isChecking" size="small" />
          </template>
        </n-list-item>
        
        <!-- About -->
        <n-list-item
          aria-label="关于 OJ Flow"
          tabindex="0"
          role="button"
          @click="openUrl('https://github.com/Siborne/OJFlow')"
          @keydown.enter.prevent="openUrl('https://github.com/Siborne/OJFlow')"
          @keydown.space.prevent="openUrl('https://github.com/Siborne/OJFlow')"
        >
          <template #prefix>
            <span class="settings-icon-wrap" aria-hidden="true">
              <svg class="settings-icon" viewBox="0 0 24 24">
                <title>关于</title>
                <use href="#icon-info" />
              </svg>
            </span>
          </template>
          <n-thing title="关于 OJ Flow" description="开源地址:https://github.com/Siborne/OJFlow?" />
        </n-list-item>
        <!-- About -->
        <n-list-item
          aria-label="友链 OJ Helper"
          tabindex="0"
          role="button"
          @click="openUrl('https://github.com/2754LM/oj_helper')"
          @keydown.enter.prevent="openUrl('https://github.com/2754LM/oj_helper')"
          @keydown.space.prevent="openUrl('https://github.com/2754LM/oj_helper')"
        >
          <template #prefix>
            <span class="settings-icon-wrap" aria-hidden="true">
              <svg class="settings-icon" viewBox="0 0 24 24">
                <title>友链</title>
                <use href="#icon-friend" />
              </svg>
            </span>
          </template>
          <n-thing title="友链 OJ Helper" description="开源地址:https://github.com/2754LM/oj_helper/" />
        </n-list-item>
        <!-- <n-divider /> -->
    
        
      </n-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useContestStore } from '../stores/contest';
import { NList, NListItem, NThing, NSpin, NSwitch, NButton, NAvatar, NDivider, NInputNumber, useDialog, useMessage } from 'naive-ui';
import { ContestService } from '../services/contest';
import { useUiStore } from '../stores/ui';
import { t } from '../i18n';
import { checkUpdate, getUpdateDialogSpec } from '../updater/checkUpdate';

const rawVersion = (import.meta as any).env?.VITE_APP_VERSION as string | undefined;
const curVersion = rawVersion ? (rawVersion.startsWith('v') ? rawVersion : `v${rawVersion}`) : 'v0.0.0';
const isChecking = ref(false);
const isUpdatingDays = ref(false);
const language = ref('zh-CN');
const dialog = useDialog();
const message = useMessage();
const store = useContestStore();
const uiStore = useUiStore();
const maxDays = ref(store.day);
const pendingMaxDays = ref<number | null>(null);
let maxDaysDebounceTimer: any;

const retentionLabel = computed(() => t('settings.retentionPeriod'));
const retentionDesc = computed(() => t('settings.retentionPeriodDesc'));
const isExperimentalDark = computed(() => uiStore.colorMode === 'dark');

const toggleExperimentalDark = (value: boolean) => {
  uiStore.setColorMode(value ? 'dark' : 'auto');
};

const langOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
];

const openUrl = (url: string) => {
  ContestService.openUrl(url);
};

const clearCache = () => {
  dialog.warning({
    title: '清除缓存',
    content: '确定要清除所有本地缓存吗？这将重置您的偏好设置。',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      localStorage.clear();
      message.success('缓存已清除');
      setTimeout(() => window.location.reload(), 1000);
    }
  });
};

const applyMaxDays = async (value: number) => {
  if (isUpdatingDays.value) {
    pendingMaxDays.value = value;
    return;
  }
  isUpdatingDays.value = true;
  try {
    await store.setMaxCrawlDays(value);
    maxDays.value = store.day;
    message.success(`${retentionLabel.value}已更新为 ${store.day} 天`);
  } catch (e: any) {
    maxDays.value = store.day;
    message.error(e?.message ? `更新失败：${e.message}` : '更新失败');
  } finally {
    isUpdatingDays.value = false;
    const pending = pendingMaxDays.value;
    pendingMaxDays.value = null;
    if (pending !== null && pending !== store.day) {
      await applyMaxDays(pending);
    }
  }
};

const updateMaxDays = (value: number | null) => {
  if (value === null) return;
  maxDays.value = value;
  clearTimeout(maxDaysDebounceTimer);
  maxDaysDebounceTimer = setTimeout(() => {
    applyMaxDays(value);
  }, 300);
};

const checkForUpdate = async () => {
  if (isChecking.value) return;
  isChecking.value = true;

  try {
    const info = await checkUpdate();
    const spec = getUpdateDialogSpec(info);

    if (spec.kind === 'update') {
      dialog.info({
        title: spec.title,
        content: spec.content,
        positiveText: spec.positiveText,
        negativeText: spec.negativeText,
        onPositiveClick: async () => {
          const url = info.packageUrl ?? info.homepageUrl;
          if (!url) return;
          await ContestService.installUpdate(url);
        },
      });
      return;
    }

    if (spec.kind === 'error') {
      dialog.error({
        title: spec.title,
        content: spec.content,
        positiveText: spec.positiveText,
      });
      return;
    }

    message.info(spec.content);
  } catch (e) {
    message.error('检查失败');
  } finally {
    isChecking.value = false;
  }
};
</script>

<style scoped>
.settings-page {
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
  padding: 16px;
  overflow-y: auto;
}

.max-days-suffix {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--settings-icon-default);
  border-radius: 8px;
  transition: color 200ms ease-out;
}

.settings-icon {
  width: 24px;
  height: 24px;
}

.settings-page :deep(.n-list-item:hover) .settings-icon-wrap {
  color: var(--nav-bg-color);
}

.settings-page :deep(.n-list-item:active) .settings-icon-wrap {
  color: var(--settings-icon-active);
}
</style>
