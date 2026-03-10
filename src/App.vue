<template>
  <n-config-provider>
    <div v-html="settingsSprite" style="position: absolute; width: 0; height: 0; overflow: hidden" aria-hidden="true" />
    <n-message-provider>
      <n-dialog-provider>
        <router-view />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider } from 'naive-ui';
import { useUiStore } from './stores/ui';
import settingsSprite from './assets/icons/settings-sprite.svg?raw';

const uiStore = useUiStore();
uiStore.applyToDom();
</script>

<style>
</style>
