<template>
  <div class="rating-page">
    <div class="app-bar">
      <h2>分数查询</h2>
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
              <div class="header-actions">
                <n-button quaternary circle @click="queryRating(platform)">
                  <template #icon>
                    <n-icon><refresh-outlined /></n-icon>
                  </template>
                </n-button>
                <HintTooltipIcon class="header-hint" :content="getRatingHint(platform)" ariaLabel="填写提示" placement="bottom-end" />
              </div>
            </div>
            
            <div class="card-body">
              <n-input
                v-model:value="usernames[platform]"
                :placeholder="platform === '牛客' ? '请输入ID' : '请输入用户名'"
                clearable
                @update:value="(v) => saveUsername(platform, v)"
                @keyup.enter="queryRating(platform)"
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
import { RatingService } from '../services/rating';
import HintTooltipIcon from '../components/HintTooltipIcon.vue';

const platforms = ['Codeforces', 'AtCoder', '力扣', '洛谷', '牛客'];
const usernames = reactive<Record<string, string>>({});
const loading = reactive<Record<string, boolean>>({});
const messages = reactive<Record<string, string>>({});
const isError = reactive<Record<string, boolean>>({});

// Import images
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

onMounted(() => {
  platforms.forEach(p => {
    usernames[p] = localStorage.getItem(`rating_username_${p}`) || '';
    loading[p] = false;
    messages[p] = '';
    isError[p] = false;
  });
});

const saveUsername = (platform: string, username: string) => {
  localStorage.setItem(`rating_username_${platform}`, username);
  messages[platform] = ''; // Clear message on input
};

const getRatingHint = (platform: string) => {
  const field = platform === '牛客' ? '字段：用户ID（数字）' : '字段：用户名';
  const example = platform === '牛客' ? '示例：100000' : '示例：tourist';
  return `${field}\n${example}\n时间范围：由站点接口决定（可能仅提供近一年/近若干场）\n注意：账号需公开，频繁查询可能触发限流`;
};

const queryRating = async (platform: string) => {
  const name = usernames[platform];
  if (!name) return;

  loading[platform] = true;
  messages[platform] = '';
  isError[platform] = false;

  try {
    const result = await RatingService.getRating(platform, name);
    messages[platform] = `当前Rating: ${result.curRating}, 最高Rating: ${result.maxRating}`;
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
      queryRating(p);
    }
  });
};
</script>

<style scoped>
.rating-page {
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

.content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.platform-card {
  border: 1px solid var(--color-border);
}

.card-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background-color: var(--color-surface-muted);
  border-bottom: 1px solid var(--color-border);
}

.platform-icon {
  width: 24px;
  height: 24px;
  margin-inline-end: 10px;
  border-radius: 4px;
}

.platform-name {
  font-weight: bold;
  font-size: 16px;
}

.spacer {
  flex: 1;
}

.header-actions {
  display: inline-flex;
  align-items: center;
}

.header-hint {
  margin-inline-start: 8px;
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
  color: var(--color-success);
  text-align: center;
}

.message.error {
  color: var(--color-error);
}
</style>
