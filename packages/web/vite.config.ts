import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // 添加条件导出解析
    conditions: ['import', 'types'],
    // 确保 mainFields 包含正确的字段
    mainFields: ['module', 'main'],
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['@cataclym-web/core'],
    // 排除不需要预构建的包
    exclude: [],
  },
})
