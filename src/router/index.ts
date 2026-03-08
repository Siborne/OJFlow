import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router';
import NavigationPage from '../views/NavigationPage.vue';
import RecentContestPage from '../views/RecentContestPage.vue';
import RatingPage from '../views/RatingPage.vue';
import SolvedNumPage from '../views/SolvedNumPage.vue';
import FavoritesPage from '../views/FavoritesPage.vue';
import SettingPage from '../views/SettingPage.vue';
import ServicePage from '../views/ServicePage.vue';

const routes = [
  { path: '/', component: NavigationPage },
  { path: '/contest', component: RecentContestPage },
  { path: '/rating', component: RatingPage },
  { path: '/solved_num', component: SolvedNumPage },
  { path: '/star', component: FavoritesPage },
  { path: '/setting', component: SettingPage },
  { path: '/service', component: ServicePage },
  // ... other routes
];

const router = createRouter({
  history: createWebHashHistory(), // Electron works better with hash history in production
  routes,
});

export default router;
