<template>
  <div class="contest-card" :class="[`contest-card--${state}`]">
    <div class="platform-icon">
      <img :src="platformImage" :alt="contest.platform" />
    </div>
    <div
      class="contest-info"
      role="button"
      tabindex="0"
      @click="$emit('open', contest)"
      @keydown.enter.prevent="$emit('open', contest)"
      @keydown.space.prevent="$emit('open', contest)"
    >
      <div class="contest-name">{{ contest.name }}</div>
      <div class="contest-meta">
        <span class="contest-time">{{ contest.startHourMinute }} - {{ contest.endHourMinute }}</span>
        <n-tag size="small" :type="stateType">{{ stateLabel }}</n-tag>
        <n-tag v-if="countdown" type="success" size="small" class="countdown-tag">
          {{ countdown }}
        </n-tag>
      </div>
    </div>
    <div class="contest-action">
      <n-button size="small" type="primary" ghost @click.stop="$emit('open', contest)">参赛</n-button>
      <n-button quaternary circle @click.stop="$emit('toggle-favorite', contest)">
        <template #icon>
          <n-icon :size="24" :color="isFavorite ? 'var(--color-warning)' : undefined">
            <star-outlined v-if="!isFavorite" />
            <star-filled v-else />
          </n-icon>
        </template>
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NButton, NIcon, NTag } from 'naive-ui';
import { StarOutlined, StarFilled } from '@vicons/material';
import type { Contest } from '../../types';

const props = defineProps<{
  contest: Contest;
  now: number;
  isFavorite: boolean;
  platformImage: string;
}>();

defineEmits<{
  open: [contest: Contest];
  'toggle-favorite': [contest: Contest];
}>();

type ContestState = 'upcoming' | 'running' | 'ended';

const state = computed<ContestState>(() => {
  const start = props.contest.startTimeSeconds * 1000;
  const end = start + props.contest.durationSeconds * 1000;
  if (props.now < start) return 'upcoming';
  if (props.now >= start && props.now <= end) return 'running';
  return 'ended';
});

const stateLabel = computed(() => {
  if (state.value === 'upcoming') return '即将开始';
  if (state.value === 'running') return '进行中';
  return '已结束';
});

const stateType = computed(() => {
  if (state.value === 'upcoming') return 'info';
  if (state.value === 'running') return 'success';
  return 'default';
});

const countdown = computed(() => {
  if (!props.contest.startTimeSeconds) return null;
  const diff = props.contest.startTimeSeconds * 1000 - props.now;
  if (diff <= 0 || diff > 24 * 60 * 60 * 1000) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}小时${minutes}分后`;
});
</script>

<style scoped>
.contest-card {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  position: relative;
}

.contest-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  bottom: 10px;
  width: 3px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.45);
}

.contest-card--upcoming::before {
  background: rgba(14, 165, 233, 0.7);
}

.contest-card--running::before {
  background: rgba(52, 211, 153, 0.78);
}

.contest-card--ended::before {
  background: rgba(148, 163, 184, 0.62);
}

.platform-icon img {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.contest-info {
  flex: 1;
  margin-left: 14px;
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.contest-info:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.contest-name {
  font-size: 14px;
  font-weight: 610;
  margin-bottom: 4px;
  color: var(--color-text);
}

.contest-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.contest-time {
  font-size: 12px;
  color: var(--color-text-muted);
}

.contest-action {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .contest-card {
    padding: 12px;
  }

  .contest-name {
    font-size: 13px;
  }
}
</style>
