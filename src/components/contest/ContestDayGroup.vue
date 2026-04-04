<template>
  <div class="day-group" :class="`day-group--${variant}`">
    <!-- Collapsible header for future/history days -->
    <div v-if="collapsible" class="day-group-header">
      <n-card :bordered="true" class="day-card day-card--collapsible" :class="{ 'day-card--history': variant === 'history' }" :content-style="{ padding: '0' }">
        <template #header>
          <div class="day-header-content" @click="$emit('toggle')">
            <span class="day-title" :class="{ 'day-title--history': variant === 'history' }">{{ title }}</span>
            <span class="day-count">({{ visibleCount }} 场)</span>
            <n-icon class="expand-icon" :class="{ 'is-expanded': expanded }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </n-icon>
          </div>
        </template>
      </n-card>
    </div>

    <!-- Non-collapsible header (today/tomorrow) -->
    <n-card
      v-if="!collapsible || expanded"
      :bordered="true"
      class="day-card"
      :class="{ 'day-card--content': collapsible, 'day-card--history-content': variant === 'history' }"
      :content-style="{ padding: '0' }"
    >
      <template v-if="!collapsible" #header>
        <span class="day-title">{{ title }}</span>
      </template>

      <div v-if="visibleCount === 0 && collapsible" class="no-contest">这里没有比赛喵~</div>
      <div v-else>
        <template v-for="(contest, idx) in contests" :key="idx">
          <contest-card
            v-if="selectedPlatforms[contest.platform]"
            :contest="contest"
            :now="now"
            :is-favorite="isFavorite(contest)"
            :platform-image="getPlatformImage(contest.platform)"
            @open="$emit('open-contest', $event)"
            @toggle-favorite="$emit('toggle-favorite', $event)"
          />
          <n-divider v-if="idx < contests.length - 1 && selectedPlatforms[contests[idx + 1]?.platform]" />
        </template>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NCard, NIcon, NDivider } from 'naive-ui';
import ContestCard from './ContestCard.vue';
import type { Contest } from '../../types';

const props = defineProps<{
  title: string;
  contests: Contest[];
  now: number;
  selectedPlatforms: Record<string, boolean>;
  isFavorite: (contest: Contest) => boolean;
  getPlatformImage: (platform: string) => string;
  variant?: 'today' | 'tomorrow' | 'future' | 'history';
  collapsible?: boolean;
  expanded?: boolean;
}>();

defineEmits<{
  toggle: [];
  'open-contest': [contest: Contest];
  'toggle-favorite': [contest: Contest];
}>();

const visibleCount = computed(() =>
  props.contests.filter((c) => props.selectedPlatforms[c.platform]).length,
);
</script>

<style scoped>
.day-group {
  margin-bottom: var(--space-3);
}

.day-group-header {
  margin-bottom: var(--space-2);
}

.day-card {
  border: 1px solid var(--card-border) !important;
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: transform var(--motion-base) var(--motion-ease), box-shadow var(--motion-base) var(--motion-ease);
}

.day-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--radius-lg);
  padding: 1px;
  background: linear-gradient(180deg, rgba(14, 165, 233, 0.14), rgba(52, 211, 153, 0.08));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.day-card:hover:not(.day-card--collapsible) {
  transform: translateY(-2px);
  box-shadow: var(--card-shadow-hover);
}

.day-card--collapsible .day-header-content {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  user-select: none;
  padding: 4px;
  margin: -4px;
  border-radius: var(--radius-sm);
  transition: all var(--motion-base) var(--motion-ease);
}

.day-card--collapsible .day-header-content:hover {
  background: rgba(14, 165, 233, 0.08);
}

.expand-icon {
  width: 18px;
  height: 18px;
  margin-left: auto;
  color: var(--color-text-muted);
  transition: transform var(--motion-base) var(--motion-ease);
  flex-shrink: 0;
}

.expand-icon.is-expanded {
  transform: rotate(180deg);
}

.day-title {
  font-size: 15px;
  font-weight: 620;
  color: var(--color-text);
}

.day-title--history {
  color: var(--color-text-soft);
}

.day-count {
  font-size: 13px;
  color: var(--color-text-muted);
}

.no-contest {
  padding: 20px;
  text-align: center;
  font-size: 14px;
  color: var(--color-text-muted);
}

.day-card :deep(.n-card__content),
.day-card :deep(.n-card__header) {
  background: transparent;
}

.day-card :deep(.n-card-header__main) {
  color: var(--color-text-soft);
}

.day-card :deep(.n-divider) {
  margin: 0;
  background-color: var(--card-divider);
}

.day-card :deep(.n-tag) {
  border-radius: 999px;
}

.day-card :deep(.n-button.n-button--primary-type.n-button--ghost) {
  border-color: rgba(14, 165, 233, 0.28);
  color: var(--color-primary);
}

.day-card :deep(.n-button.n-button--primary-type.n-button--ghost:hover) {
  border-color: rgba(14, 165, 233, 0.42);
  background-color: rgba(14, 165, 233, 0.08);
}

@media (prefers-reduced-motion: reduce) {
  .day-card {
    animation: fade-only 140ms ease-out both !important;
    transition-duration: 0.01ms !important;
  }

  .expand-icon.is-expanded {
    transform: none;
  }
}

@keyframes fade-only {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
