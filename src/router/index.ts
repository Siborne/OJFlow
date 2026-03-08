import { createRouter, createWebHashHistory } from 'vue-router';
import NavigationPage from '../views/NavigationPage.vue';
import Contest from '../views/Contest.vue';
import Favorite from '../views/Favorite.vue';
import Feature from '../views/Feature.vue';
import Settings from '../views/Settings.vue';
import RatingPage from '../views/RatingPage.vue';
import SolvedNumPage from '../views/SolvedNumPage.vue';

// Existing pages if needed
import RecentContestPage from '../views/RecentContestPage.vue';
import FavoritesPage from '../views/FavoritesPage.vue';
import SettingPage from '../views/SettingPage.vue';
import ServicePage from '../views/ServicePage.vue';

const routes = [
  { 
    path: '/', 
    component: NavigationPage,
    children: [
      { path: '', redirect: '/contest' },
      { path: 'contest', component: Contest },
      { path: 'star', component: Favorite },
      { path: 'service', component: Feature },
      { path: 'setting', component: Settings },
      // Keep old routes for compatibility if needed, but mapped to new structure
      { path: 'rating', component: RatingPage },
      { path: 'solved_num', component: SolvedNumPage },
    ]
  },
  // Redirect old root paths to new child paths if necessary, 
  // but since NavigationPage is the parent, we can just map them as children.
  // However, the menu uses '/contest', '/star' etc. 
  // If we nest them under '/', the path becomes '/contest' if we set parent path='/'.
  // Let's verify Vue Router behavior. 
  // If parent path is '/', child path 'contest' becomes '/contest'. Correct.
  
  // Standalone pages (if any)
  { path: '/question-volume', redirect: '/solved_num' },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
