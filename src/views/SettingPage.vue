<template>
  <div class="setting-page">
    <div class="app-bar">
      <h2>设置中心</h2>
    </div>

    <div class="content">
      <n-list clickable hoverable>
        <n-list-item @click="checkForUpdate">
          <template #prefix>
            <n-icon :size="24"><update-outlined /></n-icon>
          </template>
          <n-thing title="检查更新" description="检查有无新版本" />
          <template #suffix>
            <n-spin v-if="isChecking" size="small" />
          </template>
        </n-list-item>

        <n-list-item @click="openUrl('https://cczu-ossa.github.io/home/')">
          <template #prefix>
            <n-icon :size="24"><home-outlined /></n-icon>
          </template>
          <n-thing title="官方网站" description="源神.常州大学.com" />
        </n-list-item>

        <n-list-item @click="openUrl('https://github.com/2754LM/oj_helper')">
          <template #prefix>
            <n-icon :size="24"><link-outlined /></n-icon>
          </template>
          <n-thing title="开源地址" description="https://github.com/2754LM/oj_helper" />
        </n-list-item>
      </n-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NList, NListItem, NThing, NIcon, NSpin, useDialog, useMessage } from 'naive-ui';
import { UpdateOutlined, HomeOutlined, LinkOutlined } from '@vicons/material';
import { ContestService } from '../services/contest';
import axios from 'axios';

// Get version from package.json or hardcode
const curVersion = 'v1.0.0';
const isChecking = ref(false);
const dialog = useDialog();
const message = useMessage();

const openUrl = (url: string) => {
  ContestService.openUrl(url);
};

const checkForUpdate = async () => {
  if (isChecking.value) return;
  isChecking.value = true;
  
  try {
    const response = await axios.get('https://api.github.com/repos/2754LM/oj_helper/releases/latest');
    if (response.status === 200) {
      const latestVersion = response.data.tag_name;
      const releaseBody = response.data.body;
      
      if (latestVersion !== curVersion) {
        dialog.info({
          title: '新版本可用',
          content: `当前版本: ${curVersion}\n新版本: ${latestVersion}\n\n版本说明:\n${releaseBody}`,
          positiveText: '前往更新',
          negativeText: '暂不更新',
          onPositiveClick: () => {
            openUrl('https://github.com/2754LM/oj_helper/releases/latest');
          }
        });
      } else {
        message.info(`当前版本(${curVersion})已是最新`);
      }
    } else {
      message.error('无法获取最新版本信息');
    }
  } catch (e) {
    message.error('检查更新时发生错误');
  } finally {
    isChecking.value = false;
  }
};
</script>

<style scoped>
.setting-page {
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
