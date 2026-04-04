import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './', // 关键：确保资源路径是相对的，否则打包后白屏
  server: {
    port: 5173,
    strictPort: true, // 如果端口被占用直接报错，不要自动换端口
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules') && id.includes('echarts')) {
            return 'echarts-vendor';
          }
          if (id.includes('node_modules') && id.includes('zrender')) {
            return 'echarts-vendor';
          }
        },
      },
    },
  }
})