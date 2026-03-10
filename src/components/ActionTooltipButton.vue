<template>
  <n-tooltip :show="show" placement="bottom" trigger="manual">
    <template #trigger>
      <n-button
        v-bind="buttonAttrs"
        :aria-label="label"
        @mouseenter="onMouseEnter"
        @mouseleave="onMouseLeave"
        @focus="onFocus"
        @blur="onBlur"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
        @pointerleave="onPointerLeave"
        @click="onClick"
      >
        <template #icon>
          <slot name="icon" />
        </template>
        <slot />
      </n-button>
    </template>
    <span>{{ label }}</span>
  </n-tooltip>
</template>

<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue';
import { NButton, NTooltip } from 'naive-ui';
import appConfig from '../../electron/app.config.json';
import { t } from '../i18n';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  i18nKey: string;
}>();

const emit = defineEmits<{
  (e: 'click', ev: MouseEvent): void;
}>();

const attrs = useAttrs();

const showDelayMs = appConfig?.tooltip?.showDelayMs ?? 300;
const hideDelayMs = appConfig?.tooltip?.hideDelayMs ?? 150;
const longPressMs = appConfig?.tooltip?.longPressMs ?? 300;

const label = computed(() => t(props.i18nKey));

const buttonAttrs = computed(() => {
  const { onClick, ...rest } = attrs as Record<string, unknown>;
  return rest;
});

const show = ref(false);
let showTimer: any;
let hideTimer: any;
let longPressTimer: any;
let longPressed = false;

const clearTimers = () => {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  clearTimeout(longPressTimer);
};

const scheduleShow = (delay: number) => {
  clearTimeout(hideTimer);
  clearTimeout(showTimer);
  showTimer = setTimeout(() => {
    show.value = true;
  }, delay);
};

const scheduleHide = (delay: number) => {
  clearTimeout(showTimer);
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    show.value = false;
  }, delay);
};

const onMouseEnter = () => {
  scheduleShow(showDelayMs);
};

const onMouseLeave = () => {
  scheduleHide(hideDelayMs);
};

const onFocus = () => {
  scheduleShow(showDelayMs);
};

const onBlur = () => {
  scheduleHide(hideDelayMs);
};

const onPointerDown = () => {
  longPressed = false;
  clearTimeout(longPressTimer);
  longPressTimer = setTimeout(() => {
    longPressed = true;
    show.value = true;
  }, longPressMs);
};

const onPointerUp = () => {
  clearTimeout(longPressTimer);
  if (longPressed) scheduleHide(hideDelayMs);
};

const onPointerCancel = () => {
  clearTimers();
  show.value = false;
  longPressed = false;
};

const onPointerLeave = () => {
  clearTimeout(longPressTimer);
  if (longPressed) scheduleHide(hideDelayMs);
};

const onClick = (ev: MouseEvent) => {
  if (longPressed) {
    ev.preventDefault();
    ev.stopPropagation();
    longPressed = false;
    return;
  }
  emit('click', ev);
};
</script>
