<template>
  <n-modal v-model:show="visible" preset="dialog" title="筛选平台">
    <div class="filter-content">
      <div class="filter-item">
        <span>显示无赛程日</span>
        <n-switch :value="showEmptyDay" @update:value="$emit('update:showEmptyDay', $event)" />
      </div>
      <n-divider />
      <div v-for="platform in platforms" :key="platform" class="filter-item">
        <n-checkbox
          :checked="selectedPlatforms[platform]"
          @update:checked="(v: boolean) => $emit('toggle-platform', platform, v)"
        >
          {{ platform }}
        </n-checkbox>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NModal, NSwitch, NDivider, NCheckbox } from 'naive-ui';

const props = defineProps<{
  show: boolean;
  showEmptyDay: boolean;
  selectedPlatforms: Record<string, boolean>;
  platforms: string[];
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  'update:showEmptyDay': [value: boolean];
  'toggle-platform': [platform: string, value: boolean];
}>();

const visible = computed({
  get: () => props.show,
  set: (v) => emit('update:show', v),
});
</script>

<style scoped>
.filter-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
