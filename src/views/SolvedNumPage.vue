<template>
  <div class="solved-page">
    <div class="app-bar">
      <div class="app-bar-left">
        <n-button quaternary circle class="back-btn" @click="$router.back()">
          <template #icon>
            <n-icon :size="24"><arrow-back-outlined /></n-icon>
          </template>
        </n-button>
        <h2>解题数量</h2>
      </div>
      <div class="actions">
        <n-button quaternary circle @click="refreshAll">
          <template #icon>
            <n-icon :size="28"><search-outlined /></n-icon>
          </template>
        </n-button>
        <n-button quaternary circle @click="showStats = !showStats">
          <template #icon>
            <n-icon :size="28"><bar-chart-outlined /></n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <transition name="slide-down">
      <StatsPanel 
        v-if="showStats" 
        :visible="showStats" 
        :data="statsData"
        @close="showStats = false"
      />
    </transition>

    <div class="content">
      <div 
        class="responsive-grid" 
        :style="{ 
          '--cols': gridCols,
          '--gap': '24px'
        }"
      >
        <div 
          v-for="platform in platforms" 
          :key="platform" 
          class="grid-item"
        >
          <n-card class="platform-card" :content-style="{ padding: '0' }">
            <div class="card-header">
              <img :src="getPlatformImage(platform)" class="platform-icon" />
              <span class="platform-name">{{ platform }}</span>
              <div class="spacer"></div>
              <div class="header-actions">
                <n-button quaternary circle @click="querySolved(platform)">
                  <template #icon>
                    <n-icon><refresh-outlined /></n-icon>
                  </template>
                </n-button>
                <HintTooltipIcon class="header-hint" :content="getSolvedHint(platform)" ariaLabel="填写提示" placement="bottom-end" />
              </div>
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
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';
import { NButton, NIcon, NCard, NInput, NProgress } from 'naive-ui';
import { SearchOutlined, RefreshOutlined, BarChartOutlined, ArrowBackOutlined } from '@vicons/material';
import { SolvedNumService } from '../services/solved';
import StatsPanel from '../components/StatsPanel.vue';
import HintTooltipIcon from '../components/HintTooltipIcon.vue';

const platforms = [
  'Codeforces', 'AtCoder', 'VJudge', 'HDU', 'POJ', '蓝桥', '洛谷', '牛客', '力扣'
];

const usernames = reactive<Record<string, string>>({});
const loading = reactive<Record<string, boolean>>({});
const messages = reactive<Record<string, string>>({});
const isError = reactive<Record<string, boolean>>({});
const solvedCounts = reactive<Record<string, number>>({});
const showStats = ref(false);
const gridCols = ref(3);

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
  '蓝桥': new URL('../assets/platforms/Lanqiao.jpg', import.meta.url).href,
};

const getPlatformImage = (platform: string) => {
  return images[platform] || images['Other'];
};

const getPlaceholder = (platform: string) => {
  if (platform === '牛客') return '请输入ID';
  return '请输入用户名';
};

const getSolvedHint = (platform: string) => {
  const field = platform === '牛客' ? '字段：用户ID（数字）' : '字段：用户名';
  const example = platform === '牛客' ? '示例：100000' : '示例：tourist';
  return `${field}\n${example}\n时间范围：不支持按时间筛选（累计值）\n注意：频繁查询可能触发限流`;
};

const statsData = computed(() => {
  return Object.keys(solvedCounts)
    .filter(p => solvedCounts[p] > 0)
    .map(p => ({ platform: p, count: solvedCounts[p] }));
});

// Responsive Grid Logic
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
  let timer: any = null;
  return (...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(null, args);
    }, delay);
  };
};

const handleResize = debounce(calculateCols, 100);

onMounted(() => {
  platforms.forEach(p => {
    usernames[p] = localStorage.getItem(`solved_username_${p}`) || '';
    loading[p] = false;
    messages[p] = '';
    isError[p] = false;
    solvedCounts[p] = 0;
  });
  
  // Initial calculation
  calculateCols();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
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
    solvedCounts[platform] = result.solvedNum;
  } catch (e) {
    messages[platform] = '查询失败，请检查网络或用户名是否正确';
    isError[platform] = true;
    solvedCounts[platform] = 0;
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
  background-color: var(--color-surface);
  position: relative;
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

.actions {
  display: flex;
  gap: 8px;
}

.content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

/* Responsive Grid Styles */
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(var(--cols), 1fr);
  gap: var(--gap);
  width: 100%;
  transition: all 0.3s ease; /* Transition for grid changes (though tracks animate poorly, content does) */
}

.grid-item {
  transition: all 0.3s ease; /* Smooth transition for item resizing */
  display: flex;
  justify-content: center; /* Center card if it hits max-width */
}

.header-actions {
  display: inline-flex;
  align-items: center;
}

.header-hint {
  margin-inline-start: 8px;
}

.platform-card {
  border: 1px solid var(--color-border);
  width: 100%;
  min-width: 280px; /* Requirement 4 */
  max-width: 350px; /* Requirement 4 */
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

/* Transition for stats panel */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
</style>
