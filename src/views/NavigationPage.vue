<template>
  <n-layout style="height: 100vh">
    <n-layout has-sider v-if="isWide">
      <n-layout-sider
        class="side-nav"
        bordered
        collapse-mode="width"
        :collapsed="true"
        :collapsed-width="64"
        :width="100"
        :native-scrollbar="false"
        style="padding-top: 10px; position: fixed; left: 0; top: 0; height: 100vh; z-index: 2000;"
      >
        <n-menu
          class="side-menu"
          v-model:value="activeKey"
          :collapsed="true"
          :collapsed-width="64"
          :collapsed-icon-size="24"
          :options="menuOptions"
          @update:value="handleMenuUpdate"
        />
      </n-layout-sider>
      <n-layout-content style="margin-left: 64px; min-height: 100vh; width: auto;">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </n-layout-content>
    </n-layout>

    <n-layout v-else class="mobile-shell">
      <n-layout-content class="mobile-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </n-layout-content>
      <n-layout-footer bordered class="mobile-footer">
        <div class="bottom-nav" role="navigation" aria-label="主导航">
          <div
            v-for="item in menuOptions"
            :key="item.key"
            class="nav-item"
            :class="{ active: activeKey === item.key }"
            @click="handleMenuUpdate(item.key)"
            @keydown.enter.prevent="handleMenuUpdate(item.key)"
            @keydown.space.prevent="handleMenuUpdate(item.key)"
            role="button"
            tabindex="0"
            :aria-current="activeKey === item.key ? 'page' : undefined"
          >
            <n-icon :size="22" :component="item.icon" />
            <span>{{ item.label }}</span>
          </div>
        </div>
      </n-layout-footer>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, h } from 'vue';
import type { Component } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { NLayout, NLayoutSider, NLayoutContent, NLayoutFooter, NMenu, NIcon } from 'naive-ui';
import { EventNoteOutlined, StarBorderOutlined, ListOutlined, SettingsOutlined } from '@vicons/material';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';

const router = useRouter();
const route = useRoute();
const activeKey = ref<string>('contest');
const isWide = ref(true);

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) });
}

const menuOptions = [
  {
    label: '比赛',
    key: 'contest',
    icon: renderIcon(EventNoteOutlined),
    path: '/contest'
  },
  {
    label: '收藏',
    key: 'star',
    icon: renderIcon(StarBorderOutlined),
    path: '/star'
  },
  {
    label: '功能',
    key: 'service',
    icon: renderIcon(ListOutlined),
    path: '/service'
  },
  {
    label: '设置',
    key: 'setting',
    icon: renderIcon(SettingsOutlined),
    path: '/setting'
  }
];

const checkLayout = () => {
  isWide.value = window.innerWidth > 768;
};

