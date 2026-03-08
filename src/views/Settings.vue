<template>
  <div class="settings-page">
    <div class="app-bar">
      <h2>设置中心</h2>
    </div>

    <div class="content">
      <n-list clickable hoverable>
        <!-- Account -->
        <n-list-item>
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
        <n-list-item>
          <template #prefix>
            <n-icon :size="24"><update-outlined /></n-icon>
          </template>
          <n-thing title="检查更新（正在开发中...）" :description="'当前版本: ' + curVersion" />
          <template #suffix>
            <n-spin v-if="isChecking" size="small" />
          </template>
        </n-list-item>
        
        <!-- About -->
        <n-list-item @click="openUrl('https://github.com/Siborne/OJFlow')">
          <template #prefix>
            <n-icon :size="24"><info-outlined /></n-icon>
          </template>
          <n-thing title="关于 OJ Flow" description="开源地址" />
        </n-list-item>
        <n-divider />
    
        <!-- About -->
        <n-list-item @click="openUrl('https://github.com/2754LM/oj_helper')">
          <template #prefix>
            <n-icon :size="24"><info-outlined /></n-icon>
          </template>
          <n-thing title="友链 OJ Helper" description="开源地址" />
        </n-list-item>
      </n-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NList, NListItem, NThing, NIcon, NSpin, NSwitch, NSelect, NButton, NAvatar, NDivider, useDialog, useMessage } from 'naive-ui';
import { UpdateOutlined, DarkModeOutlined, LanguageOutlined, DeleteOutlineOutlined, InfoOutlined } from '@vicons/material';
import { ContestService } from '../services/contest';
import axios from 'axios';

const curVersion = 'v1.0.0';
const isChecking = ref(false);
const isDarkMode = ref(false);
const language = ref('zh-CN');
const dialog = useDialog();
const message = useMessage();

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
  padding: 16px;
  overflow-y: auto;
}
</style>
