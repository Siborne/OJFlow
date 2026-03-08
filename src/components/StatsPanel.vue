<template>
  <div class="stats-panel" :class="{ 'mobile-mode': isMobile }">
    <div class="panel-header">
      <span class="title">数据统计</span>
      <div class="controls">
        <n-button quaternary circle size="small" @click="toggleChartType">
          <template #icon>
            <n-icon v-if="chartType === 'pie'"><bar-chart-outlined /></n-icon>
            <n-icon v-else><pie-chart-outlined /></n-icon>
          </template>
        </n-button>
        <n-button quaternary circle size="small" @click="$emit('close')">
          <template #icon>
            <n-icon><close-outlined /></n-icon>
          </template>
        </n-button>
      </div>
    </div>
    <div class="panel-content">
      <div v-show="chartType === 'pie'" ref="pieChartRef" class="chart-container"></div>
      <div v-show="chartType === 'bar'" ref="barChartRef" class="chart-container"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { NButton, NIcon } from 'naive-ui';
import { BarChartOutlined, PieChartOutlined, CloseOutlined } from '@vicons/material';
import * as echarts from 'echarts';

const props = defineProps<{
  visible: boolean;
  data: { platform: string; count: number }[];
}>();

const emit = defineEmits(['close']);

const chartType = ref<'pie' | 'bar'>('pie');
const pieChartRef = ref<HTMLElement | null>(null);
const barChartRef = ref<HTMLElement | null>(null);
const isMobile = ref(false);

let pieChart: echarts.ECharts | null = null;
let barChart: echarts.ECharts | null = null;

const checkMobile = () => {
  isMobile.value = window.innerWidth < 992;
};

const initCharts = () => {
  if (pieChartRef.value && !pieChart) {
    pieChart = echarts.init(pieChartRef.value);
  }
  if (barChartRef.value && !barChart) {
    barChart = echarts.init(barChartRef.value);
  }
  updateCharts();
};

const updateCharts = () => {
  if (!props.data || props.data.length === 0) return;

  const pieOption = {
    color: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96'],
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    series: [
      {
        name: '平台占比',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        data: props.data.map(item => ({ value: item.count, name: item.platform }))
      }
    ]
  };

  const barOption = {
    color: ['#1890ff'],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: props.data.map(item => item.platform),
      axisTick: {
        alignWithLabel: true
      },
      axisLabel: {
        interval: 0,
        rotate: 30
      }
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '提交次数',
        type: 'bar',
        barWidth: '60%',
        data: props.data.map(item => item.count),
        itemStyle: {
          borderRadius: [5, 5, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#1890ff' },
            { offset: 1, color: '#69c0ff' }
          ])
        }
      }
    ]
  };

  pieChart?.setOption(pieOption);
  barChart?.setOption(barOption);
};

const toggleChartType = () => {
  chartType.value = chartType.value === 'pie' ? 'bar' : 'pie';
  nextTick(() => {
    pieChart?.resize();
    barChart?.resize();
  });
};

const handleResize = () => {
  checkMobile();
  pieChart?.resize();
  barChart?.resize();
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', handleResize);
  // Delay init to ensure DOM is ready and visible if needed
  nextTick(() => {
    initCharts();
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  pieChart?.dispose();
  barChart?.dispose();
});

watch(() => props.data, () => {
  updateCharts();
}, { deep: true });

watch(() => props.visible, (val) => {
  if (val) {
    nextTick(() => {
      pieChart?.resize();
      barChart?.resize();
    });
  }
});
</script>

<style scoped>
.stats-panel {
  position: absolute;
  top: 70px; /* Below app bar */
  right: 16px;
  width: 320px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 16px;
  z-index: 1000;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
}

.stats-panel.mobile-mode {
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  position: relative; /* Shift to flow layout in mobile */
  margin-bottom: 16px;
  box-shadow: none;
  border-radius: 0;
  border-bottom: 1px solid #eee;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.controls {
  display: flex;
  gap: 8px;
}

.panel-content {
  height: 240px;
  position: relative;
}

.chart-container {
  width: 100%;
  height: 100%;
}
</style>
