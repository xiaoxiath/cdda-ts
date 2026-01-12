# CDDA Web UI 模块 - 运行和测试指南

## 概述

本指南介绍如何运行和测试 `packages/web` 中的 CDDA Web UI 模块。该模块是对 Cataclysm-DDA 原版 UI 的严格复刻，支持 ASCII 和 Tile 两种显示模式。

## 目录结构

```
packages/web/
├── src/
│   ├── ui/                    # UI Widget 系统
│   │   ├── types.ts           # 类型定义
│   │   ├── UIConfigLoader.ts  # UI 配置加载器
│   │   ├── index.ts           # 导出模块
│   │   └── widgets/           # Widget 组件
│   │       ├── WidgetRenderer.tsx    # 渲染器入口
│   │       ├── TextWidget.tsx        # 文本 Widget
│   │       ├── NumberWidget.tsx      # 数字 Widget
│   │       ├── GraphWidget.tsx       # 图形 Widget
│   │       ├── LayoutWidget.tsx      # 布局 Widget
│   │       └── ClauseWidget.tsx      # 条件 Widget
│   ├── components/            # React 组件
│   │   ├── GameCanvas.tsx     # 游戏画布
│   │   ├── GameLog.tsx        # 消息日志
│   │   ├── GameStats.tsx      # 游戏统计
│   │   └── Sidebar.tsx        # 侧边栏
│   ├── renderers/             # 渲染器
│   │   ├── GameRenderer.ts    # ASCII 渲染器
│   │   └── TileRenderer.ts    # Tile 渲染器
│   ├── hooks/                 # React Hooks
│   ├── services/              # 服务层
│   ├── utils/                 # 工具函数
│   ├── types.ts               # 类型定义
│   └── App.tsx                # 主应用
├── public/                    # 静态资源
├── index.html                 # HTML 入口
├── vite.config.ts             # Vite 配置
├── tsconfig.json              # TypeScript 配置
└── package.json               # 包配置
```

## 快速开始

### 1. 安装依赖

```bash
# 在项目根目录安装所有依赖
pnpm install
```

### 2. 构建核心包

```bash
# 构建 @cataclym-web/core
pnpm --filter @cataclym-web/core build

# 或者运行 watch 模式
pnpm --filter @cataclym-web/core build:watch
```

### 3. 启动开发服务器

```bash
# 启动 Vite 开发服务器
pnpm --filter @cataclym-web/web dev

# 服务器将在 http://localhost:3000 启动
```

### 4. 构建生产版本

```bash
# 构建生产版本
pnpm --filter @cataclym-web/web build

# 预览生产版本
pnpm --filter @cataclym-web/web preview
```

## 功能特性

### UI Widget 系统

UI Widget 系统是基于 CDDA 原版 UI 配置的完整实现：

- **Text Widget**: 显示文本内容
- **Number Widget**: 显示数字值（带颜色）
- **Graph Widget**: 显示 ASCII 艺术图形
- **Layout Widget**: 布局容器（支持行列排列）
- **Clause Widget**: 条件选择器

### 支持的 Widget 类型

| Widget 类型 | 描述 | 示例 |
|------------|------|------|
| text | 纯文本显示 | 位置名称、日期 |
| number | 数字显示（带颜色） | HP、耐力、属性值 |
| graph | ASCII 图形 | HP 条、耐力条 |
| layout | 布局容器 | 侧边栏布局 |
| clause | 条件选择 | 健康状态描述 |

### 侧边栏配置

UI 配置文件位于 `Cataclysm-DDA/data/json/ui/`：

```
data/json/ui/
├── sidebar.json                    # 默认侧边栏
├── sidebar-legacy-classic.json     # 经典布局
├── sidebar-legacy-compact.json     # 紧凑布局
├── health.json                      # 健康配置
├── hp.json                          # 生命值配置
├── stats.json                       # 属性配置
├── hunger.json                      # 饥饿配置
├── thirst.json                      # 口渴配置
└── ... (共 61 个配置文件)
```

