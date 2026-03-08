<template>
  <div class="feature-page">
    <div class="app-bar">
      <h2>功能列表</h2>
    </div>

    <div class="content">
      <n-grid :x-gap="12" :y-gap="12" :cols="1">
        <!-- Solved Num Module -->
        <n-grid-item>
          <n-card title="解题数量" class="feature-card" @click="router.push('/solved_num')">
            <template #header-extra>
              <n-icon size="20"><arrow-forward-outlined /></n-icon>
            </template>
            <div class="feature-content">
              <div class="stat-main">
                <span class="stat-label">总解题数</span>
                <span class="stat-value">{{ totalSolved }}</span>
              </div>
              <div class="stat-chart">
                <!-- Mock Pie Chart using Progress -->
                <div class="pie-chart">
                  <n-progress type="circle" :percentage="75" status="success" :stroke-width="10">
                    <span style="font-size: 12px">Easy</span>
                  </n-progress>
                </div>
                <div class="trend-chart">
                  <span class="chart-label">近7日趋势</span>
                  <div class="mock-line-chart"></div>
                </div>
              </div>
            </div>
          </n-card>
        </n-grid-item>

        <!-- Rating Module -->
        <n-grid-item>
          <n-card title="排位分" class="feature-card" @click="router.push('/rating')">
            <template #header-extra>
              <n-icon size="20"><arrow-forward-outlined /></n-icon>
            </template>
            <div class="feature-content">
              <div class="stat-main">
                <span class="stat-label">当前Rating</span>
                <span class="stat-value">{{ currentRating }}</span>
                <span class="stat-sub">最高: {{ maxRating }}</span>
              </div>
              <div class="stat-chart">
                <div class="trend-chart full-width">
                  <span class="chart-label">近30天变化</span>
                  <div class="mock-wave-chart"></div>
                </div>
              </div>
            </div>
          </n-card>
        </n-grid-item>
        
        <!-- Placeholders -->
        <n-grid-item v-for="i in 2" :key="i">
           <n-card class="feature-card placeholder">
             <div class="placeholder-content">敬请期待</div>
           </n-card>
        </n-grid-item>
      </n-grid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NCard, NGrid, NGridItem, NIcon, NProgress } from 'naive-ui';
import { ArrowForwardOutlined } from '@vicons/material';

const router = useRouter();
const totalSolved = ref(1284); // Mock data
const currentRating = ref(1850);
const maxRating = ref(1920);

</script>

<style scoped>
.feature-page {
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

.feature-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.feature-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-main {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #18a058;
}

.stat-label {
  font-size: 14px;
  color: grey;
}

.stat-sub {
  font-size: 12px;
  color: grey;
  margin-top: 4px;
}

.stat-chart {
  display: flex;
  gap: 16px;
  align-items: center;
}

.mock-line-chart {
  width: 100px;
  height: 40px;
  background: linear-gradient(90deg, #e0e0e0 0%, #18a058 100%);
  mask: url('data:image/svg+xml;utf8,<svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg"><polyline points="0,40 20,30 40,35 60,10 80,20 100,5" fill="none" stroke="black" stroke-width="2"/></svg>');
  -webkit-mask: url('data:image/svg+xml;utf8,<svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg"><polyline points="0,40 20,30 40,35 60,10 80,20 100,5" fill="none" stroke="black" stroke-width="2"/></svg>');
  background-color: #18a058;
}

.mock-wave-chart {
  width: 200px;
  height: 50px;
  background-color: #2080f0;
  opacity: 0.2;
  border-radius: 4px;
}

.placeholder {
  opacity: 0.5;
  border: 1px dashed #ccc;
}

.placeholder-content {
  text-align: center;
  color: grey;
  padding: 20px;
}
</style>
