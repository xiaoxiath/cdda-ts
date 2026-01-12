import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { nodePolyfillPlugin } from './vite-plugin-node-polyfill'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), nodePolyfillPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 为 CDDA 数据目录提供别名
      '/Cataclysm-DDA': path.resolve(__dirname, '../Cataclysm-DDA'),
    },
    // 添加条件导出解析
    conditions: ['import', 'types'],
    // 确保 mainFields 包含正确的字段
    mainFields: ['module', 'main'],
  },
  server: {
    port: 3000,
    open: true,
    // 配置静态资源服务
    fs: {
      // 允许访问项目根目录
      allow: ['..', '.'],
    },
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
  // 开发服务器配置
  publicDir: 'public',
  assetsInclude: ['**/*.json'],
})
