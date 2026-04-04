<template>
  <div class="summary-grid">
    <!-- 比赛总览 -->
    <n-card class="summary-card summary-card--overview" :bordered="true">
      <template #header><span>比赛总览</span></template>
      <div class="card-content fade-in">
        <div class="stats-group">
          <div class="stat-item">
            <div class="stat-label">可见</div>
            <div class="stat-value"><span class="number-flip">{{ visibleCount }}</span></div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-label">收藏</div>
            <div class="stat-value"><span class="number-flip">{{ favoriteCount }}</span></div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <div class="stat-label">进行中</div>
            <div class="stat-value"><span class="number-flip">{{ runningCount }}</span></div>
          </div>
        </div>
      </div>
    </n-card>

    <!-- 下一场 -->
    <n-card class="summary-card summary-card--next" :bordered="true">
      <template #header><span>下一场</span></template>
      <div class="card-content fade-in">
        <div v-if="nextContest" class="next-contest">
          <div class="next-name">{{ nextContest.name }}</div>
          <div class="next-meta">
            <span>{{ nextContest.platform }}</span>
            <span class="dot">&#xb7;</span>
            <span>{{ nextContest.startHourMinute }}</span>
          </div>
        </div>
        <div v-else class="next-empty">暂无比赛</div>
      </div>
    </n-card>

    <!-- 平台覆盖 -->
    <n-card class="summary-card summary-card--platforms" :bordered="true">
      <template #header><span>平台覆盖</span></template>
      <div class="card-content fade-in">
        <div class="platform-scroll-shell" role="region" aria-label="平台覆盖列表滚动区">
          <div class="platform-stats">
            <div v-for="p in platformsWithCount" :key="p.name" class="platform-item">
              <span class="platform-name">{{ p.name }}</span>
              <span class="platform-count"><span class="number-flip">{{ p.count }}</span></span>
            </div>
          </div>
        </div>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { NCard } from 'naive-ui';
import type { Contest } from '../../types';

defineProps<{
  visibleCount: number;
  favoriteCount: number;
  runningCount: number;
  nextContest: Contest | null;
  platformsWithCount: { name: string; count: number }[];
}>();
</script>

<style scoped>
.summary-grid {
  --summary-card-height: 272px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-3);
  align-items: stretch;
}

.summary-card {
  border: 1px solid var(--card-border) !important;
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  position: relative;
  overflow: hidden;
  height: var(--summary-card-height);
  min-height: var(--summary-card-height);
  display: flex;
  flex-direction: column;
}

.summary-card :deep(.n-card-header) { flex-shrink: 0; }
.summary-card :deep(.n-card__content) { flex: 1; min-height: 0; }

.summary-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(130deg, rgba(14, 165, 233, 0.12), rgba(52, 211, 153, 0.03) 42%, transparent 72%);
}

.card-content {
  position: relative;
  z-index: 1;
  height: 100%;
}

.fade-in {
  animation: fade-in 200ms var(--motion-ease) both;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: translateY(0); }
}

.stats-group {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: var(--space-2);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-muted);
  margin-bottom: 6px;
  font-weight: 500;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: var(--color-border);
  opacity: 0.5;
}

.number-flip {
  display: inline-block;
  transition: all 300ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.next-contest {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.next-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.next-meta {
  font-size: 13px;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot { opacity: 0.5; }

.next-empty {
  font-size: 14px;
  color: var(--color-text-muted);
  text-align: center;
  padding: 10px 0;
}

.platform-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-card--platforms .card-content { min-height: 0; }

.platform-scroll-shell {
  --scroll-mask-height: 16px;
  position: relative;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-text-muted) 50%, transparent) transparent;
}

.platform-scroll-shell::before,
.platform-scroll-shell::after {
  content: '';
  position: sticky;
  left: 0;
  right: 0;
  display: block;
  height: var(--scroll-mask-height);
  pointer-events: none;
  z-index: 2;
}

.platform-scroll-shell::before {
  top: 0;
  margin-bottom: calc(var(--scroll-mask-height) * -1);
  background: linear-gradient(to bottom, var(--color-surface) 25%, transparent 100%);
}

.platform-scroll-shell::after {
  bottom: 0;
  margin-top: calc(var(--scroll-mask-height) * -1);
  background: linear-gradient(to top, var(--color-surface) 25%, transparent 100%);
}

.platform-scroll-shell::-webkit-scrollbar { width: 6px; }
.platform-scroll-shell::-webkit-scrollbar-track { background: transparent; }
.platform-scroll-shell::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--color-text-muted) 42%, transparent);
  border-radius: 999px;
  border: 1px solid transparent;
}
.platform-scroll-shell::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(in srgb, var(--color-text-muted) 58%, transparent);
}

.platform-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid rgba(14, 165, 233, 0.08);
  transition: all var(--motion-base) var(--motion-ease);
}

.platform-item:last-child { border-bottom: none; }

.platform-item:hover {
  background: rgba(14, 165, 233, 0.04);
  padding: 8px 6px;
  border-radius: var(--radius-sm);
}

.platform-name { color: var(--color-text); font-weight: 500; }
.platform-count { color: var(--color-primary); font-weight: 600; }

@media (max-width: 1024px) {
  .summary-grid {
    --summary-card-height: 252px;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
}

@media (max-width: 768px) {
  .summary-grid {
    --summary-card-height: 224px;
    grid-template-columns: 1fr;
  }

  .stat-value { font-size: 20px; }
}

@media (prefers-reduced-motion: reduce) {
  .number-flip {
    animation: fade-only 140ms ease-out both !important;
    transition-duration: 0.01ms !important;
  }
}

@keyframes fade-only {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
