import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/theme.css';
import './styles/a11y.css';
import './styles/animations.css';
import './styles/mobile.css';
import { migrateFromLocalStorage } from './utils/migrate-storage';
import { useUiStore } from './stores/ui';
import { useContestStore } from './stores/contest';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.mount('#app');

// Post-mount initialization: migrate data and initialize stores
(async () => {
  await migrateFromLocalStorage();
  const uiStore = useUiStore();
  const contestStore = useContestStore();
  await uiStore.init();
  await contestStore.init();
})();
