<template>
  <div class="rating-page">
    <div class="app-bar">
      <div class="app-bar-left">
        <n-button quaternary circle class="back-btn" @click="$router.back()">
          <template #icon>
            <n-icon :size="24"><arrow-back-outlined /></n-icon>
          </template>
        </n-button>
        <h2>分数查询</h2>
      </div>
      <div class="actions">
        <n-button quaternary circle @click="refreshAll">
          <template #icon>
            <n-icon :size="28"><search-outlined /></n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <div class="content">
      <div
        class="responsive-grid"
        :style="{
          '--cols': gridCols,
          '--gap': '24px'
        }"
      >
        <div v-for="platform in platforms" :key="platform" class="grid-item">
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
                  <template v-if="!isError[platform] && ratings[platform]">
                    <div class="rating-display">
                      <div class="rating-current">
                        <span class="rating-label">当前</span>
                        <span class="rating-value" :style="{ color: getRatingColor(ratings[platform].curRating) }">
                          {{ ratings[platform].curRating }}
                        </span>
                        <span class="rating-tier">{{ getRatingTierName(ratings[platform].curRating) }}</span>
                      </div>
                      <div class="rating-max">
                        <span class="rating-label">最高</span>
                        <span class="rating-value" :style="{ color: getRatingColor(ratings[platform].maxRating) }">
                          {{ ratings[platform].maxRating }}
                        </span>
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    {{ messages[platform] }}
                  </template>
                </div>
              </div>
            </div>
          </n-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, onUnmounted } from 'vue';
import { NButton, NIcon, NCard, NInput, NProgress } from 'naive-ui';
import { SearchOutlined, RefreshOutlined, ArrowBackOutlined } from '@vicons/material';
import { RatingService } from '../services/rating';
import { getRatingColor, getRatingTierName } from '../utils/rating-colors';
import HintTooltipIcon from '../components/HintTooltipIcon.vue';

const platforms = ['Codeforces', 'AtCoder', '力扣', '洛谷', '牛客'];
const usernames = reactive<Record<string, string>>({});
const loading = reactive<Record<string, boolean>>({});
const messages = reactive<Record<string, string>>({});
const isError = reactive<Record<string, boolean>>({});
const ratings = reactive<Record<string, { curRating: number; maxRating: number }>>({});
const gridCols = ref(3);

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

  calculateCols();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

const calculateCols = () => {
  const width = window.innerWidth;
  if (width >= 1300) {
    gridCols.value = 4;
  } else if (width >= 960) {
    gridCols.value = 3;
  } else if (width >= 480) {
    gridCols.value = 2;
  } else {
    gridCols.value = 1;
  }
};

const debounce = (fn: Function, delay: number) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

const handleResize = debounce(calculateCols, 100);

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
    ratings[platform] = { curRating: result.curRating, maxRating: result.maxRating };
    messages[platform] = 'ok';
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
  padding: 0 var(--space-4);
  height: 64px;
  background: var(--color-surface-muted);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
}

.app-bar-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.back-btn {
  color: var(--color-text-muted) !important;
}

.back-btn:hover {
  color: var(--color-primary) !important;
  background-color: var(--nav-hover-bg) !important;
}

.app-bar h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
}

@media (max-width: 768px) {
  .app-bar {
    padding: 0 12px;
    height: 56px;
  }

  .app-bar h2 {
    font-size: 17px;
  }
}

.content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.responsive-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols), 1fr);
  gap: var(--gap);
  width: 100%;
  transition: all 0.3s ease;
}

.grid-item {
  transition: all 0.3s ease;
  display: flex;
  justify-content: center;
}

.platform-card {
  border: 1px solid var(--color-border);
  width: 100%;
  min-width: 280px;
  max-width: 350px;
  transition: width 0.3s ease, transform 0.3s ease;
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

.rating-display {
  display: flex;
  justify-content: center;
  gap: 32px;
  padding: 4px 0;
}

.rating-current,
.rating-max {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.rating-label {
  font-size: 12px;
  color: var(--color-text-muted);
  font-weight: 500;
}

.rating-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.rating-tier {
  font-size: 11px;
  font-weight: 600;
  opacity: 0.8;
}
</style>
