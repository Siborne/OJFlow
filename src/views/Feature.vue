<template>
  <div class="feature-page">
    <div class="app-bar">
      <h2>功能列表</h2>
    </div>

    <div class="content scrollable">
      <div class="feature-summary-grid">
        <n-card class="feature-overview" :bordered="true">
          <template #header>能力面板</template>
          <div class="overview-main">{{ totalSolved }}</div>
          <div class="overview-sub">累计解题数 · 当前评分 {{ currentRating }}</div>
        </n-card>

        <n-card class="feature-kpi" :bordered="true">
          <template #header>峰值</template>
          <div class="kpi-value">{{ maxRating }}</div>
        </n-card>

        <n-card class="feature-kpi" :bordered="true">
          <template #header>模块</template>
          <div class="kpi-value">4</div>
        </n-card>
      </div>

      <div class="feature-bento-grid">
        <div class="feature-grid-cell feature-grid-cell--hero">
          <n-card
            title="解题数量"
            class="feature-card"
            role="button"
            tabindex="0"
            @click="router.push('/solved_num')"
            @keydown.enter.prevent="router.push('/solved_num')"
            @keydown.space.prevent="router.push('/solved_num')"
          >
            <template #header-extra>
              <n-icon size="20"><arrow-forward-outlined /></n-icon>
            </template>
            <div class="feature-content">
              <div class="stat-main">
                <span class="stat-label">总解题数</span>
                <span class="stat-value">{{ totalSolved }}</span>
              </div>
              <div class="stat-chart">
                <div class="pie-chart">
                  <n-progress type="circle" :percentage="75" status="success" :stroke-width="10">
                    <span style="font-size: 12px">Easy</span>
                  </n-progress>
                </div>
                <div class="trend-chart">
                  <span class="chart-label">近7日趋势</span>
                  <div class="mock-line-chart"></div>
                </div>
              </div>
            </div>
          </n-card>
        </div>

        <div class="feature-grid-cell feature-grid-cell--medium">
          <n-card
            title="排位分"
            class="feature-card"
            role="button"
            tabindex="0"
            @click="router.push('/rating')"
            @keydown.enter.prevent="router.push('/rating')"
            @keydown.space.prevent="router.push('/rating')"
          >
            <template #header-extra>
              <n-icon size="20"><arrow-forward-outlined /></n-icon>
            </template>
            <div class="feature-content feature-content--stack">
              <div class="stat-main">
                <span class="stat-label">当前Rating</span>
                <span class="stat-value">{{ currentRating }}</span>
                <span class="stat-sub">最高: {{ maxRating }}</span>
              </div>
              <div class="stat-chart full-width">
                <div class="trend-chart full-width">
                  <span class="chart-label">近30天变化</span>
                  <div class="mock-wave-chart"></div>
                </div>
              </div>
            </div>
          </n-card>
        </div>
        
        <div class="feature-grid-cell feature-grid-cell--small" v-for="i in 2" :key="i">
          <n-card class="feature-card placeholder">
            <div class="placeholder-content">敬请期待</div>
          </n-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NIcon, NProgress } from 'naive-ui';
import { ArrowForwardOutlined } from '@vicons/material';

const router = useRouter();
const totalSolved = ref(1284); // Mock data
const currentRating = ref(1850);
const maxRating = ref(1920);

</script>

<style scoped>
.feature-page {
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

.feature-summary-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.feature-overview,
.feature-kpi {
  border: 1px solid var(--card-border) !important;
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  position: relative;
  overflow: hidden;
}

.feature-overview::before,
.feature-kpi::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.14), rgba(52, 211, 153, 0.04) 50%, transparent 80%);
}

.feature-overview {
  grid-column: span 8;
  min-height: 122px;
}

.feature-kpi {
  grid-column: span 2;
  min-height: 122px;
}

.overview-main {
  font-size: 34px;
  line-height: 1.1;
  font-weight: 700;
  color: var(--color-primary);
}

.overview-sub {
  margin-top: 8px;
  color: var(--color-text-muted);
  font-size: 13px;
}

.kpi-value {
  font-size: 26px;
  font-weight: 680;
  color: var(--color-text-soft);
}

.feature-bento-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: var(--space-3);
}

.feature-grid-cell {
  grid-column: span 3;
}

.feature-grid-cell--hero {
  grid-column: span 7;
}

.feature-grid-cell--medium {
  grid-column: span 5;
}

.feature-card {
  cursor: pointer;
  border: 1px solid var(--card-border) !important;
  border-radius: var(--radius-lg);
  box-shadow: var(--card-shadow);
  transition: transform var(--motion-base) var(--motion-ease), box-shadow var(--motion-base) var(--motion-ease), border-color var(--motion-base) var(--motion-ease);
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(14, 165, 233, 0.12), rgba(52, 211, 153, 0.04));
  opacity: 0.9;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--card-shadow-hover);
  border-color: rgba(14, 165, 233, 0.2) !important;
}

.feature-card:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring), var(--card-shadow-hover);
}

.feature-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-main {
  display: flex;
  flex-direction: column;
}

.feature-content--stack {
  align-items: flex-start;
  gap: var(--space-3);
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-success);
}

.stat-label {
  font-size: 14px;
  color: var(--color-text-muted);
}

.stat-sub {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.stat-chart {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

.full-width {
  width: 100%;
}

.mock-line-chart {
  width: 100px;
  height: 40px;
  background: linear-gradient(90deg, var(--color-border) 0%, var(--color-success) 100%);
  mask: url('data:image/svg+xml;utf8,<svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg"><polyline points="0,40 20,30 40,35 60,10 80,20 100,5" fill="none" stroke="black" stroke-width="2"/></svg>');
  -webkit-mask: url('data:image/svg+xml;utf8,<svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg"><polyline points="0,40 20,30 40,35 60,10 80,20 100,5" fill="none" stroke="black" stroke-width="2"/></svg>');
  background-color: var(--color-success);
}

.mock-wave-chart {
  width: 100%;
  height: 50px;
  background:
    linear-gradient(180deg, rgba(14, 165, 233, 0.22), rgba(14, 165, 233, 0.08)),
    repeating-linear-gradient(90deg, rgba(15, 23, 42, 0.1), rgba(15, 23, 42, 0.1) 1px, transparent 1px, transparent 16px);
  border-radius: 10px;
}

.placeholder {
  opacity: 0.75;
  border: 1px dashed var(--color-border);
}

.placeholder-content {
  text-align: center;
  color: var(--color-text-muted);
  padding: 20px;
}

@media (max-width: 768px) {
  .app-bar {
    padding: 0 12px;
  }

  .app-bar h2 {
    font-size: 17px;
  }

  .content {
    padding: 12px;
  }

  .feature-summary-grid,
  .feature-bento-grid {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }

  .feature-overview,
  .feature-kpi,
  .feature-grid-cell,
  .feature-grid-cell--hero,
  .feature-grid-cell--medium {
    grid-column: span 1;
    min-height: 0;
  }

  .feature-content {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }
}

@media (prefers-reduced-motion: reduce) {
  .feature-card:hover {
    transform: none;
  }
}
</style>
