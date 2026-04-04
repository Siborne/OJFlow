<template>
  <div class="date-tabs-container">
    <div class="date-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-item', { 'tab-item--active': modelValue === tab.id }]"
        @click="$emit('update:modelValue', tab.id)"
      >
        <span class="tab-label">{{ tab.label }}</span>
        <span class="tab-accent"></span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const tabs = [
  { id: 'today', label: '今天' },
  { id: 'tomorrow', label: '明天' },
  { id: 'thisWeek', label: '本周' },
  { id: 'all', label: '全部' },
];

defineProps<{
  modelValue: string;
}>();

defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<style scoped>
.date-tabs-container {
  margin-bottom: var(--space-3);
}

.date-tabs {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}

.tab-item {
  position: relative;
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all var(--motion-base) var(--motion-ease);
  outline: none;
}

.tab-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 0;
  background: var(--color-primary);
  border-radius: 999px;
  transition: height var(--motion-base) var(--motion-ease);
}

.tab-item:hover {
  background: rgba(14, 165, 233, 0.08);
  color: var(--color-text);
}

.tab-item--active {
  background: rgba(14, 165, 233, 0.12);
  color: var(--color-primary);
  font-weight: 600;
}

.tab-item--active::before {
  height: 20px;
}

.tab-label {
  position: relative;
  z-index: 1;
}

.tab-accent {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  pointer-events: none;
}

@media (max-width: 768px) {
  .date-tabs {
    gap: var(--space-1);
  }

  .tab-item {
    padding: 6px 12px;
    font-size: 13px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tab-item,
  .tab-item--active {
    animation: fade-only 140ms ease-out both !important;
    transition-duration: 0.01ms !important;
  }
}

@keyframes fade-only {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
