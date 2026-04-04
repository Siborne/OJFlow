<template>
  <span
    class="platform-icon-badge"
    :style="{ '--badge-color': color }"
    :title="platform"
  >
    {{ abbr }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getPlatformColor, getPlatformAbbr } from '../utils/platform-icons';

const props = defineProps<{
  platform: string;
}>();

const color = computed(() => getPlatformColor(props.platform));
const abbr = computed(() => getPlatformAbbr(props.platform));
</script>

<style scoped>
.platform-icon-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  background: var(--badge-color, var(--color-text-muted));
  letter-spacing: -0.02em;
  flex-shrink: 0;
}
</style>
