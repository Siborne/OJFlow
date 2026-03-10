<template>
  <n-tooltip
    :show="show"
    :placement="placement"
    :show-arrow="true"
    trigger="manual"
    :style="{ maxWidth: `${maxWidth}px` }"
  >
    <template #trigger>
      <span
        class="hint-icon"
        role="button"
        tabindex="0"
        :aria-label="ariaLabel"
        @mouseenter="onMouseEnter"
        @mouseleave="onMouseLeave"
        @focus="onFocus"
        @blur="onBlur"
      >
        <svg viewBox="0 0 24 24" class="hint-icon-svg" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
          <path d="M12 10.8v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M12 8h.01" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
        </svg>
      </span>
    </template>
    <div class="hint-tooltip-content">{{ content }}</div>
  </n-tooltip>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { NTooltip } from 'naive-ui';

const props = withDefaults(
  defineProps<{
    content: string;
    ariaLabel: string;
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
    maxWidth?: number;
    hideDelayMs?: number;
  }>(),
  {
    placement: 'bottom',
    maxWidth: 240,
    hideDelayMs: 200,
  }
);

const show = ref(false);
let hideTimer: any;

const onMouseEnter = () => {
  clearTimeout(hideTimer);
  show.value = true;
};

const onMouseLeave = () => {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    show.value = false;
  }, props.hideDelayMs);
};

const onFocus = () => {
  clearTimeout(hideTimer);
  show.value = true;
};

const onBlur = () => {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    show.value = false;
  }, props.hideDelayMs);
};
</script>

<style scoped>
.hint-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--color-text-muted);
  opacity: 0.4;
  cursor: default;
  transition: opacity 120ms ease, color 120ms ease, box-shadow 120ms ease;
}

.hint-icon:hover {
  opacity: 1;
  cursor: pointer;
}

.hint-icon:focus-visible {
  opacity: 1;
  outline: none;
  box-shadow: 0 0 0 2px var(--nav-active-color);
}

.hint-icon-svg {
  width: 16px;
  height: 16px;
}

.hint-tooltip-content {
  white-space: pre-line;
  text-align: start;
}
</style>

