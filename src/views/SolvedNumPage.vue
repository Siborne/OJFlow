<template>
  <div class="solved-page">
    <div class="app-bar">
      <h2>解题数量</h2>
      <div class="actions">
        <n-button quaternary circle @click="refreshAll">
          <template #icon>
            <n-icon :size="28"><search-outlined /></n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <div class="content">
      <n-grid :x-gap="12" :y-gap="12" cols="1 s:1 m:2 l:2 xl:3" responsive="screen">
        <n-grid-item v-for="platform in platforms" :key="platform">
          <n-card class="platform-card" :content-style="{ padding: '0' }">
            <div class="card-header">
              <img :src="getPlatformImage(platform)" class="platform-icon" />
              <span class="platform-name">{{ platform }}</span>
              <div class="spacer"></div>
              <n-button quaternary circle @click="querySolved(platform)">
                <template #icon>
                  <n-icon><refresh-outlined /></n-icon>
                </template>
              </n-button>
            </div>
            
            <div class="card-body">
              <n-input
                v-model:value="usernames[platform]"
                :placeholder="getPlaceholder(platform)"
                clearable
                @update:value="(v) => saveUsername(platform, v)"
                @keyup.enter="querySolved(platform)"
              >
              </n-input>
              
              <div class="status-area">
                <n-progress
                  v-if="loading[platform]"
                  type="line"
                  :percentage="undefined" 
                  processing
                  :show-indicator="false"
                  style="margin-top: 10px;"
                />
                
                <div v-if="messages[platform]" class="message" :class="{ error: isError[platform] }">
                  {{ messages[platform] }}
                </div>
              </div>
            </div>
          </n-card>
        </n-grid-item>
      </n-grid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { NButton, NIcon, NGrid, NGridItem, NCard, NInput, NProgress } from 'naive-ui';
import { SearchOutlined, RefreshOutlined } from '@vicons/material';
import { SolvedNumService } from '../services/solved';

const platforms = [
  'Codeforces', 'AtCoder', 'VJudge', 'HDU', 'POJ', 'QOJ', '洛谷', '牛客', '力扣'
];

const usernames = reactive<Record<string, string>>({});
const loading = reactive<Record<string, boolean>>({});
const messages = reactive<Record<string, string>>({});
const isError = reactive<Record<string, boolean>>({});

// Import images
const images: Record<string, string> = {
  'Codeforces': new URL('../assets/platforms/Codeforces.jpg', import.meta.url).href,
  'AtCoder': new URL('../assets/platforms/AtCoder.jpg', import.meta.url).href,
  'VJudge': new URL('../assets/platforms/VJudge.jpg', import.meta.url).href,
  'HDU': new URL('../assets/platforms/hdu.jpg', import.meta.url).href,
  'POJ': new URL('../assets/platforms/poj.jpg', import.meta.url).href,
  'QOJ': new URL('../assets/platforms/qoj.jpg', import.meta.url).href,
  '洛谷': new URL('../assets/platforms/Luogu.jpg', import.meta.url).href,
  '牛客': new URL('../assets/platforms/Nowcoder.jpg', import.meta.url).href,
  '力扣': new URL('../assets/platforms/LeetCode.jpg', import.meta.url).href,
  'Other': new URL('../assets/platforms/Other.jpg', import.meta.url).href,
};

const getPlatformImage = (platform: string) => {
  return images[platform] || images['Other'];
};

const getPlaceholder = (platform: string) => {
  if (platform === '牛客') return '请输入ID';
  return '请输入用户名';
};

onMounted(() => {
  platforms.forEach(p => {
    usernames[p] = localStorage.getItem(`solved_username_${p}`) || '';
    loading[p] = false;
    messages[p] = '';
    isError[p] = false;
  });
});

const saveUsername = (platform: string, username: string) => {
  localStorage.setItem(`solved_username_${platform}`, username);
  messages[platform] = ''; 
};

const querySolved = async (platform: string) => {
  const name = usernames[platform];
  if (!name) return;

  loading[platform] = true;
  messages[platform] = '';
  isError[platform] = false;

  try {
    const result = await SolvedNumService.getSolvedNum(platform, name);
    messages[platform] = `解题数: ${result.solvedNum}`;
  } catch (e) {
    messages[platform] = '查询失败，请检查网络或用户名是否正确';
    isError[platform] = true;
  } finally {
    loading[platform] = false;
  }
};

const refreshAll = () => {
  platforms.forEach(p => {
    if (usernames[p]) {
      querySolved(p);
    }
  });
};
</script>

<style scoped>
.solved-page {
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

.content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.platform-card {
  border: 1px solid #e0e0e0;
}

.card-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background-color: #f0f2f5;
  border-bottom: 1px solid #e0e0e0;
}

.platform-icon {
  width: 24px;
  height: 24px;
  margin-right: 10px;
  border-radius: 4px;
}

.platform-name {
  font-weight: bold;
  font-size: 16px;
}

.spacer {
  flex: 1;
}

.card-body {
  padding: 16px;
}

.status-area {
  min-height: 40px;
  margin-top: 8px;
}

.message {
  margin-top: 8px;
  font-size: 14px;
  color: #18a058;
  text-align: center;
}

.message.error {
  color: #d03050;
}
</style>
