<template>
  <div class="settings-page">
    <div class="app-bar">
      <h2>设置中心</h2>
    </div>

    <div class="content">
      <div class="settings-summary-grid">
        <n-card class="settings-summary settings-summary--hero" :bordered="true">
          <template #header>系统状态</template>
          <div class="summary-value">{{ curVersion }}</div>
          <div class="summary-desc">当前保留天数 {{ maxDays }} · 更新状态 {{ isChecking ? '检查中' : '就绪' }}</div>
        </n-card>

        <n-card class="settings-summary settings-summary--small" :bordered="true">
          <template #header>保留天数</template>
          <div class="summary-minor">{{ maxDays }}</div>
        </n-card>

        <n-card class="settings-summary settings-summary--small" :bordered="true">
          <template #header>主题模式</template>
          <div class="summary-minor">{{ uiStore.colorMode }}</div>
        </n-card>
      </div>

      <n-card class="settings-list-card" :bordered="true">
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
        <n-list-item class="settings-row" :aria-label="retentionLabel" tabindex="0">
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
          class="settings-row settings-row--action"
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
            <div class="settings-row-suffix">
              <n-spin v-if="isChecking" size="small" />
              <span class="settings-row-affordance" aria-hidden="true">
                <svg class="settings-row-affordance-icon" viewBox="0 0 24 24">
                  <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
            </div>
          </template>
        </n-list-item>
        
        <!-- About -->
        <n-list-item
          class="settings-row settings-row--action"
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
          <n-thing title="关于 OJ Flow" description="开源地址:https://github.com/Siborne/OJFlow" />
          <template #suffix>
            <span class="settings-row-affordance" aria-hidden="true">
              <svg class="settings-row-affordance-icon" viewBox="0 0 24 24">
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
          </template>
        </n-list-item>
        <!-- About -->
        <n-list-item
          class="settings-row settings-row--action"
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
          <n-thing title="友链 OJ Helper" description="开源地址:https://github.com/2754LM/oj_helper" />
          <template #suffix>
            <span class="settings-row-affordance" aria-hidden="true">
              <svg class="settings-row-affordance-icon" viewBox="0 0 24 24">
                <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
          </template>
        </n-list-item>
        <!-- <n-divider /> -->
    
        
        </n-list>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useContestStore } from '../stores/contest';
import { NList, NListItem, NThing, NSpin, NSwitch, NButton, NAvatar, NDivider, NInputNumber, NCard, useDialog, useMessage } from 'naive-ui';
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
      dialog.warning({
        title: spec.title,
        content: spec.content,
        positiveText: spec.positiveText,
        negativeText: spec.negativeText,
        onPositiveClick: async () => {
          await checkForUpdate();
        },
      });
      return;
    }

    message.success('无更新');
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
  background: transparent;
}

.app-bar {
  display: flex;
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

.content {
  flex: 1;
  padding: var(--space-4);
  overflow-y: auto;
}

.settings-summary-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.settings-summary {
  border: 1px solid var(--card-border) !important;
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  position: relative;
  overflow: hidden;
}

.settings-summary::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(130deg, rgba(14, 165, 233, 0.14), rgba(52, 211, 153, 0.04) 52%, transparent 82%);
}

.settings-summary--hero {
  grid-column: span 8;
  min-height: 118px;
}

.settings-summary--small {
  grid-column: span 2;
  min-height: 118px;
}

.summary-value {
  font-size: 30px;
  line-height: 1.1;
  font-weight: 700;
  color: var(--color-primary);
}

.summary-desc {
  margin-top: 10px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.summary-minor {
  font-size: 22px;
  font-weight: 680;
  color: var(--color-text-soft);
}

.settings-list-card {
  border: 1px solid var(--card-border) !important;
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.settings-page :deep(.n-list) {
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
}

.settings-page :deep(.n-list-item) {
  padding-top: 14px;
  padding-bottom: 14px;
  transition: background-color var(--motion-base) var(--motion-ease), transform var(--motion-fast) var(--motion-ease);
}

.settings-page :deep(.n-list-item:hover) {
  background-color: rgba(14, 165, 233, 0.06);
}

.settings-page :deep(.settings-row--action:active) {
  transform: translateY(1px);
}

.settings-page :deep(.n-thing-header__title) {
  color: var(--color-text);
  font-weight: 600;
}

.settings-page :deep(.n-thing-main__description) {
  color: var(--color-text-muted);
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
  border-radius: 10px;
  transition: color var(--motion-base) var(--motion-ease), background-color var(--motion-base) var(--motion-ease), box-shadow var(--motion-base) var(--motion-ease);
}

.settings-icon {
  width: 24px;
  height: 24px;
}

.settings-row-suffix {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.settings-row-affordance {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--color-text-muted);
  opacity: 0;
  transition: opacity var(--motion-base) var(--motion-ease), transform var(--motion-base) var(--motion-ease);
}

.settings-row-affordance-icon {
  width: 18px;
  height: 18px;
}

.settings-page:dir(rtl) .settings-row-affordance-icon {
  transform: rotate(180deg);
}

.settings-page :deep(.settings-row--action:hover) .settings-row-affordance,
.settings-page :deep(.settings-row--action:focus) .settings-row-affordance,
.settings-page :deep(.settings-row--action:focus-within) .settings-row-affordance,
.settings-page :deep(.settings-row--action:focus-visible) .settings-row-affordance {
  opacity: 1;
  transform: translateX(1px);
}

.settings-page :deep(.n-list-item:hover) .settings-icon-wrap {
  color: var(--color-primary);
  background: rgba(14, 165, 233, 0.1);
  box-shadow: inset 0 0 0 1px rgba(14, 165, 233, 0.18);
}

.settings-page :deep(.n-list-item:active) .settings-icon-wrap {
  color: var(--settings-icon-active);
}

@media (max-width: 768px) {
  .settings-summary-grid {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }

  .settings-summary--hero,
  .settings-summary--small {
    grid-column: span 1;
    min-height: 0;
  }

  .app-bar {
    padding: 0 12px;
  }

  .app-bar h2 {
    font-size: 17px;
  }

  .content {
    padding: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .settings-page :deep(.n-list-item),
  .settings-row-affordance,
  .settings-icon-wrap {
    transition: opacity 120ms ease-out, color 120ms ease-out, background-color 120ms ease-out !important;
    transform: none !important;
  }
}
</style>
