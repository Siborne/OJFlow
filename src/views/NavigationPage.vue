<template>
  <n-layout style="height: 100vh">
    <n-layout has-sider v-if="isWide">
      <n-layout-sider
        bordered
        collapse-mode="width"
        :collapsed="true"
        :collapsed-width="64"
        :width="100"
        :native-scrollbar="false"
        style="padding-top: 10px; position: fixed; left: 0; top: 0; height: 100vh; z-index: 2000;"
      >
        <n-menu
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

    <n-layout v-else style="height: 100vh; display: flex; flex-direction: column;">
      <n-layout-content style="flex: 1; overflow: hidden;">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </n-layout-content>
      <n-layout-footer bordered>
        <div class="bottom-nav">
          <div 
            v-for="item in menuOptions" 
            :key="item.key"
            class="nav-item"
            :class="{ active: activeKey === item.key }"
            @click="handleMenuUpdate(item.key)"
          >
            <n-icon :size="24" :component="item.icon" />
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
  const ratio = window.innerWidth / window.innerHeight;
  isWide.value = ratio > 1.1;
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
.bottom-nav {
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
  background: white;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  color: grey;
}

.nav-item.active {
  color: #18a058; /* Naive UI primary color */
}

.nav-item span {
  font-size: 12px;
  margin-top: 4px;
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