onMounted(() => {
  window.addEventListener('resize', checkLayout);
  checkLayout();
  
  // Sync active key with current route
  const currentPath = route.path;
  const found = menuOptions.find(opt => opt.path === currentPath);
  if (found) {
    activeKey.value = found.key;
  } else if (currentPath === '/') {
    // Default to contest
    router.replace('/contest');
    activeKey.value = 'contest';
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', checkLayout);
});

const handleMenuUpdate = (key: string) => {
  activeKey.value = key;
  const option = menuOptions.find(opt => opt.key === key);
  if (option) {
    router.push(option.path);
  }
};

// Keyboard shortcuts: Ctrl+1..4 for tabs handled inside composable
useKeyboardShortcuts();
</script>

<style scoped>
.side-nav {
  background: var(--nav-bg-color);
  backdrop-filter: blur(var(--frost-blur));
  -webkit-backdrop-filter: blur(var(--frost-blur));
  border-right: 1px solid var(--color-border);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
}

.side-menu :deep(.n-menu) {
  --n-item-border-radius: 12px;
  --n-item-text-color: var(--nav-text-color);
  --n-item-text-color-hover: var(--nav-hover-color);
  --n-item-text-color-active: var(--nav-active-color);
  --n-item-text-color-active-hover: var(--nav-active-color);
  --n-item-icon-color: var(--nav-text-color);
  --n-item-icon-color-hover: var(--nav-hover-color);
  --n-item-icon-color-active: var(--nav-active-color);
  --n-item-icon-color-active-hover: var(--nav-active-color);
  --n-item-color-active: var(--nav-active-bg);
  --n-item-color-active-hover: var(--nav-active-bg);
  --n-item-color-hover: var(--nav-hover-bg);
  --n-item-color-active-collapsed: var(--nav-active-bg);
  --n-item-font-size: 13px;
}

/* 覆盖 naive-ui 默认的成功绿色 */
.side-menu :deep(.n-menu-item-content--selected),
.side-menu :deep(.n-menu-item-content--selected .n-menu-item-content-header),
.side-menu :deep(.n-menu-item-content--selected .n-menu-item-content__icon) {
  color: var(--color-primary) !important;
}

.side-menu :deep(.n-menu-item.n-menu-item--selected) {
  position: relative;
}

/* 统一选中指示器样式 - 左侧指示条 */
.side-menu :deep(.n-menu-item--selected)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--color-primary);
  border-radius: 0 2px 2px 0;
}

.side-menu :deep(.n-menu-item-content),
.side-menu :deep(.n-menu-item-content-header),
.side-menu :deep(.n-menu-item-content__icon) {
  transition: color var(--motion-base) var(--motion-ease), background-color var(--motion-base) var(--motion-ease), transform var(--motion-fast) var(--motion-ease);
}

.mobile-shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.mobile-content {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom));
}

.mobile-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(var(--nav-height) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 3000;
  background: var(--nav-bg-color);
  backdrop-filter: blur(calc(var(--frost-blur) + 2px));
  -webkit-backdrop-filter: blur(calc(var(--frost-blur) + 2px));
  border-top: 1px solid var(--color-border);
  box-shadow: 0 -8px 20px rgba(15, 23, 42, 0.08);
}

.bottom-nav {
  height: var(--nav-height);
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 4px;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  color: var(--nav-text-color);
  min-width: 62px;
  padding: 6px 10px;
  border-radius: 12px;
  transition: color var(--motion-base) var(--motion-ease), background-color var(--motion-base) var(--motion-ease), box-shadow var(--motion-base) var(--motion-ease), transform var(--motion-fast) var(--motion-ease);
}

.nav-item.active {
  color: var(--nav-active-color);
  background-color: var(--nav-active-bg);
  box-shadow: inset 0 0 0 1px rgba(14, 165, 233, 0.16);
  position: relative;
}

/* 移动端选中指示器 - 顶部指示条，与桌面端呼应 */
.nav-item.active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 3px;
  background: var(--color-primary);
  border-radius: 0 0 2px 2px;
}

/* 选中动画效果 */
.nav-item.active {
  animation: navItemActivate var(--motion-base) var(--motion-ease);
}

@keyframes navItemActivate {
  0% {
    transform: scale(0.95);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

/* 图标微动画 */
.nav-item:active .n-icon {
  transform: scale(0.9);
}

.nav-item .n-icon {
  transition: transform var(--motion-fast) var(--motion-ease);
}

.nav-item:hover {
  color: var(--nav-hover-color);
  background-color: var(--nav-hover-bg);
  transform: translateY(-1px);
}

.nav-item:active {
  background-color: var(--nav-active-bg);
  transform: translateY(0) scale(0.99);
}

.nav-item:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.nav-item span {
  font-size: 11px;
  margin-top: 3px;
  line-height: 1.2;
  letter-spacing: 0.02em;
}

.mobile-shell :deep(.content),
.mobile-shell :deep(.scrollable) {
  height: auto !important;
  overflow: visible !important;
  flex: 0 0 auto !important;
}

@media (prefers-reduced-motion: reduce) {
  .nav-item:hover,
  .nav-item:active {
    transform: none;
  }
}
</style>
