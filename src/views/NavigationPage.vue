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
</script>

<style scoped>
.side-nav {
  background: var(--nav-bg-color);
}

.side-menu :deep(.n-menu) {
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
  padding: 6px 8px;
  border-radius: 12px;
  transition: color 140ms ease, background-color 140ms ease, box-shadow 140ms ease;
}

.nav-item.active {
  color: var(--nav-active-color);
  background-color: var(--nav-active-bg);
}

.nav-item:hover {
  color: var(--nav-hover-color);
  background-color: var(--nav-hover-bg);
}

.nav-item:active {
  background-color: var(--nav-active-bg);
}

.nav-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--nav-active-color);
}

.nav-item span {
  font-size: 12px;
  margin-top: 4px;
}

.mobile-shell :deep(.content),
.mobile-shell :deep(.scrollable) {
  height: auto !important;
  overflow: visible !important;
  flex: 0 0 auto !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
