<template>
  <div class="settings-page">
    <div class="app-bar">
      <h2>设置中心</h2>
    </div>

    <div class="content">
      <n-list clickable hoverable>
        <!-- Account -->
        <n-list-item aria-label="最大爬取天数">
          <template #prefix>
            <n-avatar round size="medium" src="https://avatars.githubusercontent.com/u/1?v=4" />
          </template>
          <!-- <n-thing title="用户" description="已登录: Guest" /> -->
           <n-thing title="用户" description="正在开发中" />
          <template #suffix>
            <n-button size="small" type="error" ghost>退出登录</n-button>
          </template>
        </n-list-item>

        <n-divider />

        <!-- Theme -->
        <!-- <n-list-item>
          <template #prefix>
            <n-icon :size="24"><dark-mode-outlined /></n-icon>
          </template>
          <n-thing title="深色模式" />
          <template #suffix>
            <n-switch v-model:value="isDarkMode" />
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
        <n-list-item aria-label="检查更新">
          <template #prefix>
            <span class="settings-icon-wrap" aria-hidden="true">
              <svg class="settings-icon" viewBox="0 0 20 20">
                <use href="#icon-crawl-days" />
              </svg>
            </span>
          </template>
          <n-thing title="最大爬取天数" description="1-30 天，修改后立即刷新" />
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

        <n-list-item>
          <template #prefix>
            <span class="settings-icon-wrap" aria-hidden="true">
              <svg class="settings-icon" viewBox="0 0 20 20">
                <use href="#icon-update" />
              </svg>
            </span>
          </template>
          <n-thing title="检查更新（正在开发中...）" :description="'当前版本: ' + curVersion" />
          <template #suffix>
            <n-spin v-if="isChecking" size="small" />
          </template>
        </n-list-item>
        
        <!-- About -->
        <n-list-item aria-label="关于 OJ Flow" @click="openUrl('https://github.com/Siborne/OJFlow')">
          <template #prefix>
            <span class="settings-icon-wrap" aria-hidden="true">
              <svg class="settings-icon" viewBox="0 0 20 20">
                <use href="#icon-info" />
              </svg>
            </span>
          </template>
          <n-thing title="关于 OJ Flow" description="开源地址" />
        </n-list-item>
        <n-divider />
    
        <!-- About -->
        <n-list-item aria-label="友链 OJ Helper" @click="openUrl('https://github.com/2754LM/oj_helper')">
          <template #prefix>
            <span class="settings-icon-wrap" aria-hidden="true">
              <svg class="settings-icon" viewBox="0 0 20 20">
                <use href="#icon-info" />
              </svg>
            </span>
          </template>
          <n-thing title="友链 OJ Helper" description="开源地址" />
        </n-list-item>
      </n-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useContestStore } from '../stores/contest';
import { NList, NListItem, NThing, NSpin, NSwitch, NSelect, NButton, NAvatar, NDivider, NInputNumber, useDialog, useMessage } from 'naive-ui';
import { ContestService } from '../services/contest';
import axios from 'axios';

const curVersion = 'v1.0.0';
const isChecking = ref(false);
const isUpdatingDays = ref(false);
const isDarkMode = ref(false);
const language = ref('zh-CN');
const dialog = useDialog();
const message = useMessage();
const store = useContestStore();
const maxDays = ref(store.day);
const pendingMaxDays = ref<number | null>(null);
let maxDaysDebounceTimer: any;

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
    message.success(`已更新为 ${store.day} 天`);
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
    const response = await axios.get('https://api.github.com/repos/2754LM/oj_helper/releases/latest');
    if (response.status === 200) {
      const latestVersion = response.data.tag_name;
      if (latestVersion !== curVersion) {
        dialog.info({
          title: '新版本可用',
          content: `新版本: ${latestVersion}`,
          positiveText: '前往更新',
          onPositiveClick: () => openUrl(response.data.html_url)
        });
      } else {
        message.info('已是最新版本');
      }
    }
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
  width: 20px;
  height: 20px;
  color: var(--settings-icon-default);
}

.settings-icon {
  width: 20px;
  height: 20px;
}

.settings-page :deep(.n-list-item:hover) .settings-icon-wrap {
  color: var(--settings-icon-hover);
}

.settings-page :deep(.n-list-item:active) .settings-icon-wrap {
  color: var(--settings-icon-active);
}
</style>
