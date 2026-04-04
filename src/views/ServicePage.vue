<template>
  <div class="service-page">
    <div class="app-bar">
      <h2>功能列表</h2>
    </div>

    <div class="content scrollable">
      <!-- 已上线功能 -->
      <div class="section">
        <span class="section-label">可用功能</span>
        <div class="feature-grid">
          <div
            v-for="(item, idx) in availableServices"
            :key="item.title"
            class="feature-card animate-stagger-in"
            :class="`stagger-${idx + 1}`"
            role="button"
            tabindex="0"
            @click="router.push(item.path)"
            @keydown.enter.prevent="router.push(item.path)"
            @keydown.space.prevent="router.push(item.path)"
          >
            <div class="card-accent"></div>
            <div class="card-content">
              <div class="icon-wrapper" :style="{ background: item.iconBg }">
                <n-icon :size="26" :color="item.iconColor">
                  <component :is="item.icon" />
                </n-icon>
              </div>
              <div class="card-text">
                <span class="card-title">{{ item.title }}</span>
                <span class="card-desc">{{ item.desc }}</span>
              </div>
              <n-icon class="card-arrow" :size="18" color="var(--color-text-muted)">
                <arrow-forward-outlined />
              </n-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- 即将上线 -->
      <div class="section">
        <span class="section-label">即将上线</span>
        <div class="feature-grid feature-grid--upcoming">
          <div
            v-for="(item, idx) in upcomingServices"
            :key="item.title"
            class="feature-card feature-card--disabled animate-stagger-in"
            :class="`stagger-${idx + 1}`"
            @click="message.info('功能开发中，敬请期待')"
          >
            <div class="card-content">
              <div class="icon-wrapper icon-wrapper--muted" :style="{ background: item.iconBg }">
                <n-icon :size="26" :color="item.iconColor">
                  <component :is="item.icon" />
                </n-icon>
              </div>
              <div class="card-text">
                <span class="card-title">{{ item.title }}</span>
                <span class="card-desc">{{ item.desc }}</span>
              </div>
              <n-tag size="tiny" :bordered="false" type="default" class="card-tag">待开放</n-tag>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon, NTag, useMessage } from 'naive-ui';
import {
  ArrowForwardOutlined,
  FormatListNumberedOutlined,
  LeaderboardOutlined,
  EmojiEventsOutlined,
  SchoolOutlined,
  AssessmentOutlined
} from '@vicons/material';

const router = useRouter();
const message = useMessage();

interface ServiceItem {
  title: string;
  desc: string;
  path: string;
  icon: typeof FormatListNumberedOutlined;
  iconBg: string;
  iconColor: string;
  available: boolean;
}

const allServices: ServiceItem[] = [
  {
    title: '解题数量',
    desc: '查询各平台累计解题数',
    path: '/solved_num',
    icon: FormatListNumberedOutlined,
    iconBg: 'linear-gradient(135deg, #d1fae5 0%, #6ee7b7 100%)',
    iconColor: '#059669',
    available: true
  },
  {
    title: '排位分查询',
    desc: '查询各平台 Rating 分数',
    path: '/rating',
    icon: LeaderboardOutlined,
    iconBg: 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)',
    iconColor: '#2563eb',
    available: true
  },
  {
    title: 'CCPC 获奖',
    desc: '查询竞赛获奖记录',
    path: '/ccpc',
    icon: EmojiEventsOutlined,
    iconBg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    iconColor: '#d97706',
    available: false
  },
  {
    title: 'OIER 排名',
    desc: '查看 OI 竞赛排名',
    path: '/oier',
    icon: SchoolOutlined,
    iconBg: 'linear-gradient(135deg, #fce7f3 0%, #f9a8d4 100%)',
    iconColor: '#db2777',
    available: false
  },
  {
    title: 'CF 年度报告',
    desc: '生成 Codeforces 年度总结',
    path: '/cf_report',
    icon: AssessmentOutlined,
    iconBg: 'linear-gradient(135deg, #fef9c3 0%, #fde047 100%)',
    iconColor: '#ca8a04',
    available: false
  }
];

const availableServices = computed(() => allServices.filter(s => s.available));
const upcomingServices = computed(() => allServices.filter(s => !s.available));
</script>

<style scoped>
.service-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
}

/* ---- App Bar ---- */
.app-bar {
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  height: 64px;
  background: var(--color-surface-muted);
  border-bottom: 1px solid var(--color-border);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
  flex-shrink: 0;
}

.app-bar h2 {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 650;
}

/* ---- Content ---- */
.content {
  flex: 1;
  padding: var(--space-5);
  overflow-y: auto;
}

/* ---- Section ---- */
.section {
  margin-bottom: var(--space-5);
}

.section:last-child {
  margin-bottom: 0;
}

.section-label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-3);
  padding-left: 2px;
}

/* ---- Grid ---- */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-3);
}

/* ---- Card base ---- */
.feature-card {
  position: relative;
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  box-shadow: var(--card-shadow);
  cursor: pointer;
  overflow: hidden;
  transition:
    transform var(--motion-base) var(--motion-ease),
    box-shadow var(--motion-base) var(--motion-ease),
    border-color var(--motion-base) var(--motion-ease);
}

.feature-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--card-shadow-hover);
  border-color: rgba(14, 165, 233, 0.22);
}

.feature-card:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring), var(--card-shadow-hover);
}

.feature-card:active {
  transform: translateY(0) scale(0.99);
}

/* Accent gradient strip on top of available cards */
.card-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-success));
  opacity: 0;
  transition: opacity var(--motion-base) var(--motion-ease);
}

.feature-card:hover .card-accent {
  opacity: 1;
}

/* ---- Card content ---- */
.card-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
}

.icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform var(--motion-base) var(--motion-ease);
}

.feature-card:hover .icon-wrapper {
  transform: scale(1.06);
}

.icon-wrapper--muted {
  opacity: 0.7;
}

.card-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.card-title {
  font-size: var(--font-size-lg);
  font-weight: 620;
  color: var(--color-text);
}

.card-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-arrow {
  flex-shrink: 0;
  transition:
    transform var(--motion-base) var(--motion-ease),
    color var(--motion-base) var(--motion-ease);
}

.feature-card:hover .card-arrow {
  transform: translateX(4px);
  color: var(--color-primary) !important;
}

.card-tag {
  flex-shrink: 0;
}

/* ---- Disabled state ---- */
.feature-card--disabled {
  opacity: 0.58;
  cursor: default;
  box-shadow: none;
  border-style: dashed;
}

.feature-card--disabled:hover {
  transform: none;
  box-shadow: none;
  border-color: var(--card-border);
}

/* ---- Responsive ---- */
@media (max-width: 768px) {
  .app-bar {
    padding: 0 var(--space-3);
    height: 56px;
  }

  .app-bar h2 {
    font-size: 17px;
  }

  .content {
    padding: var(--space-4);
  }

  .feature-grid {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }

  .card-content {
    padding: var(--space-3) var(--space-4);
  }
}

/* ---- Reduced motion ---- */
@media (prefers-reduced-motion: reduce) {
  .feature-card:hover {
    transform: none;
  }

  .feature-card:hover .icon-wrapper {
    transform: none;
  }

  .card-accent {
    opacity: 1;
  }
}
</style>
