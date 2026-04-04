<template>
  <div class="skeleton-card">
    <div class="skeleton-header">
      <div class="skeleton-line skeleton-line--short"></div>
    </div>
    <div class="skeleton-body">
      <div class="skeleton-row" v-for="i in rows" :key="i">
        <div class="skeleton-circle"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line skeleton-line--long"></div>
          <div class="skeleton-line skeleton-line--medium"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  rows?: number;
}>();
</script>

<style scoped>
.skeleton-card {
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  padding: 20px;
  margin-bottom: var(--space-3);
}

.skeleton-header {
  margin-bottom: 16px;
}

.skeleton-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.skeleton-circle {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--color-surface-muted);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: var(--color-surface-muted);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-line--short { width: 30%; }
.skeleton-line--medium { width: 60%; }
.skeleton-line--long { width: 85%; }

@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-circle,
  .skeleton-line {
    animation: none;
    opacity: 0.6;
  }
}
</style>