## 渲染模式

### ASCII 模式

使用字符和颜色渲染游戏画面，类似传统 Roguelike 游戏。

```typescript
// 自动使用 ASCII 渲染器
import { GameRenderer } from './renderers'

const renderer = new GameRenderer(canvas, {
  tileSize: 16,
  fontSize: 14,
  fontFamily: '"Courier New", monospace',
})
```

### Tile 模式

使用图块集（sprites）渲染游戏画面，支持等距视角。

```typescript
// 使用 Tile 渲染器
import { TileRenderer } from './renderers'

const renderer = new TileRenderer(canvas, 32)
await renderer.loadTileset('./Cataclysm-DDA/gfx/Ultica_iso/tile_config.json')
```

## 分辨率支持

支持多种预设分辨率和全屏模式：

| 分辨率 | 描述 |
|-------|------|
| 1024x576 | 低分辨率 |
| 1200x675 | 中低分辨率 |
| 1280x720 | 默认（推荐） |
| 1366x768 | 常见笔记本分辨率 |
| 1600x900 | 高分辨率 |
| 1920x1080 | 全高清 |
| 全屏 | 自适应窗口大小 |

## 键盘控制

| 按键 | 功能 |
|-----|------|
| ↑↓←→ | 方向键移动 |
| WASD | WASD 移动 |
| Space | 等待一回合 |
| Esc | 打开菜单 |

## 配置说明

### cdda.config.json

配置 CDDA 数据路径：

```json
{
  "dataPath": "./Cataclysm-DDA/data",
  "paths": {
    "json": "./Cataclysm-DDA/data/json",
    "ui": "./Cataclysm-DDA/data/json/ui",
    "mapgen": "./Cataclysm-DDA/data/json/mapgen"
  }
}
```

### Vite 配置

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
  },
})
```

## 测试

### 单元测试

```bash
# 运行测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage
```

### 手动测试

1. 启动开发服务器
2. 打开浏览器访问 `http://localhost:3000`
3. 测试以下功能：
   - 游戏画面渲染
   - 键盘输入响应
   - 侧边栏信息显示
   - 分辨率切换
   - 显示模式切换（ASCII/Tile）

## 性能优化

### Canvas 渲染优化

- **字符缓存**: GameRenderer 使用字符图像缓存减少绘制开销
- **视口裁剪**: 只渲染可视区域内的瓦片
- **按需加载**: 图块集按需加载

### UI Widget 优化

- **React.memo**: 使用 memo 避免不必要的重渲染
- **useMemo**: 缓存计算结果
- **useCallback**: 缓存事件处理函数

## 故障排除

### 问题: UI 配置未加载

**解决方案**:
1. 检查 `cdda.config.json` 中的路径配置
2. 确保 CDDA 数据目录存在
3. 检查浏览器控制台是否有 CORS 错误

### 问题: Tile 模式显示异常

**解决方案**:
1. 确保图块集文件路径正确
2. 检查 `tile_config.json` 是否存在
3. 尝试刷新页面重新加载图块

### 问题: 构建失败

**解决方案**:
1. 清理缓存: `pnpm clean`
2. 重新安装依赖: `pnpm install`
3. 重新构建核心包: `pnpm --filter @cataclym-web/core build`

## 开发建议

### 添加新的 Widget 类型

1. 在 `src/ui/widgets/` 创建新的 Widget 组件
2. 更新 `src/ui/types.ts` 添加新的类型定义
3. 在 `WidgetRenderer.tsx` 中注册新的 Widget 类型
4. 添加对应的样式到 `WidgetRenderer.css`

### 自定义侧边栏布局

1. 在 `Cataclysm-DDA/data/json/ui/` 创建新的 JSON 配置
2. 参考 `sidebar.json` 的格式
3. 在 `App.tsx` 中指定新的 `sidebarId`

## 相关资源

- [CDDA 官方文档](https://github.com/CleverRaven/Cataclysm-DDA)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/)
