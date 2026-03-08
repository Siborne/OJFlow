<template>
  <div class="service-page">
    <div class="app-bar">
      <h2>功能列表</h2>
    </div>

    <div class="content">
      <n-grid :x-gap="12" :y-gap="12" :cols="2">
        <n-grid-item v-for="item in services" :key="item.title">
          <n-card hoverable class="service-card" @click="router.push(item.path)">
            <div class="service-content">
              <img :src="item.image" class="service-image" />
              <span class="service-title">{{ item.title }}</span>
            </div>
          </n-card>
        </n-grid-item>
      </n-grid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { NCard, NGrid, NGridItem } from 'naive-ui';

const router = useRouter();

const services = [
  {
    title: '积分排行',
    path: '/rating',
    image: new URL('../assets/images/rating.png', import.meta.url).href
  },
  {
    title: '解题数量',
    path: '/solved_num',
    image: new URL('../assets/images/solvednum.jpg', import.meta.url).href
  },
  {
    title: 'CCPC 获奖',
    path: '/ccpc',
    image: new URL('../assets/images/ccpc.jpg', import.meta.url).href
  },
  {
    title: 'OIER 排名',
    path: '/oier',
    image: new URL('../assets/images/oier.jpg', import.meta.url).href
  },
  {
    title: 'CF 年度报告',
    path: '/cf_report',
    image: new URL('../assets/images/report.png', import.meta.url).href
  }
];
</script>

<style scoped>
.service-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: white;
}

.app-bar {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 64px;
  background-color: white;
  border-bottom: 1px solid #eee;
}

.app-bar h2 {
  margin: 0;
  font-size: 20px;
}

.content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.service-card {
  cursor: pointer;
  text-align: center;
}

.service-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.service-image {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 8px;
}

.service-title {
  font-size: 16px;
  font-weight: bold;
}
</style>
