import { createRouter, createWebHashHistory } from 'vue-router';
import NavigationPage from '../views/NavigationPage.vue';

const routes = [
  {
    path: '/',
    component: NavigationPage,
    children: [
      { path: '', redirect: '/contest' },
      { path: 'contest', component: () => import('../views/Contest.vue') },
      { path: 'star', component: () => import('../views/Favorite.vue') },
      { path: 'service', component: () => import('../views/Feature.vue') },
      { path: 'setting', component: () => import('../views/Settings.vue') },
      { path: 'rating', component: () => import('../views/RatingPage.vue') },
      { path: 'solved_num', component: () => import('../views/SolvedNumPage.vue') },
    ],
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
